from django import forms
from usuarios.models import Usuario
from financeiro.models import Mensalidade


class AlunoPerfilForm(forms.ModelForm):
    class Meta:
        model = Usuario
        fields = ["first_name", "last_name", "telefone", "endereco", "email"]

class PagamentoForm(forms.ModelForm):
    class Meta:
        model = Mensalidade
        fields = ["aluno", "valor", "status"]

    def processar_pagamento(self):
        """Atualiza o status da mensalidade após o pagamento"""
        if self.instance.status == "pendente":
            self.instance.status = "pago"
            self.instance.save()

