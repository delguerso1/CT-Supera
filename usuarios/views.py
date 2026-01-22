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
from turmas.models import DiaSemana
from usuarios.forms import DefinirSenhaForm
from usuarios.serializers import DefinirSenhaSerializer, SolicitarRecuperacaoSenhaSerializer, RedefinirSenhaSerializer
from financeiro.models import Mensalidade
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from .serializers import UsuarioSerializer, PreCadastroSerializer, MensalidadeSerializer, SalarioSerializer
from datetime import date, timedelta
from django.core.mail import send_mail
from django.db import transaction
import logging
from calendar import monthrange

logger = logging.getLogger(__name__)

def criar_mensalidades_matricula(
    aluno,
    valor_mensalidade,
    valor_primeira_mensalidade=None,
    dia_vencimento=None,
    incluir_matricula=True
):
    if not aluno:
        return

    if valor_primeira_mensalidade is None:
        valor_primeira_mensalidade = valor_mensalidade

    mensalidades_pagas = Mensalidade.objects.filter(aluno=aluno, status="pago").exists()
    if not mensalidades_pagas:
        Mensalidade.objects.filter(aluno=aluno).delete()

    hoje = timezone.now().date()
    data_primeiro_vencimento = hoje + timedelta(days=2)
    valor_matricula = Decimal("90.00") if incluir_matricula else Decimal("0.00")
    observacoes = "Inclui R$ 90,00 de matrícula." if incluir_matricula else "Mensalidade inicial sem matrícula."
    Mensalidade.objects.create(
        aluno=aluno,
        valor=valor_primeira_mensalidade + valor_matricula,
        data_vencimento=data_primeiro_vencimento,
        observacoes=observacoes
    )

    dia_venc = dia_vencimento or aluno.dia_vencimento or data_primeiro_vencimento.day
    try:
        dia_venc = int(dia_venc)
    except (TypeError, ValueError):
        dia_venc = data_primeiro_vencimento.day

    base_date = data_primeiro_vencimento
    if base_date.day < dia_venc:
        ano = base_date.year
        mes = base_date.month
    else:
        ano = base_date.year + 1 if base_date.month == 12 else base_date.year
        mes = 1 if base_date.month == 12 else base_date.month + 1

    ultimo_dia = monthrange(ano, mes)[1]
    dia = min(dia_venc, ultimo_dia)
    data_vencimento = date(ano, mes, dia)
    existe = Mensalidade.objects.filter(
        aluno=aluno,
        data_vencimento__year=ano,
        data_vencimento__month=mes
    ).exists()
    if not existe:
        Mensalidade.objects.create(
            aluno=aluno,
            valor=valor_mensalidade,
            data_vencimento=data_vencimento
        )

def criar_mensalidade_proximo_mes(aluno, valor_mensalidade, dia_vencimento=None):
    if not aluno:
        return
    hoje = timezone.now().date()
    ano = hoje.year + 1 if hoje.month == 12 else hoje.year
    mes = 1 if hoje.month == 12 else hoje.month + 1

    dia_venc = dia_vencimento or aluno.dia_vencimento or hoje.day
    try:
        dia_venc = int(dia_venc)
    except (TypeError, ValueError):
        dia_venc = hoje.day

    ultimo_dia = monthrange(ano, mes)[1]
    dia = min(dia_venc, ultimo_dia)
    data_vencimento = date(ano, mes, dia)
    existe = Mensalidade.objects.filter(
        aluno=aluno,
        data_vencimento__year=ano,
        data_vencimento__month=mes
    ).exists()
    if not existe:
        Mensalidade.objects.create(
            aluno=aluno,
            valor=valor_mensalidade,
            data_vencimento=data_vencimento
        )

class ListarPrecadastrosAPIView(ListCreateAPIView):
    """API para listar e criar pré-cadastros. Lista apenas pré-cadastros pendentes."""
    serializer_class = PreCadastroSerializer

    def get_queryset(self):
        # Lista apenas pré-cadastros pendentes (não matriculados)
        return PreCadastro.objects.filter(status='pendente').order_by('-criado_em')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]
    
class EditarExcluirPrecadastroAPIView(RetrieveUpdateDestroyAPIView):
    """API para editar, excluir ou visualizar um pré-cadastro."""
    permission_classes = [IsAuthenticated]
    queryset = PreCadastro.objects.all()
    serializer_class = PreCadastroSerializer


class FinalizarAgendamentoAPIView(APIView):
    """API para finalizar o agendamento de um pré-cadastro."""
    permission_classes = [IsAuthenticated]

    def post(self, request, precadastro_id):
        precadastro = get_object_or_404(PreCadastro, id=precadastro_id)

        cpf = request.data.get("cpf") or precadastro.cpf
        dia_vencimento = request.data.get("dia_vencimento")
        ja_aluno = request.data.get("ja_aluno")
        plano = request.data.get("plano")
        dias_habilitados_ids = request.data.get("dias_habilitados")
        valor_mensalidade = request.data.get("valor_mensalidade")
        valor_primeira_mensalidade = request.data.get("valor_primeira_mensalidade")
        plano_familia = request.data.get("plano_familia")
        
        print(f"[DEBUG] Finalizando agendamento - PreCadastro ID: {precadastro_id}")
        print(f"[DEBUG] Dia vencimento: {dia_vencimento}")
        print(f"[DEBUG] Já é aluno: {ja_aluno}")
        print(f"[DEBUG] Plano: {plano}")
        print(f"[DEBUG] Dias habilitados: {dias_habilitados_ids}")
        print(f"[DEBUG] Valor mensalidade: {valor_mensalidade}")
        print(f"[DEBUG] Valor primeira mensalidade: {valor_primeira_mensalidade}")
        print(f"[DEBUG] Plano família: {plano_familia}")
        print(f"[DEBUG] Data nascimento do pré-cadastro: {precadastro.data_nascimento}")

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

        if plano not in ["3x", "2x", "1x"]:
            return Response({"error": "Plano inválido. Use 3x, 2x ou 1x."}, status=status.HTTP_400_BAD_REQUEST)

        if dias_habilitados_ids is not None:
            if isinstance(dias_habilitados_ids, str):
                dias_habilitados_ids = [d.strip() for d in dias_habilitados_ids.split(",") if d.strip()]
            if not isinstance(dias_habilitados_ids, list):
                return Response({"error": "Dias habilitados inválidos."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                dias_habilitados_ids = [int(dia_id) for dia_id in dias_habilitados_ids]
            except (TypeError, ValueError):
                return Response({"error": "Dias habilitados inválidos."}, status=status.HTTP_400_BAD_REQUEST)

        limite_plano = {"3x": 3, "2x": 2, "1x": 1}[plano]
        if plano in ["1x", "2x"]:
            if not dias_habilitados_ids:
                return Response({"error": "Informe os dias habilitados para o plano selecionado."}, status=status.HTTP_400_BAD_REQUEST)
            if len(dias_habilitados_ids) != limite_plano:
                return Response({"error": f"O plano {plano} exige exatamente {limite_plano} dia(s) habilitado(s)."}, status=status.HTTP_400_BAD_REQUEST)
        elif dias_habilitados_ids and len(dias_habilitados_ids) != limite_plano:
            return Response({"error": f"O plano {plano} exige exatamente {limite_plano} dia(s) habilitado(s)."}, status=status.HTTP_400_BAD_REQUEST)

        dias_habilitados = None
        if dias_habilitados_ids:
            dias_habilitados = list(DiaSemana.objects.filter(id__in=dias_habilitados_ids))
            if len(dias_habilitados) != len(set(dias_habilitados_ids)):
                return Response({"error": "Um ou mais dias habilitados são inválidos."}, status=status.HTTP_400_BAD_REQUEST)
        elif plano == "3x":
            dias_habilitados = list(DiaSemana.objects.all())
            if not dias_habilitados:
                return Response({"error": "Não há dias da semana cadastrados para habilitar o plano."}, status=status.HTTP_400_BAD_REQUEST)

        plano_valores = {
            "3x": Decimal("150.00"),
            "2x": Decimal("130.00"),
            "1x": Decimal("110.00"),
        }

        plano_familia_bool = bool(plano_familia)
        if isinstance(plano_familia, str):
            plano_familia_bool = plano_familia.strip().lower() in ["true", "1", "sim", "yes"]

        desconto_familia = Decimal("10.00") if plano_familia_bool else Decimal("0.00")

        try:
            valor_mensalidade = plano_valores[plano] - desconto_familia
            if not ja_aluno_bool:
                if valor_primeira_mensalidade is not None:
                    valor_primeira_mensalidade = Decimal(str(valor_primeira_mensalidade)) - desconto_familia
                else:
                    valor_primeira_mensalidade = valor_mensalidade
        except (InvalidOperation, TypeError, KeyError):
            return Response({"error": "Valores de mensalidade inválidos."}, status=status.HTTP_400_BAD_REQUEST)

        if valor_mensalidade <= 0 or (not ja_aluno_bool and valor_primeira_mensalidade <= 0):
            return Response({"error": "Valores de mensalidade devem ser maiores que zero."}, status=status.HTTP_400_BAD_REQUEST)

        if ja_aluno_bool:
            precadastro.cpf = cpf
            precadastro.save()

            aluno = precadastro.usuario
            if aluno:
                aluno.dia_vencimento = dia_vencimento
                aluno.valor_mensalidade = valor_mensalidade
                aluno.plano = plano
                aluno.save()
                if dias_habilitados is not None:
                    aluno.dias_habilitados.set(dias_habilitados)
                aluno.atualizar_mensalidades_pendentes()
                criar_mensalidade_proximo_mes(aluno, valor_mensalidade, dia_vencimento)

                precadastro.status = 'matriculado'
                precadastro.save()

                return Response({"message": "Pré-cadastro convertido em aluno com sucesso!"}, status=status.HTTP_200_OK)

            try:
                usuario_aluno = precadastro.converter_para_aluno(
                    request.user,
                    dia_vencimento=dia_vencimento,
                    valor_mensalidade=valor_mensalidade,
                    plano=plano,
                    dias_habilitados=dias_habilitados
                )
                if usuario_aluno:
                    criar_mensalidade_proximo_mes(usuario_aluno, valor_mensalidade, dia_vencimento)
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
                plano=plano,
                dias_habilitados=dias_habilitados
            )
            if usuario_aluno:
                criar_mensalidades_matricula(
                    usuario_aluno,
                    valor_mensalidade=valor_mensalidade,
                    valor_primeira_mensalidade=valor_primeira_mensalidade,
                    dia_vencimento=dia_vencimento
                )
            return Response({"message": "Pré-cadastro convertido em aluno com sucesso!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Erro ao finalizar agendamento: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    """API para realizar login."""
    permission_classes = []  # Remove a necessidade de autenticação

    def post(self, request):
        try:
            cpf = request.data.get("cpf", "").replace(".", "").replace("-", "").strip()
            password = request.data.get("password", "").strip()
            
            print(f"[DEBUG] Dados recebidos - CPF: {cpf}, Senha: {'*' * len(password)}")
            print(f"[DEBUG] Headers da requisição: {request.headers}")
            print(f"[DEBUG] Dados da requisição: {request.data}")
            
            if not cpf or not password:
                print("[DEBUG] CPF ou senha não fornecidos")
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
                    status="pendente"
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
            if instance.tipo == "aluno" and instance.valor_mensalidade:
                criar_mensalidades_matricula(
                    instance,
                    valor_mensalidade=Decimal(str(instance.valor_mensalidade)),
                    valor_primeira_mensalidade=Decimal(str(instance.valor_mensalidade)),
                    dia_vencimento=instance.dia_vencimento
                )
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
            print(f"[DEBUG] Atualizando usuário ID: {instance.id}")
            print(f"[DEBUG] Dados recebidos: {request.data}")
            print(f"[DEBUG] Arquivos recebidos: {request.FILES}")
            
            # Se há arquivos (foto), usa FormData
            if request.FILES:
                print(f"[DEBUG] Processando upload de arquivo")
                # Para upload de arquivo, precisamos incluir todos os dados existentes
                data = request.data.copy()
                
                # Adiciona campos obrigatórios se não estiverem presentes
                if 'username' not in data:
                    data['username'] = instance.username
                if 'tipo' not in data:
                    data['tipo'] = instance.tipo
                if 'cpf' not in data:
                    data['cpf'] = instance.cpf
                if 'ativo' not in data:
                    data['ativo'] = instance.ativo
                if 'email' not in data:
                    data['email'] = instance.email
                if 'first_name' not in data:
                    data['first_name'] = instance.first_name
                if 'last_name' not in data:
                    data['last_name'] = instance.last_name
                
                # Adiciona outros campos se existirem no usuário
                if hasattr(instance, 'telefone') and 'telefone' not in data:
                    data['telefone'] = instance.telefone
                if hasattr(instance, 'endereco') and 'endereco' not in data:
                    data['endereco'] = instance.endereco
                if hasattr(instance, 'data_nascimento') and 'data_nascimento' not in data:
                    data['data_nascimento'] = instance.data_nascimento
                if hasattr(instance, 'nome_responsavel') and 'nome_responsavel' not in data:
                    data['nome_responsavel'] = instance.nome_responsavel
                if hasattr(instance, 'telefone_responsavel') and 'telefone_responsavel' not in data:
                    data['telefone_responsavel'] = instance.telefone_responsavel
                if hasattr(instance, 'telefone_emergencia') and 'telefone_emergencia' not in data:
                    data['telefone_emergencia'] = instance.telefone_emergencia
                if hasattr(instance, 'ficha_medica') and 'ficha_medica' not in data:
                    data['ficha_medica'] = instance.ficha_medica
                if hasattr(instance, 'dia_vencimento') and 'dia_vencimento' not in data:
                    data['dia_vencimento'] = instance.dia_vencimento
                if hasattr(instance, 'valor_mensalidade') and 'valor_mensalidade' not in data:
                    data['valor_mensalidade'] = instance.valor_mensalidade
                
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






