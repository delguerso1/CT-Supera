from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from .forms import PreCadastroForm
from .models import PreCadastro, Matricula, Presenca, Aluno, Pagamento
from usuarios.models import Usuario
from usuarios.utils import is_gerente, is_gerente_ou_professor, is_aluno
from datetime import date

# === AGENDA AULA EXPERIMENTAL ===

def agendar_aula_experimental(request):
    if request.method == 'POST':
        form = PreCadastroForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Aula experimental agendada com sucesso!")  # Feedback ao usuário
            return redirect('listar_precadastros')  # Melhor que 'sucesso_agendamento', caso não exista
    else:
        form = PreCadastroForm()

    return render(request, 'alunos/agendar_aula_experimental.html', {'form': form})

# === LISTAGEM E GERENCIAMENTO DE PRÉ-CADASTROS ===

@login_required
@user_passes_test(is_gerente_ou_professor)
def listar_precadastros(request):
    precadastros = PreCadastro.objects.all().order_by('-criado_em')
    return render(request, 'alunos/listar_precadastros.html', {'precadastros': precadastros})

@login_required
@user_passes_test(is_gerente_ou_professor)
def atualizar_status_precadastro(request, id_precadastro):
    precadastro = get_object_or_404(PreCadastro, id=id_precadastro)

    if request.method == 'POST':
        novo_status = request.POST.get('status')

        # Verificar se o status informado é válido antes de salvar
        if novo_status in dict(PreCadastro.STATUS_CHOICES).keys():
            precadastro.status = novo_status
        else:
            messages.error(request, "Status inválido.")
            return redirect('listar_precadastros')

        if novo_status == 'compareceu' and hasattr(precadastro, 'finalizar_agendamento'):
            precadastro.finalizar_agendamento()

        if novo_status == 'matriculado':
            if not Usuario.objects.filter(cpf=precadastro.cpf).exists():
                usuario = Usuario.objects.create_user(
                    username=precadastro.cpf.replace(".", "").replace("-", ""),
                    password='senha_inicial123',
                    first_name=precadastro.nome,
                    tipo_usuario='aluno',
                    cpf=precadastro.cpf,
                    telefone=precadastro.telefone,
                    is_active=True,
                )
                
                # 🔹 Criando um objeto `Aluno` vinculado ao `Usuario`
                aluno = Aluno.objects.create(usuario=usuario)

                # 🔹 Criando a matrícula vinculada ao aluno
                Matricula.objects.create(
                    aluno=aluno, 
                    turma=precadastro.turma, 
                    ativo=True
                )

                messages.success(request, 'Aluno matriculado e usuário criado.')
            else:
                messages.info(request, 'Este CPF já possui cadastro.')

        precadastro.save()
        return redirect('listar_precadastros')

    return render(request, 'alunos/atualizar_status_precadastro.html', {'precadastro': precadastro})

# === GESTÃO EXCLUSIVA DE GERENTES ===

@login_required
@user_passes_test(is_gerente)
def gerenciar_precadastros(request):
    precadastros = PreCadastro.objects.all().order_by('-criado_em')
    return render(request, 'alunos/gerenciar_precadastros.html', {'precadastros': precadastros})

@login_required
@user_passes_test(is_gerente)
def confirmar_matricula(request, precadastro_id):
    precadastro = get_object_or_404(PreCadastro, id=precadastro_id)
    precadastro.status = 'matriculado'
    precadastro.save()
    messages.success(request, 'Matrícula confirmada com sucesso.')
    return redirect('gerenciar_precadastros')

@login_required
@user_passes_test(is_gerente)
def recusar_matricula(request, precadastro_id):
    precadastro = get_object_or_404(PreCadastro, id=precadastro_id)
    precadastro.status = 'nao_quiser_matricular'
    precadastro.save()
    messages.info(request, 'Matrícula recusada.')
    return redirect('gerenciar_precadastros')

# === CHECK-IN DE ALUNO ===

@login_required
def realizar_checkin(request):
    usuario = request.user

    try:
        matricula = Matricula.objects.get(aluno=usuario, ativo=True)
    except Matricula.DoesNotExist:
        return render(request, 'alunos/sem_matricula.html')

    if not pagamento_em_dia(usuario):
        return render(request, 'alunos/pendencia_pagamento.html')

    hoje = date.today()
    dia_semana = str(hoje.strftime('%w'))  # Obtém números de 0 a 6

    if dia_semana != str(matricula.turma.dia_semana):  
        return render(request, 'alunos/checkin.html', {'mensagem': "Hoje não é o dia da sua turma."})

    if Presenca.objects.filter(matricula=matricula, data=hoje).exists():
        return render(request, 'alunos/checkin.html', {'mensagem': "Você já realizou o check-in para hoje."})

    if request.method == 'POST':
        Presenca.objects.create(
            matricula=matricula,
            data=hoje,
            hora=matricula.turma.horario
        )
        messages.success(request, "Check-in realizado com sucesso!")
        return redirect('painel_aluno')

    return render(request, 'alunos/checkin.html')

# === VALIDAÇÃO DE PAGAMENTO ===

def pagamento_em_dia(usuario):
    pagamentos_pendentes = Pagamento.objects.filter(aluno=usuario, status="pendente")
    return not pagamentos_pendentes.exists()  # Retorna False se houver pagamentos pendentes

# === PAINEL DO ALUNO ===
@login_required
@user_passes_test(lambda u: u.tipo == "aluno")
def painel_aluno(request):
    usuario = request.user
    aluno = Aluno.objects.filter(usuario=usuario).first()  # 🔹 Busca aluno sem erro 404

    if not aluno:  # 🔹 Se nenhum aluno for encontrado, exibe uma página informativa
        return render(request, "alunos/aluno_nao_encontrado.html", {"usuario": usuario})

    matricula = Matricula.objects.filter(aluno=aluno, ativo=True).first()

    return render(request, "alunos/painel_aluno.html", {
        "aluno": aluno,
        "matricula": matricula,
        "idade": aluno.idade,
    })

@login_required
def atualizar_dados_aluno(request):
    return render(request, "alunos/atualizar_dados_aluno.html")
