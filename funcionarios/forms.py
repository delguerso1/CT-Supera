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
    tipo_usuario = forms.ChoiceField(choices=Usuario.TIPO_USUARIO_CHOICES)

    class Meta:
        model = Funcionario
        fields = ['nome', 'cargo']

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if Usuario.objects.filter(email=email).exists():
            raise forms.ValidationError("Este e-mail já está em uso.")
        return email

    def save(self, commit=True):
        funcionario = super().save(commit=False)
        user = Usuario.objects.create_user(
            username=self.cleaned_data['email'],
            email=self.cleaned_data['email'],
            password=self.cleaned_data['senha'],
            tipo_usuario=self.cleaned_data['tipo_usuario'],
        )
        funcionario.user = user
        if commit:
            funcionario.save()
        return funcionario
