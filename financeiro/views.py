from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Mensalidade
from .forms import MensalidadeForm
from alunos.models import Aluno
from funcionarios.models import Funcionario
from django.http import HttpResponseForbidden
from django.db.models import Sum
from datetime import datetime

@login_required
def listar_mensalidades(request):
    # Obtém o CT do gerente logado
    funcionario = Funcionario.objects.get(user=request.user)
    ct = funcionario.ct

    # Filtra os alunos apenas do CT do gerente
    alunos = Aluno.objects.filter(ct=ct)
    mensalidades = Mensalidade.objects.filter(aluno__ct=ct)

    # Filtros GET
    status = request.GET.get('status')
    aluno_id = request.GET.get('aluno')

    if status:
        mensalidades = mensalidades.filter(status=status)

    if aluno_id:
        mensalidades = mensalidades.filter(aluno__id=aluno_id)

    return render(request, 'financeiro/listar_mensalidades.html', {
        'mensalidades': mensalidades,
        'alunos': alunos,
        'status_atual': status,
        'aluno_atual': int(aluno_id) if aluno_id else None,
    })

@login_required
def registrar_mensalidade(request):
    if request.user.tipo_usuario != 'gerente':
        return render(request, '403.html')
    if request.method == 'POST':
        form = MensalidadeForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('financeiro:listar_mensalidades')
    else:
        form = MensalidadeForm()
    return render(request, 'financeiro/form_mensalidade.html', {'form': form})


@login_required
def editar_mensalidade(request, mensalidade_id):
    mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id)

    if request.method == 'POST':
        form = MensalidadeForm(request.POST, instance=mensalidade)
        if form.is_valid():
            form.save()
            return redirect('financeiro:listar_mensalidades')
    else:
        form = MensalidadeForm(instance=mensalidade)

    return render(request, 'financeiro/form_mensalidade.html', {'form': form, 'mensalidade': mensalidade})

@login_required
def excluir_mensalidade(request, mensalidade_id):
    mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id)

    if request.method == 'POST':
        mensalidade.delete()
        return redirect('financeiro:listar_mensalidades')

    return render(request, 'financeiro/confirmar_exclusao.html', {'mensalidade': mensalidade})

@login_required
def visualizar_recibo(request, mensalidade_id):
    mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id)

    if request.user.tipo_usuario != 'gerente' and mensalidade.aluno.user != request.user:
        return HttpResponseForbidden("Você não tem permissão para visualizar este recibo.")

    if mensalidade.status != 'pago':
        return HttpResponseForbidden("Recibo disponível apenas para mensalidades pagas.")

    return render(request, 'financeiro/recibo.html', {'mensalidade': mensalidade})


@login_required
def dashboard_financeiro(request):
    if request.user.tipo_usuario != 'gerente':
        return render(request, '403.html')

    # Filtros por mês e ano
    mes = request.GET.get('mes', datetime.now().month)
    ano = request.GET.get('ano', datetime.now().year)

    mensalidades = Mensalidade.objects.filter(data_vencimento__month=mes, data_vencimento__year=ano)

    total_pago = mensalidades.filter(status='pago').aggregate(Sum('valor'))['valor__sum'] or 0
    total_pendente = mensalidades.filter(status='pendente').aggregate(Sum('valor'))['valor__sum'] or 0
    total_geral = mensalidades.aggregate(Sum('valor'))['valor__sum'] or 0

    context = {
        'total_pago': total_pago,
        'total_pendente': total_pendente,
        'total_geral': total_geral,
        'mes_atual': int(mes),
        'ano_atual': int(ano),
    }
    return render(request, 'financeiro/dashboard.html', context)