from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Mensalidade, Despesa
from .forms import MensalidadeForm, DespesaForm
from alunos.models import Aluno
from funcionarios.models import Funcionario
from django.db.models import Sum
from django.utils import timezone
from django.http import HttpResponseForbidden


@login_required
def listar_mensalidades(request):
    """Lista mensalidades do CT do gerente logado."""
    try:
        funcionario = Funcionario.objects.get(user=request.user)
        ct = funcionario.ct
    except Funcionario.DoesNotExist:
        return render(request, "403.html")  # Bloqueia se não for funcionário

    alunos = Aluno.objects.filter(ct=ct)
    mensalidades = Mensalidade.objects.filter(aluno__ct=ct)

    # Filtros GET
    status = request.GET.get("status")
    aluno_id = request.GET.get("aluno")

    if status:
        mensalidades = mensalidades.filter(status=status)

    if aluno_id:
        mensalidades = mensalidades.filter(aluno__id=aluno_id)

    return render(request, "financeiro/listar_mensalidades.html", {
        "mensalidades": mensalidades,
        "alunos": alunos,
        "status_atual": status,
        "aluno_atual": int(aluno_id) if aluno_id else None,
    })

@login_required
def registrar_mensalidade(request):
    """Registro de nova mensalidade (apenas gerentes)."""
    if request.user.tipo_usuario != "gerente":
        return render(request, "403.html")

    if request.method == "POST":
        form = MensalidadeForm(request.POST, user=request.user)
        if form.is_valid():
            form.save()
            return redirect("financeiro:listar_mensalidades")
    else:
        form = MensalidadeForm(user=request.user)

    return render(request, "financeiro/form_mensalidade.html", {"form": form})

@login_required
def editar_mensalidade(request, mensalidade_id):
    """Edição de mensalidade."""
    mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id)

    if request.method == "POST":
        form = MensalidadeForm(request.POST, instance=mensalidade, user=request.user)
        if form.is_valid():
            form.save()
            return redirect("financeiro:listar_mensalidades")
    else:
        form = MensalidadeForm(instance=mensalidade, user=request.user)

    return render(request, "financeiro/form_mensalidade.html", {"form": form, "mensalidade": mensalidade})

@login_required
def excluir_mensalidade(request, mensalidade_id):
    """Exclui uma mensalidade existente."""
    mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id)

    if request.method == "POST":
        mensalidade.delete()
        return redirect("financeiro:listar_mensalidades")

    return render(request, "financeiro/excluir_mensalidade.html", {"mensalidade": mensalidade})

@login_required
def visualizar_recibo(request, mensalidade_id):
    """Exibe o recibo de uma mensalidade paga."""
    mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id)

    if request.user.tipo_usuario != "gerente" and mensalidade.aluno.user != request.user:
        return HttpResponseForbidden("Você não tem permissão para visualizar este recibo.")

    if mensalidade.status != "pago":
        return HttpResponseForbidden("Recibo disponível apenas para mensalidades pagas.")

    return render(request, "financeiro/recibo.html", {"mensalidade": mensalidade})

@login_required
def listar_despesas(request):
    """Lista todas as despesas do sistema."""
    try:
        funcionario = Funcionario.objects.get(user=request.user)
        if funcionario.cargo != 'gerente':
            return render(request, "403.html")
    except Funcionario.DoesNotExist:
        return render(request, "403.html")

    despesas = Despesa.objects.all()
    return render(request, "financeiro/listar_despesas.html", {"despesas": despesas})

@login_required
def registrar_despesa(request):
    """Registra uma nova despesa."""
    if request.method == "POST":
        form = DespesaForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("financeiro:listar_despesas")
    else:
        form = DespesaForm()

    return render(request, "financeiro/form_despesa.html", {"form": form})

@login_required
def editar_despesa(request, despesa_id):
    """Edita uma despesa existente."""
    despesa = get_object_or_404(Despesa, id=despesa_id)

    if request.method == "POST":
        form = DespesaForm(request.POST, instance=despesa)
        if form.is_valid():
            form.save()
            return redirect("financeiro:listar_despesas")
    else:
        form = DespesaForm(instance=despesa)

    return render(request, "financeiro/form_despesa.html", {"form": form, "despesa": despesa})

@login_required
def excluir_despesa(request, despesa_id):
    """Exclui uma despesa."""
    despesa = get_object_or_404(Despesa, id=despesa_id)

    if request.method == "POST":
        despesa.delete()
        return redirect("financeiro:listar_despesas")

    return render(request, "financeiro/confirmar_exclusao.html", {"despesa": despesa})



@login_required
def dashboard_financeiro(request):
    """Painel financeiro com totais do mês."""
    try:
        funcionario = Funcionario.objects.get(user=request.user)
        if funcionario.cargo != 'gerente':
            return render(request, "403.html")
    except Funcionario.DoesNotExist:
        return render(request, "403.html")

    mes = request.GET.get("mes")
    ano = request.GET.get("ano")

    # Se não houver parâmetros, usa o mês e ano atual
    if not mes:
        mes = timezone.now().month
    if not ano:
        ano = timezone.now().year

    # Converte para inteiro
    mes = int(mes)
    ano = int(ano)

    mensalidades = Mensalidade.objects.filter(data_vencimento__month=mes, data_vencimento__year=ano)
    despesas = Despesa.objects.filter(data__month=mes, data__year=ano)

    total_pago = mensalidades.filter(status="pago").aggregate(Sum("valor"))["valor__sum"] or 0
    total_pendente = mensalidades.filter(status="pendente").aggregate(Sum("valor"))["valor__sum"] or 0
    total_atrasado = mensalidades.filter(status="atrasado").aggregate(Sum("valor"))["valor__sum"] or 0
    total_geral = mensalidades.aggregate(Sum("valor"))["valor__sum"] or 0
    total_despesas = despesas.aggregate(Sum("valor"))["valor__sum"] or 0

    saldo_final = total_pago - total_despesas  # Calcula saldo do mês

    context = {
        "total_pago": total_pago,
        "total_pendente": total_pendente,
        "total_atrasado": total_atrasado,
        "total_geral": total_geral,
        "total_despesas": total_despesas,
        "saldo_final": saldo_final,
        "mes_atual": int(mes),
        "ano_atual": int(ano),
    }
    return render(request, "financeiro/dashboard.html", context)
