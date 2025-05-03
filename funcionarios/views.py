from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .forms import FuncionarioForm
from .models import Funcionario
from .forms import CadastroFuncionarioForm
from usuarios.models import Usuario
from django.contrib import messages

        
@login_required
def lista_funcionarios(request):
    if request.user.tipo_usuario != 'gerente':
        return render(request, '403.html')  # opcional: criar página de acesso negado
    funcionarios = Funcionario.objects.all()
    return render(request, 'funcionarios/lista_funcionarios.html', {'funcionarios': funcionarios})

@login_required
def cadastrar_funcionario(request):
    if request.user.tipo_usuario != 'gerente':
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
    if request.user.tipo_usuario != 'gerente':
        return render(request, '403.html')

    funcionario = get_object_or_404(Funcionario, id=funcionario_id)

    if request.method == 'POST':
        form = CadastroFuncionarioForm(request.POST, instance=funcionario)
        if form.is_valid():
            form.save()
            messages.success(request, 'Funcionário atualizado com sucesso.')
            return redirect('lista_funcionarios')
    else:
        # Pré-preenche o formulário com os dados do usuário vinculado
        form = CadastroFuncionarioForm(instance=funcionario, initial={
            'email': funcionario.user.email,
        })

    return render(request, 'funcionarios/editar_funcionario.html', {'form': form, 'funcionario': funcionario})

@login_required
def excluir_funcionario(request, funcionario_id):
    if request.user.tipo_usuario != 'gerente':
        return render(request, '403.html')

    funcionario = get_object_or_404(Funcionario, id=funcionario_id)

    if request.method == 'POST':
        funcionario.user.delete()  # remove o usuário vinculado
        funcionario.delete()
        messages.success(request, 'Funcionário excluído com sucesso.')
        return redirect('lista_funcionarios')

    return render(request, 'funcionarios/excluir_funcionario.html', {'funcionario': funcionario})