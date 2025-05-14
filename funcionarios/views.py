from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from .forms import CadastroFuncionarioForm
from .models import Funcionario
from django.contrib import messages
from turmas.models import Turma
from alunos.models import Matricula, Presenca, Pagamento
from datetime import date
from usuarios.utils import is_professor, is_gerente
from django.http import HttpResponseForbidden


@login_required
def cadastrar_funcionario(request):
    if not request.user.is_gerente():
        return render(request, '403.html')

    if request.method == 'POST':
        form = CadastroFuncionarioForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('lista_funcionarios')
    else:
        form = CadastroFuncionarioForm()
    
    return render(request, 'funcionarios/cadastrar_funcionario.html', {'form': form})

@login_required
def editar_funcionario(request, funcionario_id):
    if not request.user.is_gerente():
        return render(request, '403.html')

    funcionario = get_object_or_404(Funcionario, id=funcionario_id)

    if request.method == 'POST':
        form = CadastroFuncionarioForm(request.POST, instance=funcionario)
        if form.is_valid():
            form.save()
            messages.success(request, 'Funcionário atualizado com sucesso.')
            return redirect('lista_funcionarios')
    else:
        form = CadastroFuncionarioForm(instance=funcionario, initial={
            'email': funcionario.user.email,
        })

    return render(request, 'funcionarios/editar_funcionario.html', {'form': form, 'funcionario': funcionario})

@login_required
def excluir_funcionario(request, funcionario_id):
    if not request.user.is_gerente():
        return render(request, '403.html')

    funcionario = get_object_or_404(Funcionario, id=funcionario_id)

    if request.method == 'POST':
        funcionario.user.delete()
        funcionario.delete()
        messages.success(request, 'Funcionário excluído com sucesso.')
        return redirect('lista_funcionarios')

    return render(request, 'funcionarios/excluir_funcionario.html', {'funcionario': funcionario})

@login_required
def lista_funcionarios(request):
    if not request.user.is_gerente():
        return render(request, '403.html')
    funcionarios = Funcionario.objects.all()
    return render(request, 'funcionarios/lista_funcionarios.html', {'funcionarios': funcionarios})


@login_required
@user_passes_test(lambda u: is_professor(u) or is_gerente(u))  
def registrar_presenca(request, turma_id):
    turma = get_object_or_404(Turma, id=turma_id, professor=request.user)
    hoje = date.today()
    matriculas = Matricula.objects.filter(turma=turma, ativo=True)

    if request.method == 'POST':
        alunos_presentes = request.POST.getlist('presenca')
        for matricula in matriculas:
            if str(matricula.id) in alunos_presentes:
                Presenca.objects.get_or_create(
                    matricula=matricula,
                    data=hoje,
                    defaults={'hora': turma.horario}
                )
        return redirect('painel_funcionario')

    return render(request, 'funcionarios/registrar_presenca.html', {
        'turma': turma,
        'matriculas': matriculas,
        'hoje': hoje,
    })



@login_required
@user_passes_test(lambda u: u.tipo == "professor")
def painel_professor(request):
    professor = Funcionario.objects.filter(user=request.user).first()
    
    if not professor:
        return HttpResponseForbidden("Acesso negado. Você não é um professor.")
    
    return render(request, "funcionarios/painel_professor.html", {"professor": professor})

@login_required
def atualizar_dados_professor(request):
    professor = Funcionario.objects.get(user=request.user)

    if request.method == "POST":
        professor.nome = request.POST["nome"]
        professor.usuario.email = request.POST["email"]
        professor.telefone = request.POST["telefone"]
        professor.usuario.save()
        professor.save()
        return redirect("painel_professor")

    return render(request, "funcionarios/atualizar_dados_professor.html", {"professor": professor})




@login_required
@user_passes_test(is_gerente)
def painel_gerente(request):
    if request.user.tipo != "gerente":
        return HttpResponseForbidden("Acesso negado.")

    alunos_ativos = Matricula.objects.filter(ativo=True).count()
    
    # 🔹 Agora filtra corretamente funcionários ativos
    professores = Funcionario.objects.filter(cargo="professor", ativo=True).count()  

    hoje = date.today()
    pagamentos_mes = Pagamento.objects.filter(data__month=hoje.month, data__year=hoje.year).count()

    return render(request, "funcionarios/painel_gerente.html", {
        "alunos_ativos": alunos_ativos,
        "professores": professores,
        "pagamentos_mes": pagamentos_mes,
    })
