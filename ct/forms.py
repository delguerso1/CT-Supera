from django import forms
from .models import CentroDeTreinamento

class CentroDeTreinamentoForm(forms.ModelForm):
    class Meta:
        model = CentroDeTreinamento
        fields = ["nome", "endereco"]  # Ajuste conforme necessário
        widgets = {
            "nome": forms.TextInput(attrs={"class": "form-control", "placeholder": "Nome do CT"}),
            "endereco": forms.Textarea(attrs={"class": "form-control", "rows": 3, "placeholder": "Endereço completo"}),
        }