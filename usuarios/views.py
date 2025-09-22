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
from usuarios.forms import DefinirSenhaForm
from usuarios.serializers import DefinirSenhaSerializer, SolicitarRecuperacaoSenhaSerializer, RedefinirSenhaSerializer
from financeiro.models import Mensalidade
from django.utils import timezone
from datetime import timedelta
from .serializers import UsuarioSerializer, PreCadastroSerializer, MensalidadeSerializer, SalarioSerializer
from datetime import date, timedelta
from django.core.mail import send_mail
import logging
from calendar import monthrange

logger = logging.getLogger(__name__)

class ListarPrecadastrosAPIView(ListCreateAPIView):
    """API para listar e criar pré-cadastros."""
    queryset = PreCadastro.objects.all().order_by('-criado_em')  # Ordena do mais novo para o mais antigo
    serializer_class = PreCadastroSerializer

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
        cpf = request.data.get("cpf")
        dia_vencimento = request.data.get("dia_vencimento")
        valor_mensalidade = request.data.get("valor_mensalidade")
        
        print(f"[DEBUG] Finalizando agendamento - PreCadastro ID: {precadastro_id}")
        print(f"[DEBUG] CPF: {cpf}")
        print(f"[DEBUG] Dia vencimento: {dia_vencimento}")
        print(f"[DEBUG] Valor mensalidade: {valor_mensalidade}")
        print(f"[DEBUG] Data nascimento do pré-cadastro: {precadastro.data_nascimento}")
        
        if not cpf or len(cpf) != 11 or not cpf.isdigit():
            return Response({"error": "CPF inválido ou não fornecido."}, status=status.HTTP_400_BAD_REQUEST)

        precadastro.cpf = cpf
        precadastro.save()
        try:
            usuario_aluno = precadastro.converter_para_aluno(
                request.user,
                dia_vencimento=dia_vencimento,
                valor_mensalidade=valor_mensalidade
            )
            # Cria mensalidade para o novo aluno, se ainda não existir
            if usuario_aluno and not Mensalidade.objects.filter(aluno=usuario_aluno).exists():
                hoje = date.today()
                dia = int(usuario_aluno.dia_vencimento) if usuario_aluno.dia_vencimento else hoje.day
                # Garante que o dia não ultrapasse o último dia do mês
                ultimo_dia = monthrange(hoje.year, hoje.month)[1]
                dia = min(dia, ultimo_dia)
                data_vencimento = hoje.replace(day=dia)
                Mensalidade.objects.create(
                    aluno=usuario_aluno,
                    valor=usuario_aluno.valor_mensalidade or 150.00,
                    data_vencimento=data_vencimento
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
                        "user": UsuarioSerializer(user).data
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


class AtivarContaAPIView(APIView):
    """API para ativar a conta de um aluno."""
    permission_classes = []  # Público para permitir ativação sem autenticação
    
    def post(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            aluno = Usuario.objects.get(pk=uid, tipo="aluno")
        except (Usuario.DoesNotExist, ValueError):
            return Response({
                "error": "Token de ativação inválido ou usuário não encontrado.",
                "code": "INVALID_TOKEN"
            }, status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(aluno, token):
            serializer = DefinirSenhaSerializer(data=request.data)
            if serializer.is_valid():
                # Define a nova senha e ativa a conta
                nova_senha = serializer.validated_data['new_password1']
                aluno.set_password(nova_senha)
                aluno.is_active = True  # Ativa a conta
                aluno.save()
                
                logger.info(f"Conta ativada com sucesso para o usuário {aluno.username}")
                return Response({
                    "message": "Conta ativada com sucesso!",
                    "user": {
                        "id": aluno.id,
                        "username": aluno.username,
                        "email": aluno.email,
                        "first_name": aluno.first_name,
                        "last_name": aluno.last_name
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "Dados inválidos",
                    "details": serializer.errors,
                    "code": "VALIDATION_ERROR"
                }, status=status.HTTP_400_BAD_REQUEST)
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
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
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
            usuario = Usuario.objects.get(id=usuario_id, tipo="aluno")
            
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






