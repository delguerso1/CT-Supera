from django import forms
from .models import Turma
from funcionarios.models import Funcionario

class TurmaForm(forms.ModelForm):
    class Meta:
        model = Turma
        fields = ['ct', 'nome', 'dia_semana', 'horario', 'capacidade_maxima', 'professor']
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

        if user:
            self.fields['professor'].queryset = Funcionario.objects.filter(cargo='professor')
