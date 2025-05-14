from django import forms
from usuarios.models import Usuario

class UsuarioForm(forms.ModelForm):
    class Meta:
        model = Usuario
        fields = ["cpf", "password"]

    def clean_cpf(self):
        cpf = self.cleaned_data["cpf"]
        return cpf.replace(".", "").replace("-", "")  # 🔹 Remove pontuação antes de salvar