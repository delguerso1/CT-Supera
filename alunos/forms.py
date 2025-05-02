from django import forms
from .models import PreCadastro
from turmas.models import Turma

class AgendarAulaForm(forms.ModelForm):
    class Meta:
        model = PreCadastro
        fields = ['nome', 'telefone', 'cpf', 'turma', 'dia_aula_experimental', 'horario_aula_experimental']
    
    # Aqui podemos adicionar alguma validação para garantir que o aluno está escolhendo um horário disponível
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['turma'].queryset = Turma.objects.filter(dia_semana__in=['segunda', 'terca', 'quarta', 'quinta', 'sexta'])

        
class PreCadastroForm(forms.ModelForm):
    class Meta:
        model = PreCadastro
        fields = ['nome', 'telefone', 'cpf', 'dia_aula_experimental', 'horario_aula_experimental']
        widgets = {
            'dia_aula_experimental': forms.DateInput(attrs={'type': 'date'}),
            'horario_aula_experimental': forms.TimeInput(attrs={'type': 'time'}),
        }
