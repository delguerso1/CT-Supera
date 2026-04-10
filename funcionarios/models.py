from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from turmas.models import Turma
from datetime import date

User = get_user_model()

MAX_OBSERVACAO_AULA_CHARS = 1000


class ObservacaoAula(models.Model):
    """Anotação interna do professor sobre a aula (uma por turma por dia). Gerente apenas lê."""

    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, related_name="observacoes_aula")
    data = models.DateField()
    texto = models.TextField(max_length=MAX_OBSERVACAO_AULA_CHARS)
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="observacoes_aula",
    )
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["turma", "data"], name="unique_observacaoaula_turma_data"),
        ]

    def __str__(self):
        return f"Obs. {self.turma_id} {self.data}"


class Presenca(models.Model):
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE)
    turma = models.ForeignKey('turmas.Turma', on_delete=models.CASCADE)
    data = models.DateField(default=date.today)
    checkin_realizado = models.BooleanField(default=False)  # 🔹 Indica se o aluno fez check-in
    presenca_confirmada = models.BooleanField(default=False)  # 🔹 Indica se o professor confirmou a presença
    ausencia_registrada = models.BooleanField(
        default=False,
        help_text="Professor registrou falta (desmarcação). Incompatível com presença confirmada.",
    )

    class Meta:
        unique_together = ("usuario", "turma", "data")  # Um registro por aluno por turma por dia

    def __str__(self):
        return f"{self.usuario.get_full_name()} - {self.data} ({self.turma})"