from django.db import models

class CentroTreinamento(models.Model):
    nome = models.CharField(max_length=100)
    endereco = models.TextField(blank=True)

    def __str__(self):
        return self.nome
