from django.db import models
from django.conf import settings

class Funcionario(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    nome = models.CharField(max_length=100, null=True)
    telefone = models.CharField(max_length=15, blank=True)
    cargo = models.CharField(max_length=20, choices=[
        ('professor', 'Professor'),
        ('gerente', 'Gerente'),
    ])

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_cargo_display()}"