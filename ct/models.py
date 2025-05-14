from django.db import models

class CentroDeTreinamento(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    endereco = models.TextField(blank=True)
    telefone = models.CharField(max_length=15, blank=True, null=True)


    def __str__(self):
        return self.nome

    class Meta:
        verbose_name_plural = "Centros de Treinamento"