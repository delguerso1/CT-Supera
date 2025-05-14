from django import forms
from .models import Mensalidade
from .models import Despesa

class DespesaForm(forms.ModelForm):
    class Meta:
        model = Despesa
        fields = ["categoria", "funcionario", "descricao", "valor", "data"]
        widgets = {
            "data": forms.DateInput(attrs={"type": "date", "class": "form-control"}),
            "valor": forms.NumberInput(attrs={"class": "form-control"}),
            "descricao": forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        }
        labels = {
            "categoria": "Categoria",
            "funcionario": "Funcionário",
            "descricao": "Descrição",
            "valor": "Valor",
        }

class MensalidadeForm(forms.ModelForm):
    class Meta:
        model = Mensalidade
        fields = ["aluno", "valor", "data_inicio", "status", "observacoes"]

    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user", None)  # Obtém o usuário logado
        super().__init__(*args, **kwargs)

        # Filtra apenas alunos do CT do gerente logado
        if user and hasattr(user, "funcionario") and user.funcionario.cargo == "gerente":
            self.fields["aluno"].queryset = user.funcionario.ct.alunos.all()