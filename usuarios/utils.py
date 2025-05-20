
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
import random
import string


def autenticar_usuario(request, tipo_esperado):
    username = request.POST.get('username')
    password = request.POST.get('password')
    user = authenticate(request, username=username, password=password)

    if user and user.tipo == tipo_esperado:
        login(request, user)
        return user
    else:
        messages.error(request, 'Usuário ou senha inválidos.')
        return None

def is_gerente(user):
    return user.is_authenticated and user.tipo == 'gerente'

def is_professor(user):
    return user.is_authenticated and user.tipo == 'funcionario'

def is_aluno(user):
    return user.is_authenticated and user.tipo == 'aluno'

def is_gerente_ou_professor(user):
    return user.is_authenticated and user.tipo in ['gerente', 'funcionario']



#=== criação de senha por convite de ativação ===#
def enviar_convite_aluno(aluno):
    """Gera um link de ativação e envia por e-mail para o aluno"""
    uidb64 = urlsafe_base64_encode(force_bytes(aluno.pk))
    token = default_token_generator.make_token(aluno)

    link_ativacao = f"https://meusistema.com/ativar-conta/{uidb64}/{token}/"

    mensagem = f"""
    Olá {aluno.first_name}, seja bem-vindo ao sistema! 🚀

    🔗 Clique no link abaixo para ativar sua conta e definir sua senha:
    {link_ativacao}

    Qualquer dúvida, estamos à disposição. 🤝
    """

    send_mail(
        "Ativação da sua conta",
        mensagem,
        "sistema@meusistema.com",
        [aluno.email],
        fail_silently=False
    )


def gerar_senha_temporaria():
    """Gera uma senha aleatória segura"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=12))