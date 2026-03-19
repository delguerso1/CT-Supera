from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.forms import SetPasswordForm
from usuarios.models import Usuario, PreCadastro
from turmas.models import DiaSemana, Turma
from turmas.views import DIASEMANA_WEEKDAY_MAP
from usuarios.utils import obter_precadastro_por_token
from usuarios.forms import DefinirSenhaForm
from usuarios.serializers import DefinirSenhaSerializer, SolicitarRecuperacaoSenhaSerializer, RedefinirSenhaSerializer
from financeiro.models import Mensalidade
from django.utils import timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from .serializers import UsuarioSerializer, PreCadastroSerializer, MensalidadeSerializer, SalarioSerializer
from datetime import date, timedelta
from django.core.mail import send_mail
from django.db import transaction
import logging
from calendar import monthrange

logger = logging.getLogger(__name__)


class ListarPrecadastrosAPIView(ListCreateAPIView):
    """API para listar pré-cadastros. Por padrão retorna apenas pendentes. Suporta ?status=cancelado."""
    serializer_class = PreCadastroSerializer

    def get_queryset(self):
        qs = PreCadastro.objects.all().order_by('-criado_em')
        if self.request.method != 'GET':
            return qs
        status_param = self.request.query_params.get('status', '').strip().lower()
        origem_param = self.request.query_params.get('origem', '').strip().lower()

        if status_param == 'cancelado':
            qs = qs.filter(status='cancelado')
        elif status_param == 'matriculado':
            qs = qs.filter(status='matriculado')
        elif status_param == 'todos':
            pass
        else:
            qs = qs.filter(status='pendente')

        if origem_param in ('formulario', 'ex_aluno', 'aula_experimental'):
            qs = qs.filter(origem=origem_param)
        elif origem_param == 'pendente':
            qs = qs.filter(origem='formulario')

        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.origem == 'aula_experimental' and instance.data_aula_experimental:
            try:
                from usuarios.utils import enviar_confirmacao_aula_experimental
                enviar_confirmacao_aula_experimental(instance)
            except Exception as e:
                logger.warning(f"Erro ao enviar e-mail de confirmação: {e}")


class EditarExcluirPrecadastroAPIView(RetrieveUpdateDestroyAPIView):
    """API para editar, excluir ou visualizar um pré-cadastro."""
    permission_classes = [IsAuthenticated]
    queryset = PreCadastro.objects.all()
    serializer_class = PreCadastroSerializer


class ReagendarAulaExperimentalAPIView(APIView):
    """API para consultar info e reagendar aula experimental (token no query/body)."""
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({"error": "Token ausente."}, status=status.HTTP_400_BAD_REQUEST)
        precadastro = obter_precadastro_por_token(token)
        if not precadastro:
            return Response({"error": "Link inválido ou expirado."}, status=status.HTTP_404_NOT_FOUND)
        if precadastro.reagendou_aula_experimental:
            return Response({"error": "Você já realizou um reagendamento. Entre em contato para nova alteração."}, status=status.HTTP_403_FORBIDDEN)
        if not precadastro.turma:
            return Response({"error": "Turma não encontrada."}, status=status.HTTP_400_BAD_REQUEST)
        # Datas disponíveis (mesmo endpoint que agendamento)
        hoje = date.today()
        turma = precadastro.turma
        dias_turma = turma.dias_semana.all()
        weekdays_validos = set()
        for dia in dias_turma:
            wd = DIASEMANA_WEEKDAY_MAP.get(dia.nome)
            if wd is not None:
                weekdays_validos.add(wd)
        amanha = hoje + timedelta(days=1)
        _, ultimo_dia = monthrange(hoje.year, hoje.month)
        datas = []
        for d in range(1, ultimo_dia + 1):
            dt = date(hoje.year, hoje.month, d)
            if dt.weekday() in weekdays_validos and dt >= amanha:
                datas.append(dt.isoformat())
        return Response({
            "precadastro": {
                "first_name": precadastro.first_name,
                "last_name": precadastro.last_name,
                "data_aula_experimental": precadastro.data_aula_experimental.isoformat() if precadastro.data_aula_experimental else None,
                "turma_id": precadastro.turma.id,
                "turma_nome": str(precadastro.turma),
                "ct_nome": precadastro.turma.ct.nome if precadastro.turma.ct else None,
            },
            "datas_disponiveis": sorted(datas),
        }, status=status.HTTP_200_OK)

    def post(self, request):
        token = request.data.get('token')
        nova_data = request.data.get('nova_data')
        if not token:
            return Response({"error": "Token ausente."}, status=status.HTTP_400_BAD_REQUEST)
        if not nova_data:
            return Response({"error": "Nova data é obrigatória."}, status=status.HTTP_400_BAD_REQUEST)
        precadastro = obter_precadastro_por_token(token)
        if not precadastro:
            return Response({"error": "Link inválido ou expirado."}, status=status.HTTP_404_NOT_FOUND)
        if precadastro.reagendou_aula_experimental:
            return Response({"error": "Você já realizou um reagendamento."}, status=status.HTTP_403_FORBIDDEN)
        try:
            dt = date.fromisoformat(nova_data)
        except (ValueError, TypeError):
            return Response({"error": "Data inválida."}, status=status.HTTP_400_BAD_REQUEST)
        amanha = date.today() + timedelta(days=1)
        if dt < amanha:
            return Response({"error": "Reagendamento só é permitido com pelo menos 24h de antecedência."}, status=status.HTTP_400_BAD_REQUEST)
        # Validar que a data está nas datas da turma
        turma = precadastro.turma
        dias_turma = turma.dias_semana.all()
        weekdays_validos = set()
        for dia in dias_turma:
            wd = DIASEMANA_WEEKDAY_MAP.get(dia.nome)
            if wd is not None:
                weekdays_validos.add(wd)
        if dt.weekday() not in weekdays_validos:
            return Response({"error": "Data incompatível com os dias da turma."}, status=status.HTTP_400_BAD_REQUEST)
        hoje = date.today()
        if dt.year != hoje.year or dt.month != hoje.month:
            return Response({"error": "A nova data deve ser no mês atual."}, status=status.HTTP_400_BAD_REQUEST)
        precadastro.data_aula_experimental = dt
        precadastro.reagendou_aula_experimental = True
        precadastro.save(update_fields=['data_aula_experimental', 'reagendou_aula_experimental'])
        try:
            from usuarios.utils import enviar_confirmacao_aula_experimental
            enviar_confirmacao_aula_experimental(precadastro)
        except Exception as e:
            logger.warning(f"Erro ao enviar e-mail de confirmação do reagendamento: {e}")
        return Response({"message": "Reagendamento realizado com sucesso!", "data_aula_experimental": dt.isoformat()}, status=status.HTTP_200_OK)


class FinalizarAgendamentoAPIView(APIView):
    """API para finalizar o agendamento de um pré-cadastro."""
    permission_classes = [IsAuthenticated]

    def post(self, request, precadastro_id):
        precadastro = get_object_or_404(PreCadastro, id=precadastro_id)

        cpf = request.data.get("cpf") or precadastro.cpf
        dia_vencimento = request.data.get("dia_vencimento")
        ja_aluno = request.data.get("ja_aluno")
        dias_habilitados_ids = request.data.get("dias_habilitados")
        valor_mensalidade = request.data.get("valor_mensalidade")
        valor_matricula = request.data.get("valor_matricula")
        valor_uniforme = request.data.get("valor_uniforme")
        dia_vencimento_primeira = request.data.get("dia_vencimento_primeira")
        turma_id = request.data.get("turma")
        criar_primeira_mensalidade_agora = request.data.get("criar_primeira_mensalidade_agora")
        forma_pagamento = request.data.get("forma_pagamento") or ""

        criar_e_enviar = bool(criar_primeira_mensalidade_agora)
        if isinstance(criar_primeira_mensalidade_agora, str):
            criar_e_enviar = criar_primeira_mensalidade_agora.strip().lower() in ["true", "1", "sim", "yes"]
        forma_pagamento = (forma_pagamento or "").strip().lower()

        logger.debug(
            "Finalizar agendamento precadastro=%s ja_aluno=%s turma_id=%s",
            precadastro_id,
            ja_aluno,
            getattr(precadastro, "turma_id", None),
        )

        ja_aluno_bool = bool(ja_aluno)
        if isinstance(ja_aluno, str):
            ja_aluno_bool = ja_aluno.strip().lower() in ["true", "1", "sim", "yes"]

        if precadastro.usuario and not ja_aluno_bool:
            return Response({"error": "Este pré-cadastro já foi convertido em aluno."}, status=status.HTTP_400_BAD_REQUEST)

        if cpf:
            cpf = "".join([c for c in str(cpf) if c.isdigit()])
        if not cpf or len(cpf) != 11:
            return Response({"error": "CPF inválido ou não fornecido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dia_vencimento = int(dia_vencimento)
        except (TypeError, ValueError):
            return Response({"error": "Dia de vencimento inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if dia_vencimento not in [1, 5, 10]:
            return Response({"error": "Dia de vencimento deve ser 1, 5 ou 10."}, status=status.HTTP_400_BAD_REQUEST)

        if not dias_habilitados_ids:
            return Response({"error": "Selecione pelo menos um dia habilitado para treino."}, status=status.HTTP_400_BAD_REQUEST)
        if isinstance(dias_habilitados_ids, str):
            dias_habilitados_ids = [d.strip() for d in dias_habilitados_ids.split(",") if d.strip()]
        if not isinstance(dias_habilitados_ids, list):
            return Response({"error": "Dias habilitados inválidos."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            dias_habilitados_ids = [int(dia_id) for dia_id in dias_habilitados_ids]
        except (TypeError, ValueError):
            return Response({"error": "Dias habilitados inválidos."}, status=status.HTTP_400_BAD_REQUEST)

        dias_habilitados = list(DiaSemana.objects.filter(id__in=dias_habilitados_ids))
        if len(dias_habilitados) != len(set(dias_habilitados_ids)):
            return Response({"error": "Um ou mais dias habilitados são inválidos."}, status=status.HTTP_400_BAD_REQUEST)
        if not dias_habilitados:
            return Response({"error": "Não há dias da semana cadastrados."}, status=status.HTTP_400_BAD_REQUEST)

        # Atualiza turma do pré-cadastro se enviada na requisição
        if turma_id is not None:
            try:
                turma_id = int(turma_id)
            except (TypeError, ValueError):
                turma_id = None
            if turma_id:
                turma_obj = Turma.objects.filter(id=turma_id, ativo=True).first()
                if turma_obj:
                    precadastro.turma = turma_obj
                    precadastro.save()

        # Aluno novo: sem turma não há registro financeiro da 1ª parcela (matrícula+uniforme+mensalidade)
        if not ja_aluno_bool and not precadastro.turma_id:
            return Response(
                {
                    "error": "Para alunos novos, selecione uma turma. Sem turma, a primeira mensalidade "
                    "(matrícula + uniforme + mensalidade) não é gerada no financeiro."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            valor_mensalidade = Decimal(str(valor_mensalidade))
        except (InvalidOperation, TypeError, ValueError):
            return Response({"error": "Informe um valor de mensalidade válido."}, status=status.HTTP_400_BAD_REQUEST)
        if valor_mensalidade <= 0:
            return Response({"error": "O valor da mensalidade deve ser maior que zero."}, status=status.HTTP_400_BAD_REQUEST)

        valor_primeira_mensalidade = None
        dia_vencimento_primeira = None
        if not ja_aluno_bool:
            try:
                valor_matricula_dec = Decimal(str(valor_matricula or 0))
                valor_uniforme_dec = Decimal(str(valor_uniforme or 0))
            except (InvalidOperation, TypeError, ValueError):
                valor_matricula_dec = Decimal("0")
                valor_uniforme_dec = Decimal("0")
            valor_primeira_mensalidade = (valor_matricula_dec + valor_uniforme_dec + valor_mensalidade).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if valor_primeira_mensalidade <= 0:
                return Response({"error": "A soma (matrícula + uniforme + mensalidade) deve ser maior que zero."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                dia_vencimento_primeira = int(dia_vencimento_primeira or dia_vencimento)
            except (TypeError, ValueError):
                dia_vencimento_primeira = int(dia_vencimento)
            if dia_vencimento_primeira < 1 or dia_vencimento_primeira > 31:
                return Response({"error": "Dia do vencimento da primeira mensalidade deve ser entre 1 e 31."}, status=status.HTTP_400_BAD_REQUEST)

            if criar_e_enviar and forma_pagamento in ('pix', 'boleto') and not (turma_id or precadastro.turma_id):
                return Response({
                    "error": "Para criar e enviar a cobrança por e-mail, selecione uma turma."
                }, status=status.HTTP_400_BAD_REQUEST)

        if ja_aluno_bool:
            precadastro.cpf = cpf
            precadastro.save()

            aluno = precadastro.usuario
            if aluno:
                aluno.dia_vencimento = dia_vencimento
                aluno.valor_mensalidade = valor_mensalidade
                aluno.save()
                if dias_habilitados is not None:
                    aluno.dias_habilitados.set(dias_habilitados)
                aluno.atualizar_mensalidades_pendentes()
                if precadastro.turma:
                    precadastro.turma.alunos.add(aluno)
                    from financeiro.services import criar_mensalidade_ao_vincular_turma
                    criar_mensalidade_ao_vincular_turma(aluno, precadastro.turma)

                precadastro.status = 'matriculado'
                precadastro.save()

                return Response({"message": "Pré-cadastro convertido em aluno com sucesso!"}, status=status.HTTP_200_OK)

            try:
                usuario_aluno = precadastro.converter_para_aluno(
                    request.user,
                    dia_vencimento=dia_vencimento,
                    valor_mensalidade=valor_mensalidade,
                    plano=None,
                    dias_habilitados=dias_habilitados
                )
                if usuario_aluno and precadastro.turma:
                    precadastro.turma.alunos.add(usuario_aluno)
                    from financeiro.services import criar_mensalidade_ao_vincular_turma
                    # Ramo ja_aluno: sem 1ª parcela composta (só mensalidade via aluno.valor_mensalidade)
                    criar_mensalidade_ao_vincular_turma(usuario_aluno, precadastro.turma)
                return Response({"message": "Pré-cadastro convertido em aluno com sucesso!"}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"error": f"Erro ao finalizar agendamento: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        precadastro.cpf = cpf
        precadastro.save()
        try:
            usuario_aluno = precadastro.converter_para_aluno(
                request.user,
                dia_vencimento=dia_vencimento,
                valor_mensalidade=valor_mensalidade,
                plano=None,
                dias_habilitados=dias_habilitados
            )
            mensalidade_criada = None
            if usuario_aluno and precadastro.turma:
                precadastro.turma.alunos.add(usuario_aluno)
                from financeiro.services import criar_mensalidade_ao_vincular_turma
                mensalidade_criada = criar_mensalidade_ao_vincular_turma(
                    usuario_aluno, precadastro.turma,
                    valor_primeira_mensalidade=valor_primeira_mensalidade,
                    dia_vencimento_primeira=dia_vencimento_primeira
                )

            # Opcional: criar cobrança (PIX/Boleto) e enviar por e-mail ao aluno
            pagamento_enviado = False
            if criar_e_enviar and forma_pagamento in ('pix', 'boleto') and mensalidade_criada and usuario_aluno.email and usuario_aluno.email != 'pendente':
                try:
                    if forma_pagamento == 'pix':
                        from financeiro.services import gerar_pix_para_mensalidade
                        resultado = gerar_pix_para_mensalidade(mensalidade_criada)
                        from usuarios.utils import enviar_primeira_mensalidade_email
                        pagamento_enviado = enviar_primeira_mensalidade_email(
                            usuario_aluno, 'pix',
                            valor=resultado['valor'],
                            data_vencimento=resultado['data_vencimento'],
                            codigo_pix=resultado.get('codigo_pix')
                        )
                    elif forma_pagamento == 'boleto':
                        from financeiro.services import gerar_boleto_para_mensalidade
                        resultado = gerar_boleto_para_mensalidade(mensalidade_criada)
                        from usuarios.utils import enviar_primeira_mensalidade_email
                        pagamento_enviado = enviar_primeira_mensalidade_email(
                            usuario_aluno, 'boleto',
                            valor=resultado['valor'],
                            data_vencimento=resultado['data_vencimento'],
                            digitable_line=resultado.get('digitable_line'),
                            pdf_content=resultado.get('pdf_content')
                        )
                except Exception as e:
                    logger.warning(f"Erro ao gerar/enviar cobrança da primeira mensalidade: {e}")
                    import traceback
                    logger.warning(traceback.format_exc())

            msg = "Pré-cadastro convertido em aluno com sucesso!"
            if pagamento_enviado:
                msg += " Cobrança enviada por e-mail ao aluno."
            return Response({"message": msg, "pagamento_enviado": pagamento_enviado}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Erro ao finalizar agendamento: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    """API para realizar login."""
    permission_classes = []  # Remove a necessidade de autenticação

    def post(self, request):
        try:
            # Aceita dados de request.data (JSON) ou request.POST (form)
            data = dict(request.data) if request.data else dict(request.POST)
            # Fallback: tenta parsear o body como JSON manualmente (para casos de Content-Type incorreto)
            if not data and request.body:
                import json
                try:
                    data = json.loads(request.body.decode('utf-8'))
                except Exception:
                    pass
            cpf_raw = data.get("cpf") or data.get("username") or ""
            cpf = str(cpf_raw).replace(".", "").replace("-", "").replace(" ", "").strip()
            password = str(data.get("password") or "").strip()

            if not cpf or not password:
                body_preview = request.body[:200].decode('utf-8', errors='replace') if request.body else '(vazio)'
                print(f"[DEBUG] Login 400 - data={data}, Content-Type={request.content_type}, body={body_preview}")
                logger.warning(f"Login 400: cpf ou senha vazios. data={data}, Content-Type={request.content_type}")
                return Response(
                    {"error": "CPF e senha são obrigatórios."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verifica se o usuário existe
            try:
                user = Usuario.objects.get(username=cpf)
                print(f"[DEBUG] Usuário encontrado: {user.username}, Tipo: {user.tipo}, Ativo: {user.is_active}")
            except Usuario.DoesNotExist:
                print(f"[DEBUG] Usuário não encontrado para CPF: {cpf}")
                return Response(
                    {"error": "Usuário não encontrado."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Tenta autenticar
            print(f"[DEBUG] Tentando autenticar com username: {cpf}, password: {password}")
            user = authenticate(request, username=cpf, password=password)
            print(f"[DEBUG] Resultado da autenticação: {user is not None}")
            if user is None:
                print(f"[DEBUG] Falha na autenticação - verificando se usuário existe...")
                try:
                    user_check = Usuario.objects.get(username=cpf)
                    print(f"[DEBUG] Usuário existe no banco: {user_check.username}")
                    print(f"[DEBUG] Verificando senha manualmente...")
                    if user_check.check_password(password):
                        print(f"[DEBUG] Senha está correta!")
                        user = user_check
                    else:
                        print(f"[DEBUG] Senha está incorreta!")
                except Usuario.DoesNotExist:
                    print(f"[DEBUG] Usuário não encontrado no banco")
            
            if user is not None:
                if user.is_active:
                    # Gera ou obtém o token
                    token, created = Token.objects.get_or_create(user=user)
                    print(f"[DEBUG] Login bem-sucedido para usuário: {user.username}")
                    print(f"[DEBUG] Token gerado: {token.key}")
                    print(f"[DEBUG] Dados do usuário: {user.id}, {user.username}, {user.tipo}")
                    return Response({
                        "message": "Login realizado com sucesso!",
                        "token": token.key,
                        "user": UsuarioSerializer(user).data,
                        "requires_contract_acceptance": bool(
                            user.tipo == "aluno" and not getattr(user, "contrato_aceito", False)
                        )
                    }, status=status.HTTP_200_OK)
                else:
                    print(f"[DEBUG] Tentativa de login para usuário inativo: {cpf}")
                    return Response(
                        {"error": "Conta desativada. Entre em contato com o administrador."}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            else:
                print(f"[DEBUG] Falha na autenticação para CPF: {cpf}")
                return Response(
                    {"error": "CPF ou senha inválidos."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            print(f"[DEBUG] Erro durante o login: {str(e)}")
            import traceback
            print(f"[DEBUG] Stack trace: {traceback.format_exc()}")
            return Response(
                {"error": "Erro interno do servidor. Tente novamente mais tarde."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogoutAPIView(APIView):
    """API para realizar logout."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"message": "Logout realizado com sucesso!"}, status=status.HTTP_200_OK)


class AceitarContratoAPIView(APIView):
    """API para registrar aceite do contrato pelo aluno."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        if usuario.tipo != "aluno":
            return Response({"error": "Apenas alunos podem aceitar o contrato."}, status=status.HTTP_403_FORBIDDEN)

        if usuario.contrato_aceito:
            return Response({"message": "Contrato já aceito.", "user": UsuarioSerializer(usuario).data}, status=status.HTTP_200_OK)

        ip = request.META.get('HTTP_X_FORWARDED_FOR')
        if ip:
            ip = ip.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

        usuario.contrato_aceito = True
        usuario.contrato_aceito_em = timezone.now()
        usuario.contrato_aceito_ip = ip
        usuario.save(update_fields=['contrato_aceito', 'contrato_aceito_em', 'contrato_aceito_ip'])

        return Response(
            {
                "message": "Contrato aceito com sucesso!",
                "user": UsuarioSerializer(usuario).data
            },
            status=status.HTTP_200_OK
        )


class ReverterAlunoParaPreCadastroAPIView(APIView):
    """API para mover aluno para pré-cadastro."""
    permission_classes = [IsAuthenticated]

    def post(self, request, usuario_id):
        usuario = get_object_or_404(Usuario, id=usuario_id, tipo="aluno")
        if request.user.tipo not in ["gerente", "professor"]:
            return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            precadastro = None
            if usuario.cpf:
                precadastro = PreCadastro.objects.filter(cpf=usuario.cpf).first()
            if not precadastro and usuario.email:
                precadastro = PreCadastro.objects.filter(email=usuario.email).first()

            if precadastro:
                precadastro.first_name = usuario.first_name
                precadastro.last_name = usuario.last_name
                precadastro.cpf = usuario.cpf
                precadastro.telefone = usuario.telefone or precadastro.telefone
                precadastro.data_nascimento = usuario.data_nascimento
                precadastro.email = usuario.email or precadastro.email
                precadastro.status = "pendente"
                precadastro.origem = "ex_aluno"
                precadastro.usuario = None
                precadastro.save()
            else:
                precadastro = PreCadastro.objects.create(
                    first_name=usuario.first_name,
                    last_name=usuario.last_name,
                    cpf=usuario.cpf,
                    telefone=usuario.telefone or "(00)00000-0000",
                    data_nascimento=usuario.data_nascimento,
                    email=usuario.email or "pendente",
                    status="pendente",
                    origem="ex_aluno"
                )

            usuario.delete()

        return Response(
            {"message": "Aluno movido para pré-cadastro com sucesso!", "precadastro_id": precadastro.id},
            status=status.HTTP_200_OK
        )


class AtivarContaAPIView(APIView):
    """API para ativar a conta de um usuário (aluno, professor ou gerente)."""
    permission_classes = []  # Público para permitir ativação sem autenticação
    
    def post(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            usuario = Usuario.objects.get(pk=uid)
        except (Usuario.DoesNotExist, ValueError):
            logger.error(f"Erro ao decodificar UID ou usuário não encontrado: uidb64={uidb64}")
            return Response({
                "error": "Token de ativação inválido ou usuário não encontrado.",
                "code": "INVALID_TOKEN"
            }, status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(usuario, token):
            serializer = DefinirSenhaSerializer(data=request.data)
            if serializer.is_valid():
                # Define a nova senha e ativa a conta
                nova_senha = serializer.validated_data['new_password1']
                usuario.set_password(nova_senha)
                usuario.is_active = True  # Ativa a conta
                usuario.save()
                
                logger.info(f"Conta ativada com sucesso para o usuário {usuario.username} (tipo: {usuario.tipo})")
                return Response({
                    "message": "Conta ativada com sucesso!",
                    "user": {
                        "id": usuario.id,
                        "username": usuario.username,
                        "email": usuario.email,
                        "first_name": usuario.first_name,
                        "last_name": usuario.last_name,
                        "tipo": usuario.tipo
                    }
                }, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Dados inválidos ao ativar conta: {serializer.errors}")
                return Response({
                    "error": "Dados inválidos",
                    "details": serializer.errors,
                    "code": "VALIDATION_ERROR"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.warning(f"Token inválido ou expirado para usuário: uidb64={uidb64}")
        return Response({
            "error": "Token de ativação inválido ou expirado.",
            "code": "EXPIRED_TOKEN"
        }, status=status.HTTP_400_BAD_REQUEST)


class ListarCriarUsuariosAPIView(ListCreateAPIView):
    """API para listar e criar usuários."""
    permission_classes = [IsAuthenticated]
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def get_queryset(self):
        queryset = Usuario.objects.all()
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        turma_id = self.request.query_params.get('turma', None)
        if turma_id:
            queryset = queryset.filter(turmas_aluno__id=turma_id).distinct()
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        try:
            if request.user.tipo == "gerente" and request.data.get("tipo") == "aluno":
                return Response(
                    {"error": "Gerentes devem criar alunos via pré-cadastro e matrícula."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            # Mensalidade só é criada ao vincular aluno à turma (AdicionarAlunoAPIView)
            headers = self.get_success_headers(serializer.data)
            # Retorna o objeto criado (com id)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            # Captura erro específico de CPF duplicado
            if 'UNIQUE constraint failed: usuarios_usuario.cpf' in str(e):
                return Response(
                    {"error": "CPF já cadastrado no sistema. Use um CPF diferente."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Para outros erros, retorna erro genérico
            return Response(
                {"error": f"Erro ao cadastrar usuário: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class EditarExcluirUsuarioAPIView(RetrieveUpdateDestroyAPIView):
    """API para editar, excluir ou visualizar um usuário."""
    permission_classes = [IsAuthenticated]
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def get(self, request, *args, **kwargs):
        try:
            print(f"[DEBUG] Headers da requisição: {request.headers}")
            print(f"[DEBUG] Usuário autenticado: {request.user}")
            print(f"[DEBUG] Buscando usuário com ID: {kwargs.get('pk')}")
            instance = self.get_object()
            print(f"[DEBUG] Usuário encontrado: {instance.id}, {instance.username}, {instance.tipo}")
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            print(f"[DEBUG] Erro ao buscar usuário: {str(e)}")
            return Response(
                {"error": "Erro ao buscar dados do usuário."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request, *args, **kwargs):
        """Método personalizado para lidar com upload de fotos e atualização de dados."""
        try:
            instance = self.get_object()
            
            # Se há arquivos (foto), monta um dict manualmente para evitar
            # "cannot pickle 'BufferedRandom' instances" (request.data.copy() com
            # TemporaryUploadedFile em arquivos > 2.5MB causa esse erro)
            if request.FILES:
                data = {
                    'username': request.data.get('username') or instance.username,
                    'tipo': request.data.get('tipo') or instance.tipo,
                    'cpf': request.data.get('cpf') or instance.cpf,
                    'ativo': request.data.get('ativo', instance.ativo),
                    'email': request.data.get('email') or instance.email,
                    'first_name': request.data.get('first_name') or instance.first_name,
                    'last_name': request.data.get('last_name') or instance.last_name,
                    'foto_perfil': request.FILES.get('foto_perfil'),
                }
                # Campos opcionais
                for field in ('telefone', 'endereco', 'data_nascimento', 'nome_responsavel',
                             'telefone_responsavel', 'telefone_emergencia', 'ficha_medica',
                             'dia_vencimento', 'valor_mensalidade'):
                    if hasattr(instance, field):
                        data[field] = request.data.get(field, getattr(instance, field))
                
                serializer = self.get_serializer(instance, data=data, partial=True)
            else:
                # Para dados normais (sem arquivo)
                serializer = self.get_serializer(instance, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                print(f"[DEBUG] Erros de validação: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"[DEBUG] Erro ao atualizar usuário: {str(e)}")
            return Response(
                {"error": f"Erro ao atualizar usuário: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class ReenviarConviteAPIView(APIView):
    """API para reenviar convite de ativação."""
    permission_classes = [IsAuthenticated]

    def post(self, request, usuario_id):
        try:
            # Aceita alunos, professores e gerentes
            usuario = Usuario.objects.get(
                id=usuario_id, 
                tipo__in=["aluno", "professor", "gerente"]
            )
            
            # Verifica se o usuário tem e-mail
            if not usuario.email:
                return Response(
                    {"error": "Usuário não possui e-mail cadastrado."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reenvia o convite
            from usuarios.utils import enviar_convite_aluno
            enviar_convite_aluno(usuario)
            
            return Response(
                {"message": "Convite de ativação reenviado com sucesso!"}, 
                status=status.HTTP_200_OK
            )
            
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Usuário não encontrado."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erro ao reenviar convite: {str(e)}")
            return Response(
                {"error": "Erro ao reenviar convite. Tente novamente."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SolicitarRecuperacaoSenhaAPIView(APIView):
    """API para solicitar recuperação de senha."""
    permission_classes = []  # Não requer autenticação

    def post(self, request):
        serializer = SolicitarRecuperacaoSenhaSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                "error": "Dados inválidos",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cpf = serializer.validated_data['cpf']
        
        try:
            # Busca usuário pelo CPF
            usuario = Usuario.objects.get(username=cpf, is_active=True)
            
            # Verifica se o usuário tem e-mail válido
            if not usuario.email or usuario.email == 'pendente':
                return Response({
                    "error": "Usuário não possui e-mail válido cadastrado.",
                    "code": "NO_EMAIL"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Envia e-mail de recuperação
            from usuarios.utils import enviar_recuperacao_senha
            enviar_recuperacao_senha(usuario)
            
            logger.info(f"Solicitação de recuperação de senha para {usuario.email}")
            
            return Response({
                "message": "E-mail de recuperação enviado com sucesso!",
                "email": usuario.email  # Retorna o e-mail para confirmação
            }, status=status.HTTP_200_OK)
            
        except Usuario.DoesNotExist:
            # Por segurança, não revela se o usuário existe ou não
            return Response({
                "message": "Se o CPF estiver cadastrado e ativo, você receberá um e-mail com instruções para recuperar sua senha.",
                "code": "EMAIL_SENT"
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erro ao processar solicitação de recuperação: {str(e)}")
            return Response({
                "error": "Erro interno. Tente novamente mais tarde.",
                "code": "INTERNAL_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RedefinirSenhaAPIView(APIView):
    """API para redefinir senha via token."""
    permission_classes = []  # Não requer autenticação

    def post(self, request, uidb64, token):
        try:
            # Decodifica o UID
            uid = urlsafe_base64_decode(uidb64).decode()
            usuario = Usuario.objects.get(pk=uid, is_active=True)
        except (Usuario.DoesNotExist, ValueError):
            return Response({
                "error": "Token de recuperação inválido ou usuário não encontrado.",
                "code": "INVALID_TOKEN"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verifica se o token é válido
        if not default_token_generator.check_token(usuario, token):
            return Response({
                "error": "Token de recuperação inválido ou expirado.",
                "code": "EXPIRED_TOKEN"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Valida os dados da nova senha
        serializer = RedefinirSenhaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "error": "Dados inválidos",
                "details": serializer.errors,
                "code": "VALIDATION_ERROR"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Define a nova senha
        nova_senha = serializer.validated_data['new_password1']
        usuario.set_password(nova_senha)
        usuario.save()
        
        logger.info(f"Senha redefinida com sucesso para o usuário {usuario.username}")
        
        return Response({
            "message": "Senha redefinida com sucesso!",
            "user": {
                "id": usuario.id,
                "username": usuario.username,
                "email": usuario.email,
                "first_name": usuario.first_name,
                "last_name": usuario.last_name
            }
        }, status=status.HTTP_200_OK)






