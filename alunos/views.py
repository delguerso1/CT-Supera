from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from usuarios.models import Usuario
from financeiro.models import Mensalidade
from .forms import AlunoPerfilForm
from datetime import date
from funcionarios.models import Presenca

# === PAINEL DO ALUNO ===
@login_required
def painel_aluno(request):
    """Página principal do aluno, com histórico e ações disponíveis."""
    usuario = request.user
    historico_aulas = Presenca.objects.filter(usuario=usuario).order_by('-data')
    historico_pagamentos = Mensalidade.objects.filter(aluno=usuario).order_by('-vencimento')

    return render(request, "alunos/painel_aluno.html", {
        "usuario": usuario,
        "historico_aulas": historico_aulas,
        "historico_pagamentos": historico_pagamentos,
        "pagamento_ok": pagamento_em_dia(Usuario),  # 🔹 Verifica pagamento
    })

# === EDIÇÃO DE PERFIL ===
@login_required
def editar_perfil_aluno(request):
    """Permite que o aluno edite suas informações pessoais."""
    aluno = request.user

    if request.method == 'POST':
        form = AlunoPerfilForm(request.POST, instance=aluno)
        if form.is_valid():
            form.save()
            messages.success(request, "✅ Dados atualizados com sucesso!")
            return redirect('painel_aluno')
    else:
        form = AlunoPerfilForm(instance=aluno)

    return render(request, "alunos/editar_perfil.html", {"form": form})

# === CHECK-IN DE ALUNO ===
@login_required
def realizar_checkin(request):
    """Aluno realiza check-in apenas se pagamento estiver em dia."""
    usuario = request.user

    if not pagamento_em_dia(usuario):
        return render(request, 'alunos/pendencia_pagamento.html')

    hoje = date.today()

    if Presenca.objects.filter(usuario=usuario, data=hoje).exists():
        return render(request, 'alunos/checkin.html', {'mensagem': "✅ Você já realizou o check-in para hoje."})

    if request.method == 'POST':
        Presenca.objects.create(usuario=usuario, data=hoje)
        messages.success(request, "✅ Check-in realizado com sucesso!")
        return redirect('painel_aluno')

    return render(request, 'alunos/checkin.html')

# === PAGAMENTO === #

@login_required
def historico_pagamentos(request):
    """Exibe todas as mensalidades do aluno, separadas por status."""
    aluno = request.user
    mensalidades_vencidas = Mensalidade.objects.filter(aluno=aluno, status="pendente", vencimento__lt=date.today())
    mensalidades_vincendas = Mensalidade.objects.filter(aluno=aluno, status="pendente", vencimento__gte=date.today())
    mensalidades_pagas = Mensalidade.objects.filter(aluno=aluno, status="pago")

    return render(request, "alunos/historico_pagamentos.html", {
        "mensalidades_vencidas": mensalidades_vencidas,
        "mensalidades_vincendas": mensalidades_vincendas,
        "mensalidades_pagas": mensalidades_pagas
    })

@login_required
def pagamento_em_dia(usuario):


    """Verifica se o aluno está com a mensalidade em dia."""
    return not Mensalidade.objects.filter(aluno=usuario, status="pendente").exists()

@login_required
def realizar_pagamento(request, mensalidade_id):
    """Permite que o aluno pague uma mensalidade pendente."""
    mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id, aluno=request.user)

    if mensalidade.status == "pago":
        messages.error(request, "✅ Esta mensalidade já foi paga!")
        return redirect("historico_pagamentos")

    if request.method == "POST":
        mensalidade.status = "pago"
        mensalidade.save()
        messages.success(request, "✅ Pagamento realizado com sucesso!")
        return redirect("historico_pagamentos")

    return render(request, "alunos/pagamento_mensalidade.html", {"mensalidade": mensalidade})