from django import forms
from usuarios.models import Usuario
from .models import PreCadastro
from turmas.models import Turma  
from django.core.exceptions import ValidationError
import re
from django.contrib.auth.hashers import make_password
import datetime
from ct.models import CentroDeTreinamento

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

def validar_senha(senha):
    """Valida a força da senha"""
    if len(senha) < 8:
        raise ValidationError("A senha deve ter pelo menos 8 caracteres.")
    
    if not re.search(r'[A-Z]', senha):
        raise ValidationError("A senha deve conter pelo menos uma letra maiúscula.")
    
    if not re.search(r'[a-z]', senha):
        raise ValidationError("A senha deve conter pelo menos uma letra minúscula.")
    
    if not re.search(r'\d', senha):
        raise ValidationError("A senha deve conter pelo menos um número.")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', senha):
        raise ValidationError("A senha deve conter pelo menos um caractere especial (!@#$%^&*(),.?\":{}|<>).")
    
    return senha


class UsuarioForm(forms.ModelForm):
    first_name = forms.CharField(label="Nome", max_length=150)
    last_name = forms.CharField(label="Sobrenome", max_length=150)
    telefone = forms.CharField(max_length=20, widget=forms.TextInput(attrs={"placeholder": "(21)00000-0000"}))
    data_nascimento = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}), label="Data de Nascimento")
    endereco = forms.CharField(max_length=255, required=False, label="Endereço")
    cpf = forms.CharField(max_length=14, required=True, label="CPF")
    tipo = forms.ChoiceField(choices=Usuario.TIPO_USUARIO_CHOICES, label="Tipo de Usuário")
    telefone_responsavel = forms.CharField(required=False, label="Telefone do Responsável")
    telefone_emergencia = forms.CharField(required=False, label="Telefone de Emergência")
    email = forms.EmailField(required=True, label="E-mail")
    
   
    class Meta:
        model = Usuario
        fields = [
            "cpf", "first_name", "last_name", "tipo", "telefone", "endereco", "data_nascimento",
            "telefone_responsavel", "telefone_emergencia", "email"
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
        usuario.username = re.sub(r"\D", "", self.cleaned_data["cpf"])
        
        # Cria usuário inativo (será ativado via link)
        usuario.is_active = False  # Usuário inativo até ativar via link
        usuario.set_unusable_password()  # Não define senha - usuário definirá via link
        
        if commit:
            usuario.save()
            
            # Envia convite de ativação para todos os usuários
            if usuario.email:
                try:
                    from usuarios.utils import enviar_convite_aluno
                    enviar_convite_aluno(usuario)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Erro ao enviar convite de ativação para {usuario.email}: {e}")
        
        return usuario
    


class PreCadastroForm(forms.ModelForm):
    telefone = forms.CharField(max_length=20, widget=forms.TextInput(attrs={"placeholder": "(21)00000-0000"}))
    data_nascimento = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}), label="Data de Nascimento")
    turma = forms.ModelChoiceField(queryset=Turma.objects.all(), empty_label="Selecione uma turma", required=True)

    class Meta:
        model = PreCadastro
        fields = ["first_name", "last_name", "telefone", "data_nascimento", "email", "turma"]  


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
        fields = ['first_name', 'last_name', 'telefone', 'data_nascimento', 'email', 'turma']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['turma'].queryset = Turma.objects.filter(dia_semana__in=['segunda', 'terca', 'quarta', 'quinta', 'sexta'])



class PreCadastroEditForm(forms.ModelForm):
    cpf = forms.CharField(
        max_length=11,
        required=True,
        widget=forms.TextInput(attrs={"placeholder": "Informe o CPF"})
    )

    class Meta:
        model = PreCadastro
        fields = ["first_name", "last_name", "telefone", "data_nascimento", "email", "turma", "cpf"]


class DefinirSenhaForm(forms.Form):
    """Formulário para definição de senha com validação de força"""
    new_password1 = forms.CharField(
        label="Nova senha",
        widget=forms.PasswordInput,
        help_text="Mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial"
    )
    new_password2 = forms.CharField(
        label="Confirmar nova senha",
        widget=forms.PasswordInput
    )

    def clean_new_password1(self):
        password = self.cleaned_data.get('new_password1')
        if password:
            try:
                validar_senha(password)
            except ValidationError as e:
                raise forms.ValidationError(e)
        return password

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get("new_password1")
        password2 = cleaned_data.get("new_password2")
        
        if password1 and password2:
            if password1 != password2:
                raise forms.ValidationError("As senhas não coincidem.")
        
        return cleaned_data