from django.db import models
from ct.models import CentroDeTreinamento
from usuarios.models import Usuario

class DiaSemana(models.Model):
    nome = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nome

class Turma(models.Model):
    ct = models.ForeignKey(CentroDeTreinamento, on_delete=models.CASCADE)  
    nome = models.CharField(max_length=100)
    dias_semana = models.ManyToManyField(DiaSemana)  # 🔹 Agora aceita vários dias!
    horario = models.TimeField()
    capacidade_maxima = models.PositiveIntegerField(default=0)
    professor = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="turmas")  # 🔹 Relaciona com o usuário

    class Meta:
        unique_together = ("ct", "horario")  # 🔹 Removemos `dia_semana` daqui
        ordering = ["horario"]
        verbose_name_plural = "Turmas"

    def __str__(self):
        dias = ", ".join([dia.nome for dia in self.dias_semana.all()])
        return f"{self.ct.nome} - {self.nome} ({dias} às {self.horario})"