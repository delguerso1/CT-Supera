from django.shortcuts import render, redirect
from .forms import PreCadastroForm
from django.contrib.auth.decorators import login_required, user_passes_test
from django.shortcuts import get_object_or_404
from .models import PreCadastro, Matricula, Presenca, Pagamento
from usuarios.models import Usuario
from datetime import date
from turmas.models import Turma

def agendar_aula_experimental(request):
    if request.method == 'POST':
        form = PreCadastroForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('sucesso_agendamento')
    else:
        form = PreCadastroForm()

    return render(request, 'alunos/agendar_aula_experimental.html', {'form': form})


# verifica se o usuário é gerente ou funcionário
def is_gerente_ou_funcionario(user):
    return user.is_authenticated and (user.tipo_usuario in ['gerente', 'funcionario'])

@login_required
@user_passes_test(is_gerente_ou_funcionario)
def listar_precadastros(request):
    precadastros = PreCadastro.objects.all().order_by('-criado_em')
    return render(request, 'alunos/listar_precadastros.html', {'precadastros': precadastros})

# alunos/views.py (continuação)

@login_required
@user_passes_test(is_gerente_ou_funcionario)
def atualizar_status_precadastro(request, id_precadastro):
    precadastro = get_object_or_404(PreCadastro, id=id_precadastro)

    if request.method == 'POST':
        novo_status = request.POST.get('status')
        precadastro.status = novo_status

        if novo_status == 'compareceu':
            precadastro.finalizar_agendamento()

        precadastro.save()
        return redirect('listar_precadastros')

    return render(request, 'alunos/atualizar_status.html', {'precadastro': precadastro})


@login_required
@user_passes_test(is_gerente_ou_funcionario)
def atualizar_status_precadastro(request, id_precadastro):
    precadastro = get_object_or_404(PreCadastro, id=id_precadastro)
    
    if request.method == 'POST':
        novo_status = request.POST.get('status')
        precadastro.status = novo_status
        precadastro.save()

        if novo_status == 'matriculado':
            if not Usuario.objects.filter(cpf=precadastro.cpf).exists():
                usuario = Usuario.objects.create_user(
                    username=precadastro.cpf.replace(".", "").replace("-", ""),
                    password='senha_inicial123',  # Senha inicial
                    first_name=precadastro.nome,
                    tipo_usuario='aluno',
                    cpf=precadastro.cpf,
                    telefone=precadastro.telefone,
                    is_active=True,
                )
                # Criar matrícula
                Matricula.objects.create(
                    aluno=usuario,
                    turma=precadastro.turma,
                    ativo=True
                )

        return redirect('listar_precadastros')

    return render(request, 'alunos/atualizar_status.html', {'precadastro': precadastro})


# alunos/views.py

@login_required
def realizar_checkin(request):
    usuario = request.user
    try:
        matricula = Matricula.objects.get(aluno=usuario, ativo=True)
    except Matricula.DoesNotExist:
        return render(request, 'alunos/sem_matricula.html')

    # Verificar se o pagamento está em dia
    if not pagamento_em_dia(usuario):
        return render(request, 'alunos/pendencia_pagamento.html')

    hoje = date.today()
    dia_semana = hoje.strftime('%A').lower()

    if dia_semana != matricula.turma.dia_semana:
        mensagem = "Hoje não é o dia da sua turma."
        return render(request, 'alunos/checkin.html', {'mensagem': mensagem})

    # Verificar se já existe um check-in para hoje
    if Presenca.objects.filter(matricula=matricula, data=hoje).exists():
        mensagem = "Você já realizou o check-in para hoje."
        return render(request, 'alunos/checkin.html', {'mensagem': mensagem})

    if request.method == 'POST':
        Presenca.objects.create(
            matricula=matricula,
            data=hoje,
            hora=matricula.turma.horario
        )
        mensagem = "Check-in realizado com sucesso!"
        return render(request, 'alunos/checkin.html', {'mensagem': mensagem})

    return render(request, 'alunos/checkin.html')

def pagamento_em_dia(usuario):
    """Função fictícia para verificar se o pagamento está em dia"""
    # Aqui seria implementada a lógica para verificar o pagamento, 
    # como uma verificação em uma tabela de pagamentos ou algo semelhante.
    return True  # Isso deve ser ajustado conforme a lógica do seu sistema de pagamento.


def is_gerente(user):
    return user.is_authenticated and user.tipo_usuario == 'gerente'  # supondo que você tem isso no modelo de usuário

@login_required
@user_passes_test(is_gerente)
def gerenciar_precadastros(request):
    precadastros = PreCadastro.objects.all().order_by('-criado_em')
    return render(request, 'alunos/gerenciar_precadastros.html', {'precadastros': precadastros})

@login_required
@user_passes_test(is_gerente)
def confirmar_matricula(request, precadastro_id):
    precadastro = PreCadastro.objects.get(id=precadastro_id)
    precadastro.status = 'matriculado'
    precadastro.save()
    return redirect('gerenciar_precadastros')

@login_required
@user_passes_test(is_gerente)
def recusar_matricula(request, precadastro_id):
    precadastro = PreCadastro.objects.get(id=precadastro_id)
    precadastro.status = 'nao_quiser_matricular'
    precadastro.save()
    return redirect('gerenciar_precadastros')

def aluno_login(request):
    return render(request, 'alunos/login.html')