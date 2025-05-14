from django.db import models
from turmas.models import Turma  
from usuarios.models import Usuario
from datetime import date
from django.core.exceptions import ValidationError



STATUS_CHOICES = [
    ('pendente', 'Pendente'),
    ('compareceu', 'Compareceu'),
    ('matriculado', 'Matriculado'),
    ('nao_compareceu', 'Não Compareceu'),
    ('nao_quiser_matricular', 'Não Quis Matricular'),
]


from datetime import date
from django.core.exceptions import ValidationError
from django.db import models

class Aluno(models.Model):
    usuario = models.OneToOneField("usuarios.Usuario", on_delete=models.CASCADE, related_name="perfil_aluno")
    data_nascimento = models.DateField(null=True, blank=True)

    # Campos para menores de idade
    nome_responsavel = models.CharField(max_length=100, blank=True, null=True)
    telefone_responsavel = models.CharField(max_length=20, blank=True, null=True)

    # Campo para maiores de idade
    telefone_emergencia = models.CharField(max_length=20, blank=True, null=True)

    ficha_medica = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.usuario.first_name or self.usuario.username

    @property
    def idade(self):
        if self.data_nascimento:  # 🔹 Adicionando verificação antes do cálculo!
            today = date.today()
            return today.year - self.data_nascimento.year - (
                (today.month, today.day) < (self.data_nascimento.month, self.data_nascimento.day)
            )
        return None  # 🔹 Retorna `None` caso `data_nascimento` não esteja preenchido

    def is_menor_idade(self):
        return self.idade is not None and self.idade < 18

    def clean(self):
        super().clean()
        idade = self.idade

        if idade is not None:  # 🔹 Evita erro caso `idade` seja `None`
            if idade < 18 and not self.telefone_responsavel:
                raise ValidationError("Alunos menores de idade devem ter um telefone do responsável.")
            elif idade >= 18 and not self.telefone_emergencia:
                raise ValidationError("Alunos maiores de idade devem ter um telefone de emergência.")


class PreCadastro(models.Model):
    nome = models.CharField(max_length=100)
    telefone = models.CharField(max_length=20)
    cpf = models.CharField(max_length=14, unique=True)
    turma = models.ForeignKey(Turma, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pendente')
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

    def finalizar_agendamento(self):
        """Após o aluno comparecer à aula experimental, ele é matriculado."""
        if self.status == 'compareceu':
            # Criar o usuário e o aluno primeiro
            usuario = Usuario.objects.create_user(
                username=self.cpf,
                email=f"{self.cpf}@temp.com",  # Email temporário
                password=Usuario.objects.make_random_password(),
                tipo_usuario='aluno'
            )
            aluno = Aluno.objects.create(
                usuario=usuario,
                data_nascimento=None,  # Será preenchido posteriormente
                telefone_emergencia=self.telefone
            )
            
            # Criar a matrícula
            Matricula.objects.create(
                aluno=aluno,
                turma=self.turma,
                ativo=True
            )
            self.status = 'matriculado'
            self.save()



class Matricula(models.Model):
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE)
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    data_matricula = models.DateField(auto_now_add=True)
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.aluno.usuario.first_name} na turma {self.turma.nome}"


class Presenca(models.Model):
    matricula = models.ForeignKey(Matricula, on_delete=models.CASCADE, related_name='presencas')
    data = models.DateField()
    hora = models.TimeField()
    confirmado_funcionario = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.matricula.aluno.usuario.first_name} - {self.data} {self.hora}"
    

class Pagamento(models.Model):
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = models.DateField()
    status = models.CharField(max_length=20, choices=[('pago', 'Pago'), ('pendente', 'Pendente')])
    vencimento = models.DateField()

    def __str__(self):
        return f'Pagamento de {self.aluno.usuario.username} em {self.data_pagamento}'

    def esta_em_dia(self):
        """Verifica se o pagamento está em dia (não está pendente e está antes do vencimento)."""
        return self.status == 'pago' and self.vencimento >= date.today()