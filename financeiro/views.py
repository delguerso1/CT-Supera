from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.utils import timezone
from django.http import HttpResponseForbidden
from .models import Mensalidade, Despesa
from .forms import MensalidadeForm, DespesaForm
from usuarios.models import Usuario

@login_required
def listar_mensalidades(request):
    """Lista mensalidades do CT do gerente logado."""
    try:
        gerente = Usuario.objects.get(id=request.user.id, tipo="gerente")  # 🔹 Busca gerente diretamente
    except Usuario.DoesNotExist:
        return render(request, "404.html")  # 🔹 Bloqueia se não for gerente

    # 🔹 Agora buscamos alunos diretamente do modelo `Usuario`
    alunos = Usuario.objects.filter(tipo="aluno", ct=gerente.ct)
    mensalidades = Mensalidade.objects.filter(aluno__in=alunos)  # 🔹 Busca mensalidades associadas aos alunos

    # 🔹 Aplicação de filtros GET
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
    if request.user.tipo != "gerente":
        return render(request, "404.html")

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

    if request.user.tipo != "gerente" and mensalidade.aluno.user != request.user:
        return HttpResponseForbidden("Você não tem permissão para visualizar este recibo.")

    if mensalidade.status != "pago":
        return HttpResponseForbidden("Recibo disponível apenas para mensalidades pagas.")

    return render(request, "financeiro/recibo.html", {"mensalidade": mensalidade})

@login_required
def listar_despesas(request):
    """Lista todas as despesas do sistema."""
    try:
        gerente = Usuario.objects.get(id=request.user.id, tipo="gerente")  # 🔹 Substituí `Funcionario`
    except Usuario.DoesNotExist:
        return render(request, "403.html")  # Bloqueia se não for gerente

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
    
    # 🔹 Verifica se o usuário tem permissão
    if request.user.tipo != "gerente":
        return render(request, "404.html")
    
    # 🔹 Obtém o mês e ano dos parâmetros GET, com proteção contra erro de conversão
    try:
        mes = int(request.GET.get("mes", timezone.now().month))
        ano = int(request.GET.get("ano", timezone.now().year))
    except ValueError:
        mes = timezone.now().month
        ano = timezone.now().year

    # 🔹 Filtra mensalidades e despesas do período
    mensalidades = Mensalidade.objects.filter(data_vencimento__month=mes, data_vencimento__year=ano)
    despesas = Despesa.objects.filter(data__month=mes, data__year=ano)

    # 🔹 Calcula totais protegendo contra valores `None`
    total_pago = mensalidades.filter(status="pago").aggregate(Sum("valor"))["valor__sum"] or 0
    total_pendente = mensalidades.filter(status="pendente").aggregate(Sum("valor"))["valor__sum"] or 0
    total_atrasado = mensalidades.filter(status="atrasado").aggregate(Sum("valor"))["valor__sum"] or 0
    total_despesas = despesas.aggregate(Sum("valor"))["valor__sum"] or 0
    saldo_final = total_pago - total_despesas  # 🔹 Protegido contra erro de soma com `None`

    # 🔹 Passa os dados para o template
    return render(request, "financeiro/dashboard_financeiro.html", {
        "total_pago": total_pago,
        "total_pendente": total_pendente,
        "total_atrasado": total_atrasado,
        "total_despesas": total_despesas,
        "saldo_final": saldo_final,
        "mes_atual": mes,
        "ano_atual": ano,
        "meses": list(range(1, 13)),  # 🔹 Garante que o template tenha a lista correta de meses
    })

@login_required
def relatorio_financeiro(request):
    """Gera um relatório financeiro com mensalidades e despesas."""
    try:
        gerente = Usuario.objects.get(id=request.user.id, tipo="gerente")  # 🔹 Busca gerente diretamente
    except Usuario.DoesNotExist:
        return render(request, "404.html")


