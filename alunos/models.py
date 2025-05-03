from django.db import models
from turmas.models import Turma  
from usuarios.models import Usuario
from datetime import date
from django.conf import settings


STATUS_CHOICES = [
    ('pendente', 'Pendente'),
    ('compareceu', 'Compareceu'),
    ('matriculado', 'Matriculado'),
    ('nao_compareceu', 'Não Compareceu'),
    ('nao_quiser_matricular', 'Não Quis Matricular'),
]


class Aluno(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_aluno')

    def __str__(self):
        return self.usuario.get_full_name() or self.usuario.username

class PreCadastro(models.Model):
    nome = models.CharField(max_length=100)
    telefone = models.CharField(max_length=20)
    cpf = models.CharField(max_length=14, unique=True)
    turma = models.ForeignKey(Turma, on_delete=models.SET_NULL, null=True, blank=True)
    dia_aula_experimental = models.DateField()
    horario_aula_experimental = models.TimeField()
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pendente')
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

    def finalizar_agendamento(self):
        """Após o aluno comparecer à aula experimental, ele é matriculado."""
        if self.status == 'compareceu':
            # Criar a matrícula automaticamente
            Matricula.objects.create(
                aluno=self,
                turma=self.turma,
                ativo=True
            )
            self.status = 'matriculado'
            self.save()



class Matricula(models.Model):
    aluno = models.ForeignKey(Usuario, on_delete=models.CASCADE, limit_choices_to={'tipo_usuario': 'aluno'})
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    data_matricula = models.DateField(auto_now_add=True)
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.aluno.first_name} na turma {self.turma.nome}"


class Presenca(models.Model):
    matricula = models.ForeignKey(Matricula, on_delete=models.CASCADE, related_name='presencas')
    data = models.DateField()
    hora = models.TimeField()
    confirmado_funcionario = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.matricula.aluno.first_name} - {self.data} {self.hora}"
    

class Pagamento(models.Model):
    aluno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = models.DateField()
    status = models.CharField(max_length=20, choices=[('pago', 'Pago'), ('pendente', 'Pendente')])
    vencimento = models.DateField()

    def __str__(self):
        return f'Pagamento de {self.aluno.username} em {self.data_pagamento}'

    def esta_em_dia(self):
        """Verifica se o pagamento está em dia (não está pendente e está antes do vencimento)."""
        return self.status == 'pago' and self.vencimento >= date.today()