from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from usuarios.models import Usuario




# ---------------------- LOGIN PARA MÚLTIPLOS PERFIS ---------------------- #

def login_view(request):
    if request.method == "POST":
        cpf = request.POST.get("cpf", "").strip().replace(".", "").replace("-", "")  # 🔹 Remove pontos e traços antes de processar
        password = request.POST.get("password", "").strip()

        user = authenticate(request, username=cpf, password=password)

        if user and isinstance(user, Usuario):
            login(request, user)
            return redirect(f"painel_{user.tipo}")

        messages.error(request, "CPF ou senha incorretos.")

    return render(request, "usuarios/login.html")




# ---------------------- LOGOUT ---------------------- #

def logout_view(request):
    logout(request)
    return redirect("login_view")

# ---------------------- PAINÉIS DE USUÁRIOS ---------------------- #




