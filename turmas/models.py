from django.db import models
from ct.models import CentroDeTreinamento
from usuarios.models import Usuario

class DiaSemana(models.Model):
    nome = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nome

class Turma(models.Model):
    ct = models.ForeignKey(CentroDeTreinamento, on_delete=models.CASCADE)  
    dias_semana = models.ManyToManyField(DiaSemana)  # 🔹 Agora aceita vários dias!
    horario = models.TimeField()
    capacidade_maxima = models.PositiveIntegerField(default=0)
    aceita_kids = models.BooleanField(default=False, help_text='Aceita crianças até 12 anos')
    aceita_teen = models.BooleanField(default=False, help_text='Aceita adolescentes até 18 anos')
    aceita_adultos = models.BooleanField(default=True, help_text='Aceita maiores de 18 anos')
    professores = models.ManyToManyField(
        Usuario,
        blank=True,
        related_name="turmas",
        limit_choices_to={"tipo": "professor"}
    )
    alunos = models.ManyToManyField(Usuario, blank=True, related_name="turmas_aluno")
    ativo = models.BooleanField(default=True)  # <-- Adicione esta linha

    class Meta:
        unique_together = ("ct", "horario")  
        ordering = ["horario"]
        verbose_name_plural = "Turmas"

    def __str__(self):
        dias = ", ".join([dia.nome for dia in self.dias_semana.all()])
        return f"{self.ct.nome} ({dias} às {self.horario})"