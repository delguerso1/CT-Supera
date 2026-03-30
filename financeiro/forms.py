from django import forms
from .models import Mensalidade, Despesa
from usuarios.models import Usuario
from .models import Salario  

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
        fields = ['valor', 'data_vencimento', 'status', 'observacoes']  # Inclua 'observacoes' se quiser editar

from django.forms import modelformset_factory

MensalidadeFormSet = modelformset_factory(
    Mensalidade,
    form=MensalidadeForm,
    extra=0,
    can_delete=False
)


class SalarioForm(forms.ModelForm):
    class Meta:
        model = Salario
        fields = ['professor', 'valor', 'competencia', 'data_pagamento', 'status']
        widgets = {
            'competencia': forms.DateInput(attrs={'type': 'date'}),
            'data_pagamento': forms.DateInput(attrs={'type': 'date'}),
        }
        labels = {
            'professor': 'Professor',
            'valor': 'Valor',
            'competencia': 'Competência (mês)',
            'data_pagamento': 'Data efetiva do pagamento (ao marcar pago)',
        }


