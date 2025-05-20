from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from usuarios.models import Usuario
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from usuarios.forms import UsuarioForm, PreCadastroForm
from django.contrib.auth.decorators import login_required
from usuarios.models import PreCadastro
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password



# === AGENDA AULA EXPERIMENTAL ===
def agendar_aula_experimental(request):
    """Permite que um usuário agende uma aula experimental. O formulário é exibido e, se válido, salva o agendamento."""
    if request.method == 'POST':
        form = PreCadastroForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "✅ Aula experimental agendada com sucesso!")
            return redirect('home')
    else:
        form = PreCadastroForm()

    return render(request, 'usuarios/agendar_aula_experimental.html', {'form': form})

def listar_precadastros(request):
    """Lista todos os pré-cadastros. Apenas gerentes podem acessar essa página."""
    if not request.user.is_gerente():
        return render(request, '403.html')

    precadastros = PreCadastro.objects.all()
    return render(request, 'usuarios/listar_precadastros.html', {'precadastros': precadastros})

def excluir_precadastro(request, pk):
    """Exclui um pré-cadastro específico. Apenas gerentes podem acessar essa página."""
    if not request.user.is_gerente():
        return render(request, '403.html')

    precadastro = get_object_or_404(PreCadastro, pk=pk)

    if request.method == 'POST':
        precadastro.delete()
        messages.success(request, "✅ Pré-cadastro excluído com sucesso!")
        return redirect('listar_precadastros')

    return render(request, 'usuarios/excluir_precadastro.html', {'precadastro': precadastro})

def editar_precadastro(request, pk):
    """Atualiza os dados de um pré-cadastro específico. Apenas gerentes podem acessar essa página."""
    if not request.user.is_gerente():
        return render(request, '403.html')

    precadastro = get_object_or_404(PreCadastro, pk=pk)

    if request.method == 'POST':
        form = PreCadastroForm(request.POST, instance=precadastro)
        if form.is_valid():
            form.save()
            messages.success(request, "✅ Pré-cadastro atualizado com sucesso!")
            return redirect('listar_precadastros')
    else:
        form = PreCadastroForm(instance=precadastro)

    return render(request, 'usuarios/editar_precadastro.html', {'form': form, 'precadastro': precadastro})

def cadastrar_precadastro(request):
    """Permite que um usuário se cadastre como pré-cadastro. O formulário é exibido e, se válido, salva o pré-cadastro."""
    if request.method == 'POST':
        form = PreCadastroForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "✅ Pré-cadastro realizado com sucesso!")
            return redirect('listar_precadastros')
    else:
        form = PreCadastroForm()

    return render(request, 'usuarios/cadastrar_precadastro.html', {'form': form})


# ---------------------- LOGIN PARA MÚLTIPLOS PERFIS ---------------------- #

def login_view(request):
    if request.method == "POST":
        cpf = request.POST.get("cpf", "").replace(".", "").replace("-", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=cpf, password=password)
        if user is not None:
            login(request, user)
            if user.tipo == "gerente":
                return redirect("funcionarios:painel_gerente")
            elif user.tipo == "professor":
                return redirect("funcionarios:painel_professor")
            elif user.tipo == "aluno":
                return redirect("alunos:painel_aluno")
            else:
                return redirect("usuarios:login")
        else:
            messages.error(request, "CPF ou senha inválidos.")
    return render(request, "usuarios/login.html")


# ---------------------- LOGOUT ---------------------- #

def logout_view(request):
    logout(request)
    return redirect("home")

# --------------------Ativação por Token -------------------#

def ativar_conta(request, uidb64, token):
    """Permite o aluno definir sua senha ao ativar a conta"""
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        aluno = Usuario.objects.get(pk=uid, tipo="aluno")
    except (Usuario.DoesNotExist, ValueError):
        return render(request, "usuarios/ativacao_invalida.html")

    if default_token_generator.check_token(aluno, token):
        if request.method == "POST":
            form = SetPasswordForm(aluno, request.POST)
            if form.is_valid():
                form.save()
                return redirect("login")
        else:
            form = SetPasswordForm(aluno)
        return render(request, "usuarios/definir_senha.html", {"form": form})
    else:
        return render(request, "usuarios/ativacao_invalida.html")


#--------------------- CRUD DE USUÁRIOS ---------------------#

@login_required
def cadastrar_usuario(request):
    if not request.user.is_gerente():
        return render(request, "403.html")

    usuario = Usuario()  # 🔹 Cria um objeto vazio para instância

    if request.method == "POST":
        form = UsuarioForm(request.POST, instance=usuario)  # 🔹 Passa `instance` para ajustar campos obrigatórios
        if form.is_valid():
            usuario = form.save(commit=False)
            usuario.password = make_password(form.cleaned_data["password"])  # 🔹 Garante que a senha seja segura
            usuario.save()

            messages.success(request, "Usuário cadastrado com sucesso!")

            # 🔹 Enviar e-mail de boas-vindas
            if usuario.email:
                mensagem = f"""
                Olá {usuario.nome}, bem-vindo ao sistema! 🎉

                ✅ Seus dados de acesso:
                - Usuário: {usuario.username} (CPF)
                - Senha: {form.cleaned_data['password']} (mude no primeiro acesso!)

                🔗 Acesse: https://meusistema.com/login
                """
                send_mail(
                    "Seus dados de acesso ao sistema",
                    mensagem,
                    "contato@meusistema.com",  # 🔹 Email do remetente
                    [usuario.email],  # 🔹 Email do usuário cadastrado
                    fail_silently=False,
                )

            return redirect("usuarios:lista_usuarios")
    else:
        form = UsuarioForm(instance=usuario)  # 🔹 Ajusta os campos dinâmicos antes do envio

    return render(request, "usuarios/cadastrar_usuario.html", {"form": form})

@login_required
def editar_usuario(request, usuario_id):
    if not request.user.is_gerente():
        return render(request, '403.html')

    usuario = get_object_or_404(Usuario, id=usuario_id)

    if request.method == 'POST':
        form = UsuarioForm(request.POST, instance=usuario)
        if form.is_valid():
            form.save()
            messages.success(request, 'Usuário atualizado com sucesso.')
            return redirect('usuarios:lista_usuarios')
    else:
        form = UsuarioForm(instance=usuario)

    return render(request, 'usuarios/editar_usuario.html', {'form': form, 'usuario': usuario})

@login_required
def excluir_usuario(request, usuario_id):
    if not request.user.is_gerente():
        return render(request, '403.html')

    usuario = get_object_or_404(Usuario, id=usuario_id)

    if request.method == 'POST':
        usuario.delete()
        messages.success(request, 'Usuário excluído com sucesso.')
        return redirect('usuarios:lista_usuarios')

    return render(request, 'usuarios/excluir_usuario.html', {'usuario': usuario})

@login_required
def lista_usuarios(request):
    if not request.user.is_gerente():
        return render(request, '403.html')

    gerentes = Usuario.objects.filter(tipo='gerente')
    professores = Usuario.objects.filter(tipo='professor')
    alunos = Usuario.objects.filter(tipo='aluno')

    return render(
        request,
        "usuarios/lista_usuarios.html",
        {
            "gerentes": gerentes,
            "professores": professores,
            "alunos": alunos,
        }
    )






