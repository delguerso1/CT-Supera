from django.db import models
from django.contrib.auth import get_user_model
from funcionarios.models import Funcionario
from ct.models import CentroDeTreinamento 

User = get_user_model()

DIAS_SEMANA = [
    ('segunda', 'Segunda-feira'),
    ('terca', 'Terça-feira'),
    ('quarta', 'Quarta-feira'),
    ('quinta', 'Quinta-feira'),
    ('sexta', 'Sexta-feira'),
    ('sabado', 'Sábado'),
    ('domingo', 'Domingo'),
]

class Turma(models.Model):
    ct = models.ForeignKey(CentroDeTreinamento, on_delete=models.CASCADE)  
    nome = models.CharField(max_length=100)
    dia_semana = models.CharField(max_length=10, choices=DIAS_SEMANA)
    horario = models.TimeField()
    capacidade_maxima = models.PositiveIntegerField(default=0)
    professor = models.ForeignKey(
        Funcionario, 
        on_delete=models.SET_NULL,  # Pode ser CASCADE se desejar
        null=True, 
        blank=True,
        limit_choices_to={"cargo": "professor"}  # 🔹 Filtro para mostrar apenas professores!
    )



    class Meta:
        unique_together = ("ct", "dia_semana", "horario")
        ordering = ["dia_semana", "horario"]
        verbose_name_plural = "Turmas"

    def __str__(self):
        return f"{self.ct.nome} - {self.nome} ({self.get_dia_semana_display()} às {self.horario})"