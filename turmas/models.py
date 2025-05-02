from django.db import models
from django.contrib.auth import get_user_model
from funcionarios.models import Funcionario

DIAS_SEMANA = [
    ('segunda', 'Segunda-feira'),
    ('terca', 'Terça-feira'),
    ('quarta', 'Quarta-feira'),
    ('quinta', 'Quinta-feira'),
    ('sexta', 'Sexta-feira'),
    ('sabado', 'Sábado'),
    ('domingo', 'Domingo'),
]


User = get_user_model()

class CentroDeTreinamento(models.Model):
    nome = models.CharField(max_length=100)
    endereco = models.TextField()
    gerente = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.nome


class Turma(models.Model):
    nome = models.CharField(max_length=100)
    dia_semana = models.CharField(max_length=10, choices=DIAS_SEMANA)
    horario = models.TimeField()
    capacidade_maxima = models.PositiveIntegerField(default=10)
    ct = models.ForeignKey('ct.CentroTreinamento', on_delete=models.CASCADE, null=True)
    professor = models.ForeignKey(Funcionario, on_delete=models.SET_NULL, null=True, blank=True, related_name='turmas')
    limit_choices_to={'cargo': 'professor'}

    def __str__(self):
        return f"{self.nome} - {self.get_dia_semana_display()} às {self.horario}"

class Aula(models.Model):
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    data = models.DateField()
    horario = models.TimeField()

    class Meta:
        unique_together = ('turma', 'data', 'horario')
        ordering = ['-data']

    def __str__(self):
        return f"{self.turma.nome} - {self.data} às {self.horario}"

class Presenca(models.Model):
    aluno = models.ForeignKey('alunos.PreCadastro', on_delete=models.CASCADE)
    aula = models.ForeignKey(Aula, on_delete=models.CASCADE)
    presente = models.BooleanField(default=False)

    class Meta:
        unique_together = ('aluno', 'aula')

    def __str__(self):
        return f"{self.aluno.nome} - {self.aula} - {'Presente' if self.presente else 'Faltou'}"


