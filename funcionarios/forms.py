from django import forms
from django.contrib.auth.models import User
from .models import Funcionario
from usuarios.models import Usuario

class FuncionarioForm(forms.ModelForm):
    class Meta:
        model = Funcionario
        fields = ['telefone', 'cargo']

class CadastroFuncionarioForm(forms.ModelForm):
    email = forms.EmailField()
    senha = forms.CharField(widget=forms.PasswordInput)

    class Meta:
        model = Funcionario
        fields = ['nome', 'cargo']

    def save(self, commit=True):
        funcionario = super().save(commit=False)
        user = Usuario.objects.create_user(
            username=self.cleaned_data['email'],
            email=self.cleaned_data['email'],
            password=self.cleaned_data['senha'],
            tipo_usuario=self.cleaned_data['tipo'],
        )
        funcionario.user = user
        if commit:
            funcionario.save()
        return funcionario