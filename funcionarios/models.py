from django.db import models
from django.contrib.auth import get_user_model
from turmas.models import Turma
from datetime import date

User = get_user_model()

class Presenca(models.Model):
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE)
    turma = models.ForeignKey('turmas.Turma', on_delete=models.CASCADE)
    data = models.DateField(default=date.today)
    checkin_realizado = models.BooleanField(default=False)  # 🔹 Indica se o aluno fez check-in
    presenca_confirmada = models.BooleanField(default=False)  # 🔹 Indica se o professor confirmou a presença

    class Meta:
        unique_together = ("usuario", "data")  # 🔹 Impede duplicação no mesmo dia

    def __str__(self):
        return f"{self.usuario.get_full_name()} - {self.data} ({self.turma})"