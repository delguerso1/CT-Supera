from django import forms
from .models import PreCadastro, Aluno
from turmas.models import Turma
from django.core.exceptions import ValidationError
from datetime import date
import re

def validar_telefone(telefone):
    if telefone:
        # Remove caracteres não numéricos
        telefone = re.sub(r'\D', '', telefone)
        if len(telefone) < 10 or len(telefone) > 11:
            raise ValidationError("Número de telefone inválido. Use o formato (XX) XXXXX-XXXX.")
    return telefone

def validar_cpf(cpf):
    # Remove caracteres não numéricos
    cpf = re.sub(r'\D', '', cpf)
    
    if len(cpf) != 11:
        raise ValidationError("CPF deve conter 11 dígitos.")
    
    # Verifica se todos os dígitos são iguais
    if cpf == cpf[0] * 11:
        raise ValidationError("CPF inválido.")
    
    # Validação do primeiro dígito verificador
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digito1 = (soma * 10 % 11) % 10
    if int(cpf[9]) != digito1:
        raise ValidationError("CPF inválido.")
    
    # Validação do segundo dígito verificador
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digito2 = (soma * 10 % 11) % 10
    if int(cpf[10]) != digito2:
        raise ValidationError("CPF inválido.")
    
    return cpf

class AlunoForm(forms.ModelForm):
    class Meta:
        model = Aluno
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        data_nascimento = cleaned_data.get('data_nascimento')
        telefone_responsavel = cleaned_data.get('telefone_responsavel')
        telefone_emergencia = cleaned_data.get('telefone_emergencia')

        if data_nascimento:
            hoje = date.today()
            idade = hoje.year - data_nascimento.year - (
                (hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day)
            )

            if idade < 18:
                if not telefone_responsavel:
                    self.add_error('telefone_responsavel', "Obrigatório para alunos menores de idade.")
                else:
                    cleaned_data['telefone_responsavel'] = validar_telefone(telefone_responsavel)
            else:
                if not telefone_emergencia:
                    self.add_error('telefone_emergencia', "Obrigatório para alunos maiores de idade.")
                else:
                    cleaned_data['telefone_emergencia'] = validar_telefone(telefone_emergencia)

        return cleaned_data

class AgendarAulaForm(forms.ModelForm):
    class Meta:
        model = PreCadastro
        fields = ['nome', 'telefone', 'cpf', 'turma']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['turma'].queryset = Turma.objects.filter(dia_semana__in=['segunda', 'terca', 'quarta', 'quinta', 'sexta'])

class PreCadastroForm(forms.ModelForm):
    class Meta:
        model = PreCadastro
        fields = ["nome", "telefone", "cpf", "turma"]

    def clean_cpf(self):
        cpf = self.cleaned_data.get('cpf')
        return validar_cpf(cpf)

    def clean(self):
        cleaned_data = super().clean()
        turma = cleaned_data.get('turma')

        if turma:
            num_agendamentos = PreCadastro.objects.filter(turma=turma).count()
            if num_agendamentos >= 5:
                raise ValidationError("Essa turma já atingiu o limite de 5 alunos para aula experimental.")

        return cleaned_data