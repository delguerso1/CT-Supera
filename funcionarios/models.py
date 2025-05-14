from django.db import models


class Funcionario(models.Model):
    user = models.OneToOneField("usuarios.Usuario", on_delete=models.CASCADE)
    nome = models.CharField(max_length=100, default="Funcionário Padrão")
    telefone = models.CharField(max_length=20, blank=True, null=True)
    cargo = models.CharField(max_length=50, choices=[("professor", "Professor"), ("gerente", "Gerente")])
    despesa = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    turmas = models.ManyToManyField("turmas.Turma", blank=True)
    
    # 🔹 Adicionando campo `ativo`
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.nome
