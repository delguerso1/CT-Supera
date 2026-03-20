from django.shortcuts import get_object_or_404
from turmas.models import Turma
from datetime import date
from usuarios.models import Usuario, PreCadastro
from financeiro.models import Mensalidade
from .models import Presenca
from .serializers import UsuarioSerializer, PreCadastroSerializer, PresencaSerializer, TurmaSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.mail import send_mail
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
import logging
from django.utils.dateparse import parse_date

logger = logging.getLogger(__name__)


class VerificarCheckinAlunosAPIView(APIView):
    """API para verificar quais alunos fizeram check-in em uma turma. Inclui pré-cadastros com aula experimental no dia."""
    permission_classes = [IsAuthenticated]

    def get(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)
        hoje = date.today()

        # Busca todos os alunos da turma
        alunos = Usuario.objects.filter(tipo="aluno", ativo=True, turmas_aluno=turma)

        status_alunos = []
        for aluno in alunos:
            presenca = Presenca.objects.filter(
                usuario=aluno,
                data=hoje,
                turma=turma
            ).first()
            status_alunos.append({
                "id": str(aluno.id),
                "nome": f"{aluno.first_name} {aluno.last_name}",
                "username": aluno.username,
                "tipo": "aluno",
                "checkin_realizado": presenca.checkin_realizado if presenca else False,
                "presenca_confirmada": presenca.presenca_confirmada if presenca else False,
                "pode_confirmar_presenca": presenca.checkin_realizado if presenca else False,
            })

        # Pré-cadastros com aula experimental nesta turma e data
        precadastros = PreCadastro.objects.filter(
            turma=turma,
            data_aula_experimental=hoje,
            origem='aula_experimental',
            status='pendente'
        )
        for pc in precadastros:
            status_alunos.append({
                "id": f"precadastro_{pc.id}",
                "nome": f"{pc.first_name} {pc.last_name or ''}".strip(),
                "username": pc.email,
                "tipo": "aula_experimental",
                "checkin_realizado": False,
                "presenca_confirmada": pc.compareceu_aula_experimental,
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

        presencas_registradas = 0
        alunos = Usuario.objects.filter(tipo="aluno", ativo=True, turmas_aluno=turma)

        for aluno in alunos:
            if str(aluno.id) in alunos_ids:
                presenca = Presenca.objects.filter(
                    usuario=aluno,
                    data=hoje,
                    turma=turma
                ).first()
                if presenca:
                    presenca.checkin_realizado = True
                    presenca.presenca_confirmada = True
                    presenca.save()
                else:
                    Presenca.objects.create(
                        usuario=aluno,
                        turma=turma,
                        data=hoje,
                        checkin_realizado=True,
                        presenca_confirmada=True
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

        total_registros = qs.count()
        total_checkins = qs.filter(checkin_realizado=True).count()
        total_confirmadas = qs.filter(presenca_confirmada=True).count()

        return Response({
            "total_registros": total_registros,
            "total_checkins": total_checkins,
            "total_confirmadas": total_confirmadas,
            "presencas": [_serialize_presenca(item) for item in qs]
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

        if checkin_realizado is None and presenca_confirmada is None:
            return Response({"error": "Nenhum campo para atualizar."}, status=status.HTTP_400_BAD_REQUEST)

        if checkin_realizado is not None:
            presenca.checkin_realizado = bool(checkin_realizado)
            if not presenca.checkin_realizado:
                presenca.presenca_confirmada = False

        if presenca_confirmada is not None:
            confirmar = bool(presenca_confirmada)
            if confirmar and not presenca.checkin_realizado:
                return Response(
                    {"error": "Não é possível confirmar presença sem check-in."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            presenca.presenca_confirmada = confirmar

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

            # Alunos: ativos e inativos
            alunos_ativos = Usuario.objects.filter(tipo="aluno", ativo=True).count()
            alunos_inativos = Usuario.objects.filter(tipo="aluno", ativo=False).count()

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

            # Aulas experimentais: futuras e já ocorridas
            aulas_experimentais_futuras = PreCadastro.objects.filter(
                origem='aula_experimental',
                status='pendente',
                data_aula_experimental__gt=hoje
            ).count()
            aulas_experimentais_ocorridas = PreCadastro.objects.filter(
                origem='aula_experimental',
                data_aula_experimental__isnull=False,
                data_aula_experimental__lte=hoje
            ).count()

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

            # Últimas mensalidades pagas
            ultimas_mensalidades = Mensalidade.objects.filter(
                status="pago",
                data_vencimento__gte=timezone.now() - timedelta(days=7)
            ).order_by('-data_vencimento')[:5]

            for mensalidade in ultimas_mensalidades:
                atividades.append({
                    'id': f'mensalidade_{mensalidade.id}',
                    'type': 'mensalidade',
                    'description': f'Mensalidade paga - {mensalidade.aluno.first_name}',
                    'data': mensalidade.data_vencimento.isoformat()
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

        # Importa as funções necessárias
        from usuarios.utils import enviar_convite_aluno
        
        # Cria usuário inativo (será ativado via link)
        usuario = Usuario.objects.create_user(
            username=precadastro.cpf.replace(".", "").replace("-", ""),
            email=precadastro.email,
            password=None,  # Não define senha - usuário definirá via link
            tipo="aluno",
            first_name=precadastro.first_name,
            last_name=precadastro.last_name,
            telefone=precadastro.telefone,
            cpf=precadastro.cpf,
            data_nascimento=precadastro.data_nascimento,
            is_active=False  # Usuário inativo até ativar via link
        )
        usuario.set_unusable_password()  # Não define senha válida
        usuario.save()

        precadastro.usuario = usuario
        precadastro.status = "matriculado"
        precadastro.save()

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


