from django.db import models
from django.contrib.auth import get_user_model
from turmas.models import Turma
from datetime import date

User = get_user_model()

class Presenca(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="presencas")
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, related_name="presencas")
    data = models.DateField(default=date.today)

    class Meta:
        unique_together = ("usuario", "data")  # 🔹 Impede duplicação no mesmo dia

    def __str__(self):
        return f"{self.usuario.nome} - {self.data} ({self.turma.nome})"