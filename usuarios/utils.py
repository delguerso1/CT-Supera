
from django.contrib.auth import authenticate, login
from django.contrib import messages

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
