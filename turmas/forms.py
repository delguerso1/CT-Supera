from django import forms
from .models import Turma, DiaSemana  
from usuarios.models import Usuario  

class TurmaForm(forms.ModelForm):
    dias_semana = forms.ModelMultipleChoiceField(
        queryset=DiaSemana.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=True,
        label="Dias da Semana",
        help_text="Selecione um ou mais dias da semana"
    )

    class Meta:
        model = Turma
        fields = ["ct", "nome", "dias_semana", "horario", "capacidade_maxima", "professor"]

    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user", None)
        super().__init__(*args, **kwargs)

        if user:
            self.fields["professor"].queryset = Usuario.objects.filter(tipo="professor")  # 🔹 Filtra apenas professores
