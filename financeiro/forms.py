from django import forms
from .models import Mensalidade, Despesa
from usuarios.models import Usuario

class DespesaForm(forms.ModelForm):
    class Meta:
        model = Despesa
        fields = ["categoria", "usuario", "descricao", "valor", "data"]  # 🔹 Substituí `funcionario` por `usuario`
        widgets = {
            "data": forms.DateInput(attrs={"type": "date", "class": "form-control"}),
            "valor": forms.NumberInput(attrs={"class": "form-control"}),
            "descricao": forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        }
        labels = {
            "categoria": "Categoria",
            "usuario": "Usuário",  # 🔹 Alterei de "Funcionário" para "Usuário"
            "descricao": "Descrição",
            "valor": "Valor",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["usuario"].queryset = Usuario.objects.filter(tipo="gerente")  # 🔹 Filtra apenas gerentes

class MensalidadeForm(forms.ModelForm):
    class Meta:
        model = Mensalidade
        fields = ["aluno", "valor", "data_inicio", "status", "observacoes"]

    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user", None)  # Obtém o usuário logado
        super().__init__(*args, **kwargs)

        # 🔹 Filtra apenas alunos do CT do gerente logado
        if user and user.tipo == "gerente":
            self.fields["aluno"].queryset = Usuario.objects.filter(tipo="aluno", ct=user.ct)

