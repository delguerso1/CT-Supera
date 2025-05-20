from django import forms
from usuarios.models import Usuario
from .models import PreCadastro
from turmas.models import Turma  
from django.core.exceptions import ValidationError
import re
from django.contrib.auth.hashers import make_password
import datetime 

def validar_telefone(telefone):
    if telefone:
        telefone = re.sub(r'\D', '', telefone)  # 🔹 Remove caracteres não numéricos
        if len(telefone) < 10 or len(telefone) > 11:
            raise ValidationError("Número de telefone inválido. Use o formato (XX) XXXXX-XXXX.")
    return telefone

def validar_cpf(cpf):
    cpf = re.sub(r'\D', '', cpf)  # 🔹 Remove caracteres não numéricos
    
    if len(cpf) != 11:
        raise ValidationError("CPF deve conter 11 dígitos.")
    
    if cpf == cpf[0] * 11:  # 🔹 Verifica se todos os dígitos são iguais
        raise ValidationError("CPF inválido.")
    
    # 🔹 Validação do primeiro dígito verificador
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digito1 = (soma * 10 % 11) % 10
    if int(cpf[9]) != digito1:
        raise ValidationError("CPF inválido.")
    
    # 🔹 Validação do segundo dígito verificador
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digito2 = (soma * 10 % 11) % 10
    if int(cpf[10]) != digito2:
        raise ValidationError("CPF inválido.")
    
    return cpf


class UsuarioForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, required=True, label="Senha")
    telefone = forms.CharField(max_length=20, widget=forms.TextInput(attrs={"placeholder": "(21)00000-0000"}))
    data_nascimento = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}), label="Data de Nascimento")
    endereco = forms.CharField(max_length=255, required=False, label="Endereço")
    nome = forms.CharField(max_length=100, required=True, label="Nome")
    cpf = forms.CharField(max_length=14, required=True, label="CPF")
    tipo = forms.ChoiceField(choices=Usuario.TIPO_USUARIO_CHOICES, label="Tipo de Usuário")
    telefone_responsavel = forms.CharField(required=False, label="Telefone do Responsável")
    telefone_emergencia = forms.CharField(required=False, label="Telefone de Emergência")

    class Meta:
        model = Usuario
        fields = [
            "cpf", "nome", "tipo", "telefone", "endereco", "data_nascimento", "password",
            "telefone_responsavel", "telefone_emergencia"
        ]

    def clean_cpf(self):
        cpf = self.cleaned_data["cpf"]
        cpf = re.sub(r"\D", "", cpf)
        # Aqui você pode chamar sua função validar_cpf se quiser
        return cpf

    def clean_telefone(self):
        telefone = self.cleaned_data.get("telefone")
        if telefone:
            telefone = re.sub(r"\D", "", telefone)
        return telefone

    def clean(self):
        cleaned_data = super().clean()
        tipo = cleaned_data.get("tipo")
        data_nascimento = cleaned_data.get("data_nascimento")
        telefone = cleaned_data.get("telefone")
        telefone_responsavel = cleaned_data.get("telefone_responsavel")
        telefone_emergencia = cleaned_data.get("telefone_emergencia")

        if tipo == "professor":
            if not telefone:
                self.add_error("telefone", "Telefone é obrigatório para professor.")
        elif tipo == "aluno":
            if not data_nascimento:
                self.add_error("data_nascimento", "Data de nascimento é obrigatória para aluno.")
            else:
                hoje = datetime.date.today()
                idade = hoje.year - data_nascimento.year - ((hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day))
                if idade < 18:
                    if not telefone_responsavel:
                        self.add_error("telefone_responsavel", "Telefone do responsável é obrigatório para alunos menores de idade.")
                else:
                    if not telefone_emergencia:
                        self.add_error("telefone_emergencia", "Telefone de emergência é obrigatório para alunos maiores de idade.")

        return cleaned_data

    def save(self, commit=True):
        usuario = super().save(commit=False)
        if self.cleaned_data["password"]:
            usuario.password = make_password(self.cleaned_data["password"])
        if commit:
            usuario.save()
        return usuario


    

class PreCadastroForm(forms.ModelForm):
    telefone = forms.CharField(max_length=20, widget=forms.TextInput(attrs={"placeholder": "(21)00000-0000"}))
    data_de_nascimento = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}))
    turma = forms.ModelChoiceField(queryset=Turma.objects.all(), empty_label="Selecione uma turma", required=True)

    class Meta:
        model = PreCadastro
        fields = ["nome", "telefone", "data_de_nascimento", "email", "turma"]  


    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and Usuario.objects.filter(email=email).exists():
            raise ValidationError("⚠️ Esse e-mail já está cadastrado no sistema.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        turma = cleaned_data.get('turma')

        if turma:
            num_agendamentos = PreCadastro.objects.filter(turma=turma).count()
            if num_agendamentos >= 5:
                raise ValidationError("⚠️ Essa turma já atingiu o limite de 5 alunos para aula experimental.")

        return cleaned_data
    

class AgendarAulaForm(forms.ModelForm):
    class Meta:
        model = PreCadastro
        fields = ['nome', 'telefone', 'data_de_nascimento', 'email', 'turma']  # 🔹 Adicionado `email` ao formulário

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['turma'].queryset = Turma.objects.filter(dia_semana__in=['segunda', 'terca', 'quarta', 'quinta', 'sexta'])


