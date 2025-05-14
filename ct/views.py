from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from funcionarios.models import Funcionario
from .models import CentroDeTreinamento
from .forms import CentroDeTreinamentoForm

def verifica_gerente(user):
    """Verifica se o usuário logado é um gerente"""
    try:
        funcionario = Funcionario.objects.get(user=user)
        return funcionario.cargo == "gerente"
    except Funcionario.DoesNotExist:
        return False

@login_required
def lista_ct(request):
    """Lista os Centros de Treinamento (apenas para gerentes)"""
    if not verifica_gerente(request.user):
        return render(request, "403.html")  # Página de acesso negado

    centros = CentroDeTreinamento.objects.all()
    return render(request, "ct/lista_ct.html", {"centros": centros})

@login_required
def criar_ct(request):
    """Criação de um novo Centro de Treinamento (apenas gerentes)"""
    if not verifica_gerente(request.user):
        return render(request, "403.html")

    if request.method == "POST":
        form = CentroDeTreinamentoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("ct:lista_ct")
    else:
        form = CentroDeTreinamentoForm()

    return render(request, "ct/form_ct.html", {"form": form})

@login_required
def editar_ct(request, ct_id):
    """Edição de um CT existente (apenas gerentes)"""
    if not verifica_gerente(request.user):
        return render(request, "403.html")

    ct = get_object_or_404(CentroDeTreinamento, id=ct_id)

    if request.method == "POST":
        form = CentroDeTreinamentoForm(request.POST, instance=ct)
        if form.is_valid():
            form.save()
            return redirect("ct:lista_ct")
    else:
        form = CentroDeTreinamentoForm(instance=ct)

    return render(request, "ct/form_ct.html", {"form": form, "ct": ct})

@login_required
def excluir_ct(request, ct_id):
    """Exclusão de um CT (apenas gerentes)"""
    if not verifica_gerente(request.user):
        return render(request, "403.html")

    ct = get_object_or_404(CentroDeTreinamento, id=ct_id)

    if request.method == "POST":
        ct.delete()
        return redirect("ct:lista_ct")

    return render(request, "ct/excluir_ct.html", {"ct": ct})