from django.shortcuts import get_object_or_404
from turmas.models import Turma
from datetime import date
from usuarios.models import Usuario, PreCadastro
from financeiro.models import Mensalidade
from .models import Presenca, ObservacaoAula, MAX_OBSERVACAO_AULA_CHARS
from .serializers import UsuarioSerializer, PreCadastroSerializer, PresencaSerializer, TurmaSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.mail import send_mail
from django.db.models import Count, Sum, Q, Max
from django.utils import timezone
from datetime import datetime, timedelta
import logging
from django.utils.dateparse import parse_date

logger = logging.getLogger(__name__)

# Alinhado ao painel do aluno / turmas (dia da semana da data vs nomes em DiaSemana)
_WEEKDAY_NOME_PT = (
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
)


def _serialize_presenca_sintetica(aluno: Usuario, turma: Turma, d: date) -> dict:
    """Linha sem registro em Presenca (aluno esperado na aula e sem linha no banco)."""
    return {
        "id": None,
        "aluno_id": aluno.id,
        "aluno_nome": aluno.get_full_name() or aluno.username,
        "turma_id": turma.id,
        "turma_nome": str(turma),
        "data": d.isoformat(),
        "checkin_realizado": False,
        "presenca_confirmada": False,
        "ausencia_registrada": False,
        "sem_registro": True,
    }


def _nome_completo_precadastro(pc):
    n = f"{(pc.first_name or '').strip()} {(pc.last_name or '').strip()}".strip()
    return n or "—"


def _nome_completo_usuario(u):
    n = f"{(u.first_name or '').strip()} {(u.last_name or '').strip()}".strip()
    return n or "—"


class VerificarCheckinAlunosAPIView(APIView):
    """API para verificar quais alunos fizeram check-in em uma turma. Inclui pré-cadastros com aula experimental no dia.

    ``ausencia_registrada``: falta registrada pelo professor (desmarcação de presença).

    ``pode_confirmar_presenca``: sempre True para o professor alternar presente/falta no dia (check-in
    continua sendo feito pelo aluno no app quando aplicável).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)
        hoje = date.today()

        # Busca todos os alunos da turma (distinct evita duplicidades por JOIN/M2M)
        alunos = (
            Usuario.objects.filter(tipo="aluno", ativo=True, turmas_aluno=turma)
            .distinct()
            .order_by("first_name", "last_name", "id")
        )

        status_alunos = []
        emails_alunos = set()
        cpfs_alunos = set()
        for aluno in alunos:
            presenca = Presenca.objects.filter(
                usuario=aluno,
                data=hoje,
                turma=turma
            ).first()
            ja_confirmada = presenca.presenca_confirmada if presenca else False
            ausencia = bool(presenca.ausencia_registrada) if presenca else False
            email_norm = (aluno.email or "").strip().lower()
            cpf_norm = ''.join(c for c in str(aluno.cpf or '') if c.isdigit())
            if email_norm:
                emails_alunos.add(email_norm)
            if cpf_norm:
                cpfs_alunos.add(cpf_norm)
            status_alunos.append({
                "id": str(aluno.id),
                "nome": f"{aluno.first_name} {aluno.last_name}",
                "username": aluno.username,
                "tipo": "aluno",
                "checkin_realizado": presenca.checkin_realizado if presenca else False,
                "presenca_confirmada": ja_confirmada,
                "ausencia_registrada": ausencia,
                # Professor pode alternar presente / falta no mesmo dia
                "pode_confirmar_presenca": True,
            })

        # Pré-cadastros com aula experimental nesta turma e data
        precadastros = PreCadastro.objects.filter(
            turma=turma,
            data_aula_experimental=hoje,
            origem='aula_experimental',
            status='pendente'
        ).order_by("first_name", "last_name", "id")
        precadastros_adicionados = set()
        for pc in precadastros:
            email_pc = (pc.email or "").strip().lower()
            cpf_pc = ''.join(c for c in str(pc.cpf or '') if c.isdigit())

            # Evita duplicação visual da mesma pessoa (já está como aluno regular da turma)
            if (email_pc and email_pc in emails_alunos) or (cpf_pc and cpf_pc in cpfs_alunos):
                continue

            # Defesa extra contra duplicidade do próprio pré-cadastro no retorno
            key_pc = (email_pc, cpf_pc, (pc.first_name or "").strip().lower(), (pc.last_name or "").strip().lower())
            if key_pc in precadastros_adicionados:
                continue
            precadastros_adicionados.add(key_pc)

            ja_exp = bool(pc.compareceu_aula_experimental)
            status_alunos.append({
                "id": f"precadastro_{pc.id}",
                "nome": f"{pc.first_name} {pc.last_name or ''}".strip(),
                "username": pc.email,
                "tipo": "aula_experimental",
                "checkin_realizado": False,
                "presenca_confirmada": ja_exp,
                "ausencia_registrada": False,
                "pode_confirmar_presenca": True,
            })

        return Response({
            "turma": turma.__str__(),
            "data": hoje.isoformat(),
            "alunos": status_alunos
        }, status=status.HTTP_200_OK)


class RegistrarPresencaAPIView(APIView):
    """API para registrar presença dos alunos e comparecimento de pré-cadastros (aula experimental) em uma turma."""
    permission_classes = [IsAuthenticated]

    def post(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)
        hoje = date.today()

        alunos_presentes = request.data.get('presenca', [])
        precadastros_presentes = request.data.get('precadastros', [])
        if not isinstance(alunos_presentes, (list, tuple)):
            alunos_presentes = list(alunos_presentes) if alunos_presentes else []
        if not isinstance(precadastros_presentes, (list, tuple)):
            precadastros_presentes = list(precadastros_presentes) if precadastros_presentes else []

        usar_faltas = 'faltas' in request.data
        faltas_raw = request.data.get('faltas', [])
        if not isinstance(faltas_raw, (list, tuple)):
            faltas_raw = list(faltas_raw) if faltas_raw else []

        alunos_ids = {str(x) for x in alunos_presentes if not str(x).startswith('precadastro_')}
        precadastro_ids = []
        for x in alunos_presentes:
            s = str(x)
            if s.startswith('precadastro_'):
                try:
                    precadastro_ids.append(int(s.replace('precadastro_', '')))
                except ValueError:
                    pass
        precadastro_ids.extend(int(x) for x in precadastros_presentes if str(x).isdigit())

        falta_ids = {str(x) for x in faltas_raw if not str(x).startswith('precadastro_')}
        precadastro_falta_ids = []
        for x in faltas_raw:
            s = str(x)
            if s.startswith('precadastro_'):
                try:
                    precadastro_falta_ids.append(int(s.replace('precadastro_', '')))
                except ValueError:
                    pass

        inter = alunos_ids & falta_ids
        if inter:
            return Response(
                {"error": "O mesmo aluno não pode estar em presença e em falta ao mesmo tempo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        inter_pc = set(precadastro_ids) & set(precadastro_falta_ids)
        if inter_pc:
            return Response(
                {"error": "O mesmo pré-cadastro não pode estar em presença e em falta ao mesmo tempo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        presencas_registradas = 0
        alunos = Usuario.objects.filter(tipo="aluno", ativo=True, turmas_aluno=turma)

        for aluno in alunos:
            sid = str(aluno.id)
            if sid in alunos_ids:
                presenca = Presenca.objects.filter(
                    usuario=aluno,
                    data=hoje,
                    turma=turma
                ).first()
                if presenca:
                    presenca.presenca_confirmada = True
                    presenca.ausencia_registrada = False
                    presenca.save()
                else:
                    Presenca.objects.create(
                        usuario=aluno,
                        turma=turma,
                        data=hoje,
                        checkin_realizado=False,
                        presenca_confirmada=True,
                        ausencia_registrada=False,
                    )
                presencas_registradas += 1
            elif usar_faltas and sid in falta_ids:
                presenca = Presenca.objects.filter(
                    usuario=aluno,
                    data=hoje,
                    turma=turma
                ).first()
                if presenca:
                    presenca.presenca_confirmada = False
                    presenca.ausencia_registrada = True
                    presenca.save()
                else:
                    Presenca.objects.create(
                        usuario=aluno,
                        turma=turma,
                        data=hoje,
                        checkin_realizado=False,
                        presenca_confirmada=False,
                        ausencia_registrada=True,
                    )
                presencas_registradas += 1

        # Marcar comparecimento de pré-cadastros (aula experimental)
        for pc_id in set(precadastro_ids):
            pc = PreCadastro.objects.filter(
                id=pc_id,
                turma=turma,
                data_aula_experimental=hoje,
                origem='aula_experimental',
                status='pendente'
            ).first()
            if pc:
                pc.compareceu_aula_experimental = True
                pc.save()
                presencas_registradas += 1

        if usar_faltas:
            for pc_id in set(precadastro_falta_ids):
                pc = PreCadastro.objects.filter(
                    id=pc_id,
                    turma=turma,
                    data_aula_experimental=hoje,
                    origem='aula_experimental',
                    status='pendente'
                ).first()
                if pc:
                    pc.compareceu_aula_experimental = False
                    pc.save()
                    presencas_registradas += 1

        return Response({
            "message": f"Presenças registradas com sucesso! ({presencas_registradas} registro(s))"
        }, status=status.HTTP_200_OK)


def _serialize_presenca(presenca: Presenca):
    return {
        "id": presenca.id,
        "aluno_id": presenca.usuario.id,
        "aluno_nome": presenca.usuario.get_full_name() or presenca.usuario.username,
        "turma_id": presenca.turma.id,
        "turma_nome": str(presenca.turma),
        "data": presenca.data.isoformat(),
        "checkin_realizado": presenca.checkin_realizado,
        "presenca_confirmada": presenca.presenca_confirmada,
        "ausencia_registrada": presenca.ausencia_registrada,
        "sem_registro": False,
    }


class RelatorioPresencaAPIView(APIView):
    """API para relatório de presença (gerente)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

        data_inicio = request.query_params.get("data_inicio")
        data_fim = request.query_params.get("data_fim")
        turma_id = request.query_params.get("turma_id")
        aluno_id = request.query_params.get("aluno_id")
        aluno_nome = request.query_params.get("aluno_nome")

        parsed_inicio = None
        parsed_fim = None

        qs = Presenca.objects.select_related("usuario", "turma").order_by("-data", "usuario__first_name")

        if data_inicio:
            parsed_inicio = parse_date(data_inicio)
            if not parsed_inicio:
                return Response({"error": "Data inicial inválida."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(data__gte=parsed_inicio)
        if data_fim:
            parsed_fim = parse_date(data_fim)
            if not parsed_fim:
                return Response({"error": "Data final inválida."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(data__lte=parsed_fim)
        if turma_id:
            qs = qs.filter(turma_id=turma_id)
        if aluno_id:
            qs = qs.filter(usuario_id=aluno_id)
        if aluno_nome:
            qs = qs.filter(
                Q(usuario__first_name__icontains=aluno_nome) |
                Q(usuario__last_name__icontains=aluno_nome) |
                Q(usuario__username__icontains=aluno_nome)
            )

        # Uma linha por (aluno, turma, data): remove duplicatas legadas mantendo o registro de maior id
        max_ids = (
            qs.values("usuario_id", "turma_id", "data")
            .annotate(max_id=Max("id"))
            .values_list("max_id", flat=True)
        )
        qs = (
            Presenca.objects.filter(id__in=max_ids)
            .select_related("usuario", "turma")
            .order_by("-data", "usuario__first_name")
        )

        total_checkins = qs.filter(checkin_realizado=True).count()
        total_confirmadas = qs.filter(presenca_confirmada=True).count()
        total_faltas = qs.filter(ausencia_registrada=True).count()

        presencas_list = [_serialize_presenca(item) for item in qs]

        incluir_faltantes = request.query_params.get("incluir_faltantes", "true").lower() in (
            "1",
            "true",
            "yes",
            "",
        )

        if (
            incluir_faltantes
            and turma_id
            and parsed_inicio
            and parsed_fim
            and parsed_inicio <= parsed_fim
        ):
            try:
                turma = Turma.objects.prefetch_related("dias_semana", "alunos").get(pk=int(turma_id))
            except (ValueError, Turma.DoesNotExist):
                turma = None
            if turma:
                existentes = {
                    (p["aluno_id"], p["turma_id"], (p["data"] or "")[:10])
                    for p in presencas_list
                }
                dia_nomes = {d.nome for d in turma.dias_semana.all()}
                cur = parsed_inicio
                while cur <= parsed_fim:
                    nome_dia = _WEEKDAY_NOME_PT[cur.weekday()]
                    if nome_dia in dia_nomes:
                        alunos_qs = turma.alunos.filter(tipo="aluno", ativo=True)
                        if aluno_id:
                            alunos_qs = alunos_qs.filter(id=int(aluno_id))
                        if aluno_nome:
                            alunos_qs = alunos_qs.filter(
                                Q(first_name__icontains=aluno_nome)
                                | Q(last_name__icontains=aluno_nome)
                                | Q(username__icontains=aluno_nome)
                            )
                        for aluno in alunos_qs.distinct():
                            k = (aluno.id, turma.id, cur.isoformat())
                            if k not in existentes:
                                presencas_list.append(_serialize_presenca_sintetica(aluno, turma, cur))
                                existentes.add(k)
                    cur += timedelta(days=1)

        # Mesma ordem do queryset: data desc, nome asc (sort estável)
        presencas_list.sort(key=lambda p: (p.get("aluno_nome") or "").lower())
        presencas_list.sort(key=lambda p: (p.get("data") or "")[:10], reverse=True)

        total_sem_registro = sum(1 for p in presencas_list if p.get("sem_registro"))
        total_registros = len(presencas_list)

        return Response({
            "total_registros": total_registros,
            "total_checkins": total_checkins,
            "total_confirmadas": total_confirmadas,
            "total_faltas": total_faltas,
            "total_sem_registro": total_sem_registro,
            "presencas": presencas_list,
        }, status=status.HTTP_200_OK)


class CorrigirPresencaAPIView(APIView):
    """API para correção de presença (gerente)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, presenca_id):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

        presenca = get_object_or_404(Presenca, id=presenca_id)
        checkin_realizado = request.data.get("checkin_realizado", None)
        presenca_confirmada = request.data.get("presenca_confirmada", None)
        ausencia_registrada = request.data.get("ausencia_registrada", None)

        if (
            checkin_realizado is None
            and presenca_confirmada is None
            and ausencia_registrada is None
        ):
            return Response({"error": "Nenhum campo para atualizar."}, status=status.HTTP_400_BAD_REQUEST)

        if checkin_realizado is not None:
            presenca.checkin_realizado = bool(checkin_realizado)
            if not presenca.checkin_realizado:
                presenca.presenca_confirmada = False

        if ausencia_registrada is not None:
            if bool(ausencia_registrada):
                presenca.ausencia_registrada = True
                presenca.presenca_confirmada = False
            else:
                presenca.ausencia_registrada = False

        if presenca_confirmada is not None:
            confirmar = bool(presenca_confirmada)
            if confirmar and not presenca.checkin_realizado:
                return Response(
                    {"error": "Não é possível confirmar presença sem check-in."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            presenca.presenca_confirmada = confirmar
            if confirmar:
                presenca.ausencia_registrada = False

        presenca.save()
        return Response(_serialize_presenca(presenca), status=status.HTTP_200_OK)


class PainelProfessorAPIView(APIView):
    """API para exibir o painel do professor."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        professor = get_object_or_404(Usuario, id=request.user.id, tipo="professor")
        serializer = UsuarioSerializer(professor)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AtualizarDadosProfessorAPIView(APIView):
    """API para atualizar os dados do professor."""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        professor = get_object_or_404(Usuario, id=request.user.id, tipo="professor")
        serializer = UsuarioSerializer(professor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AtualizarDadosGerenteAPIView(APIView):
    """API para atualizar os dados do gerente."""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        gerente = get_object_or_404(Usuario, id=request.user.id, tipo="gerente")
        serializer = UsuarioSerializer(gerente, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PainelGerenteAPIView(APIView):
    """API para exibir o painel do gerente."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            logger.info(f"Requisição de estatísticas recebida do usuário: {request.user.username}")
            
            if request.user.tipo != "gerente":
                logger.warning(f"Tentativa de acesso não autorizado por: {request.user.username}")
                return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

            # Estatísticas básicas
            hoje = timezone.now().date()
            ano = hoje.year
            mes = hoje.month
            limite_30_dias = hoje - timedelta(days=30)

            # Alunos: partição coerente com a Gestão de Usuários (badge Ativo/Inativo = is_active)
            # e com o campo de negócio `ativo`. Conta como "ativo" só quem está ativo no CT
            # e com conta liberada (login); pendente de ativação de e-mail (ativo=True, is_active=False)
            # entra como inativo, alinhado à listagem.
            qs_alunos = Usuario.objects.filter(tipo="aluno")
            alunos_ativos = qs_alunos.filter(ativo=True, is_active=True).count()
            alunos_inativos = qs_alunos.exclude(ativo=True, is_active=True).count()

            professores = Usuario.objects.filter(tipo="professor", ativo=True).count()

            # Pendentes: não pagas, vencem no mês atual e ainda não passou o vencimento
            mensalidades_pendentes = Mensalidade.objects.filter(
                ~Q(status="pago"),
                data_vencimento__year=ano,
                data_vencimento__month=mes,
                data_vencimento__gte=hoje,
            ).count()

            # Atrasadas: não pagas; (1) vencimento no mês corrente e já passou o dia do vencimento
            # (2) vencimento há mais de 30 dias (acúmulo de atraso)
            mensalidades_atrasadas_mes_corrente = Mensalidade.objects.filter(
                ~Q(status="pago"),
                data_vencimento__year=ano,
                data_vencimento__month=mes,
                data_vencimento__lt=hoje,
            ).count()
            mensalidades_atrasadas_mais_30_dias = Mensalidade.objects.filter(
                ~Q(status="pago"),
                data_vencimento__lt=limite_30_dias,
            ).count()

            # Mensalidades pagas no mês corrente (data do pagamento)
            qs_pagas_mes = Mensalidade.objects.filter(status="pago")
            mensalidades_pagas = qs_pagas_mes.filter(
                data_pagamento__year=ano,
                data_pagamento__month=mes
            ).count()
            # Fallback: se data_pagamento for null, considerar data_vencimento no mês
            mensalidades_pagas += qs_pagas_mes.filter(
                data_pagamento__isnull=True,
                data_vencimento__year=ano,
                data_vencimento__month=mes
            ).count()

            # Pré-cadastros pendentes
            precadastros = PreCadastro.objects.filter(status='pendente').count()

            # Aulas experimentais (só status pendente, alinhado à listagem de pré-cadastros)
            aulas_experimentais_futuras = PreCadastro.objects.filter(
                origem='aula_experimental',
                status='pendente',
                data_aula_experimental__gt=hoje
            ).count()
            aulas_experimentais_ocorridas = PreCadastro.objects.filter(
                origem='aula_experimental',
                status='pendente',
                data_aula_experimental__isnull=False,
                data_aula_experimental__lte=hoje
            ).count()

            qs_aulas_futuras = PreCadastro.objects.filter(
                origem="aula_experimental",
                status="pendente",
                data_aula_experimental__gt=hoje,
            ).order_by("data_aula_experimental", "first_name", "last_name", "id")
            aulas_experimentais_futuras_nomes = [
                _nome_completo_precadastro(pc) for pc in qs_aulas_futuras
            ]

            qs_aulas_ocorridas = PreCadastro.objects.filter(
                origem="aula_experimental",
                status="pendente",
                data_aula_experimental__isnull=False,
                data_aula_experimental__lte=hoje,
            ).order_by("-data_aula_experimental", "first_name", "last_name", "id")
            aulas_experimentais_ocorridas_nomes = [
                _nome_completo_precadastro(pc) for pc in qs_aulas_ocorridas
            ]

            qs_atraso_mes = (
                Mensalidade.objects.filter(
                    ~Q(status="pago"),
                    data_vencimento__year=ano,
                    data_vencimento__month=mes,
                    data_vencimento__lt=hoje,
                )
                .select_related("aluno")
                .order_by("data_vencimento", "aluno__first_name", "aluno__last_name", "id")
            )
            mensalidades_atrasadas_mes_corrente_nomes = [
                _nome_completo_usuario(m.aluno) for m in qs_atraso_mes
            ]

            qs_atraso_30 = (
                Mensalidade.objects.filter(
                    ~Q(status="pago"),
                    data_vencimento__lt=limite_30_dias,
                )
                .select_related("aluno")
                .order_by("data_vencimento", "aluno__first_name", "aluno__last_name", "id")
            )
            mensalidades_atrasadas_mais_30_dias_nomes = [
                _nome_completo_usuario(m.aluno) for m in qs_atraso_30
            ]

            turmas = Turma.objects.all()

            # Atividades recentes
            atividades = []

            # Últimos alunos cadastrados
            ultimos_alunos = Usuario.objects.filter(
                tipo="aluno",
                date_joined__gte=timezone.now() - timedelta(days=7)
            ).order_by('-date_joined')[:5]

            for aluno in ultimos_alunos:
                atividades.append({
                    'id': f'aluno_{aluno.id}',
                    'type': 'aluno',
                    'description': f'Novo aluno cadastrado - {aluno.first_name}',
                    'data': aluno.date_joined.isoformat()
                })

            # Pré-cadastros criados nos últimos 7 dias (feed alinhado ao painel)
            for pc in PreCadastro.objects.filter(
                criado_em__gte=timezone.now() - timedelta(days=7)
            ).order_by('-criado_em')[:5]:
                nome_pc = (pc.first_name or '').strip() or '—'
                atividades.append({
                    'id': f'precadastro_{pc.id}',
                    'type': 'precadastro',
                    'description': f'Pré-cadastro recebido - {nome_pc}',
                    'data': pc.criado_em.isoformat()
                })

            # Mensalidades pagas recentes: usar data_pagamento (quando o pagamento ocorreu),
            # não data_vencimento — senão pagamentos de títulos antigos não apareciam no feed.
            limite_pag = timezone.now() - timedelta(days=14)
            limite_venc = timezone.now().date() - timedelta(days=14)
            cand_mens = list(
                Mensalidade.objects.filter(status="pago")
                .filter(
                    Q(data_pagamento__gte=limite_pag)
                    | Q(data_pagamento__isnull=True, data_vencimento__gte=limite_venc)
                )
                .select_related("aluno")[:80]
            )

            def _ts_mensalidade_atividade(m):
                if m.data_pagamento:
                    return m.data_pagamento
                return timezone.make_aware(
                    datetime.combine(m.data_vencimento, datetime.min.time())
                )

            cand_mens.sort(key=_ts_mensalidade_atividade, reverse=True)
            ultimas_mensalidades = cand_mens[:5]

            for mensalidade in ultimas_mensalidades:
                nome_aluno = getattr(mensalidade.aluno, "first_name", None) or "Aluno"
                data_evt = (
                    mensalidade.data_pagamento.isoformat()
                    if mensalidade.data_pagamento
                    else mensalidade.data_vencimento.isoformat()
                )
                atividades.append({
                    'id': f'mensalidade_{mensalidade.id}',
                    'type': 'mensalidade',
                    'description': f'Mensalidade paga - {nome_aluno}',
                    'data': data_evt,
                })

            # Ordena todas as atividades por data
            atividades.sort(key=lambda x: x['data'], reverse=True)

            # Dados do gerente
            gerente = get_object_or_404(Usuario, id=request.user.id, tipo="gerente")
            gerente_data = UsuarioSerializer(gerente).data
            
            response_data = {
                'alunos_ativos': alunos_ativos,
                'alunos_inativos': alunos_inativos,
                'professores': professores,
                'mensalidades_pendentes': mensalidades_pendentes,
                'mensalidades_atrasadas_mes_corrente': mensalidades_atrasadas_mes_corrente,
                'mensalidades_atrasadas_mais_30_dias': mensalidades_atrasadas_mais_30_dias,
                'mensalidades_pagas': mensalidades_pagas,
                'precadastros': precadastros,
                'aulas_experimentais_futuras': aulas_experimentais_futuras,
                'aulas_experimentais_ocorridas': aulas_experimentais_ocorridas,
                'aulas_experimentais_futuras_nomes': aulas_experimentais_futuras_nomes,
                'aulas_experimentais_ocorridas_nomes': aulas_experimentais_ocorridas_nomes,
                'mensalidades_atrasadas_mes_corrente_nomes': mensalidades_atrasadas_mes_corrente_nomes,
                'mensalidades_atrasadas_mais_30_dias_nomes': mensalidades_atrasadas_mais_30_dias_nomes,
                'turmas': TurmaSerializer(turmas, many=True).data,
                'atividades_recentes': atividades[:5],
                # Dados do gerente
                'first_name': gerente_data.get('first_name'),
                'last_name': gerente_data.get('last_name'),
                'email': gerente_data.get('email'),
                'telefone': gerente_data.get('telefone'),
                'endereco': gerente_data.get('endereco'),
                'data_nascimento': gerente_data.get('data_nascimento'),
                'foto_perfil': gerente_data.get('foto_perfil'),
                'ativo': gerente_data.get('ativo'),
                'id': gerente_data.get('id')
            }
            
            logger.info("Dashboard do gerente gerado com sucesso")
            return Response(response_data)

        except Exception as e:
            logger.error(f"Erro ao gerar dashboard do gerente: {str(e)}", exc_info=True)
            return Response({'error': 'Erro ao carregar dashboard do gerente'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListaAlunosInativosPainelAPIView(APIView):
    """
    Lista alunos considerados 'inativos' no painel do gerente (mesma regra do contador:
    não estão ativos no CT e com conta ativa ao mesmo tempo).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.tipo != 'gerente':
            return Response({'error': 'Permissão negada.'}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            Usuario.objects.filter(tipo='aluno')
            .exclude(ativo=True, is_active=True)
            .order_by('first_name', 'last_name', 'id')
        )
        alunos = []
        for a in qs:
            partes_motivo = []
            if not a.is_active:
                partes_motivo.append('Conta não ativada')
            if not a.ativo:
                partes_motivo.append('Inativo no CT')
            alunos.append({
                'id': a.id,
                'first_name': a.first_name or '',
                'last_name': a.last_name or '',
                'ativo': bool(a.ativo),
                'is_active': bool(a.is_active),
                'motivo': ' · '.join(partes_motivo) if partes_motivo else '',
            })
        return Response({'alunos': alunos, 'total': len(alunos)}, status=status.HTTP_200_OK)


class ListarPrecadastrosAPIView(APIView):
    """API para listar os pré-cadastros pendentes (não matriculados)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Lista apenas pré-cadastros pendentes (não matriculados ou cancelados)
        precadastros = PreCadastro.objects.filter(status='pendente').order_by('-criado_em')
        serializer = PreCadastroSerializer(precadastros, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConverterPrecadastroAPIView(APIView):
    """API para converter um pré-cadastro em aluno e enviar convite de ativação."""
    permission_classes = [IsAuthenticated]

    def post(self, request, precadastro_id):
        precadastro = get_object_or_404(PreCadastro, id=precadastro_id)

        if precadastro.usuario:
            return Response({"error": "Este pré-cadastro já foi convertido em aluno!"}, status=status.HTTP_400_BAD_REQUEST)

        cpf_digits = ''.join(c for c in str(precadastro.cpf or '') if c.isdigit())
        if len(cpf_digits) != 11:
            return Response(
                {"error": "Informe um CPF válido com 11 dígitos no pré-cadastro antes de converter."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        precadastro.cpf = cpf_digits
        precadastro.save(update_fields=['cpf'])

        agora = timezone.now()
        existente = Usuario.objects.filter(tipo='aluno', cpf=cpf_digits).first()
        if existente:
            existente.matriculado_em = agora
            existente.save(update_fields=['matriculado_em'])
            precadastro.delete()
            return Response(
                {"message": "Pré-cadastro vinculado ao aluno já cadastrado (mesmo CPF)."},
                status=status.HTTP_200_OK,
            )

        # Importa as funções necessárias
        from usuarios.utils import enviar_convite_aluno
        
        # Cria usuário inativo (será ativado via link)
        usuario = Usuario.objects.create_user(
            username=cpf_digits,
            email=precadastro.email,
            password=None,  # Não define senha - usuário definirá via link
            tipo="aluno",
            first_name=precadastro.first_name,
            last_name=precadastro.last_name,
            telefone=precadastro.telefone,
            cpf=cpf_digits,
            data_nascimento=precadastro.data_nascimento,
            matriculado_em=agora,
            is_active=False  # Usuário inativo até ativar via link
        )
        usuario.set_unusable_password()  # Não define senha válida
        usuario.save()

        precadastro.delete()

        # Envia convite de ativação (NÃO envia senha por e-mail)
        if usuario.email:
            try:
                enviar_convite_aluno(usuario)
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Convite de ativação enviado para {usuario.email}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erro ao enviar convite de ativação para {usuario.email}: {e}")

        return Response({"message": "Aluno matriculado com sucesso! Um convite de ativação foi enviado para o e-mail informado."}, status=status.HTTP_201_CREATED)


class HistoricoAulasProfessorAPIView(APIView):
    """API para exibir o histórico de aulas do professor."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        professor = request.user
        turmas = Turma.objects.filter(professores=professor)

        historico = []
        for turma in turmas:
            datas = Presenca.objects.filter(turma=turma).values_list('data', flat=True).distinct().order_by('data')
            historico.append({
                "turma": TurmaSerializer(turma).data,
                "datas": datas,
            })

        return Response({"historico": historico}, status=status.HTTP_200_OK)


def _usuario_pode_acessar_turma_observacao(user, turma):
    if not user.is_authenticated:
        return False
    if getattr(user, "tipo", None) == "gerente":
        return True
    if getattr(user, "tipo", None) == "professor":
        return turma.professores.filter(id=user.id).exists()
    return False


class ObservacaoAulaAPIView(APIView):
    """
    Uma observação interna por turma por dia (professor escreve; gerente só lê).
    GET: professor ou gerente. PUT: apenas professor da turma, apenas no mesmo dia (data=hoje).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)
        if not _usuario_pode_acessar_turma_observacao(request.user, turma):
            return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

        data_param = request.query_params.get("data")
        if data_param:
            dt = parse_date(data_param)
            if not dt:
                return Response({"error": "Data inválida. Use AAAA-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            dt = timezone.localdate()

        obs = (
            ObservacaoAula.objects.filter(turma=turma, data=dt)
            .select_related("autor")
            .first()
        )
        hoje = timezone.localdate()
        pode_editar = (
            getattr(request.user, "tipo", None) == "professor"
            and dt == hoje
            and turma.professores.filter(id=request.user.id).exists()
        )

        return Response(
            {
                "turma_id": turma.id,
                "data": dt.isoformat(),
                "texto": obs.texto if obs else None,
                "autor_nome": (obs.autor.get_full_name() or obs.autor.username) if obs else None,
                "atualizado_em": obs.atualizado_em.isoformat() if obs else None,
                "pode_editar": pode_editar,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request, turma_id):
        if getattr(request.user, "tipo", None) != "professor":
            return Response({"error": "Apenas professores podem registrar observações."}, status=status.HTTP_403_FORBIDDEN)

        turma = get_object_or_404(Turma, id=turma_id)
        if not turma.professores.filter(id=request.user.id).exists():
            return Response({"error": "Você não é professor desta turma."}, status=status.HTTP_403_FORBIDDEN)

        hoje = timezone.localdate()
        texto = request.data.get("texto", "")
        if not isinstance(texto, str):
            return Response({"error": "Texto inválido."}, status=status.HTTP_400_BAD_REQUEST)
        texto = texto.strip()
        if len(texto) < 1:
            return Response(
                {"error": f"Informe o texto da observação (1 a {MAX_OBSERVACAO_AULA_CHARS} caracteres)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(texto) > MAX_OBSERVACAO_AULA_CHARS:
            return Response(
                {"error": f"Texto máximo: {MAX_OBSERVACAO_AULA_CHARS} caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ObservacaoAula.objects.update_or_create(
            turma=turma,
            data=hoje,
            defaults={
                "texto": texto,
                "autor_id": request.user.id,
            },
        )
        obs = ObservacaoAula.objects.filter(turma=turma, data=hoje).select_related("autor").first()
        return Response(
            {
                "turma_id": turma.id,
                "data": hoje.isoformat(),
                "texto": obs.texto,
                "autor_nome": obs.autor.get_full_name() or obs.autor.username,
                "atualizado_em": obs.atualizado_em.isoformat(),
                "pode_editar": True,
            },
            status=status.HTTP_200_OK,
        )

