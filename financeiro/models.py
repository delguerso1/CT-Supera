from django.db import models
from django.utils import timezone
from datetime import timedelta
from usuarios.models import Usuario  

CATEGORIAS_DESPESAS = [
    ("salario", "Salário de Funcionário"),
    ("aluguel", "Aluguel"),
    ("materiais", "Compra de Materiais"),
    ("outros", "Outros"),
]

STATUS_CHOICES = [
    ("pago", "Pago"),
    ("pendente", "Pendente"),
    ("atrasado", "Atrasado"),
]

class Mensalidade(models.Model):
    aluno = models.ForeignKey(Usuario, on_delete=models.CASCADE, limit_choices_to={"tipo": "aluno"})  # 🔹 Ajustei `limit_choices_to`
    valor = models.DecimalField(max_digits=7, decimal_places=2)
    data_inicio = models.DateField()
    data_vencimento = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pendente")
    observacoes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        hoje = timezone.now().date()

        if not self.data_vencimento:
            self.data_vencimento = self.data_inicio + timedelta(days=30)

        if self.status == "pendente" and hoje > self.data_vencimento:
            self.status = "atrasado"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.aluno.nome} - R${self.valor} ({self.get_status_display()})"

class Despesa(models.Model):
    categoria = models.CharField(max_length=20, choices=CATEGORIAS_DESPESAS)
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={"tipo": "gerente"})
    descricao = models.TextField(blank=True)
    valor = models.DecimalField(max_digits=7, decimal_places=2)
    data = models.DateField(default=timezone.now)

    def __str__(self):
        return f"{self.get_categoria_display()} - R${self.valor} ({self.data})"
