from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Turma
from .forms import TurmaForm


@login_required
def lista_turmas(request):
    turmas = Turma.objects.filter(ct__gerente=request.user)
    return render(request, 'turmas/lista_turmas.html', {'turmas': turmas})

@login_required
def criar_turma(request):
    if request.method == 'POST':
        form = TurmaForm(request.POST, user=request.user)
        if form.is_valid():
            turma = form.save(commit=False)
            turma.ct = request.user.funcionario.ct
            turma.save()
            return redirect('turmas:lista_turmas')
    else:
        form = TurmaForm(user=request.user)

    return render(request, 'turmas/form_turma.html', {'form': form, 'turma': None})

@login_required
def editar_turma(request, turma_id):
    turma = get_object_or_404(Turma, id=turma_id, ct=request.user.funcionario.ct)
    
    if request.method == 'POST':
        form = TurmaForm(request.POST, instance=turma, user=request.user)
        if form.is_valid():
            form.save()
            return redirect('turmas:lista_turmas')
    else:
        form = TurmaForm(instance=turma, user=request.user)

    return render(request, 'turmas/form_turma.html', {'form': form, 'turma': turma})

@login_required
def excluir_turma(request, pk):
    turma = get_object_or_404(Turma, pk=pk, ct__gerente=request.user)
    if request.method == 'POST':
        turma.delete()
        return redirect('turmas:lista_turmas')
    return render(request, 'turmas/excluir_turma.html', {'turma': turma})


