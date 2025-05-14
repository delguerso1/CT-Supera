from django.db import models
from django.utils import timezone
from datetime import timedelta
from funcionarios.models import Funcionario

CATEGORIAS_DESPESAS = [
    ("salario", "Salário de Funcionário"),
    ("aluguel", "Aluguel"),
    ("materiais", "Compra de Materiais"),
    ("outros", "Outros"),
]


STATUS_CHOICES = [
    ('pago', 'Pago'),
    ('pendente', 'Pendente'),
    ('atrasado', 'Atrasado'),
]

class Mensalidade(models.Model):
    aluno = models.ForeignKey("usuarios.Usuario", on_delete=models.CASCADE, limit_choices_to={"tipo_usuario": "aluno"})
    valor = models.DecimalField(max_digits=7, decimal_places=2)
    data_inicio = models.DateField()
    data_vencimento = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pendente")
    observacoes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        hoje = timezone.now().date()

        # Garante que a data de vencimento seja sempre 30 dias após a data de início
        if not self.data_vencimento:
            self.data_vencimento = self.data_inicio + timedelta(days=30)

        # Atualiza status para "atrasado" caso esteja pendente e já tenha passado do vencimento
        if self.status == "pendente" and hoje > self.data_vencimento:
            self.status = "atrasado"

        super().save(*args, **kwargs)

    def esta_vigente(self):
        hoje = timezone.now().date()
        return self.status == "pago" and self.data_inicio <= hoje <= self.data_vencimento

    def proximo_periodo(self):
        """Calcula o próximo período (30 dias após a data de início)."""
        return self.data_inicio + timedelta(days=30)

    def deve_gerar_proxima(self):
        """Verifica se estamos a 5 dias ou menos do vencimento e a mensalidade está paga."""
        hoje = timezone.now().date()
        return self.status == "pago" and hoje >= (self.data_vencimento - timedelta(days=5))

    def __str__(self):
        return f"{self.aluno.first_name} - R${self.valor} ({self.get_status_display()})"


class Despesa(models.Model):
    categoria = models.CharField(max_length=20, choices=CATEGORIAS_DESPESAS)
    funcionario = models.ForeignKey("funcionarios.Funcionario", on_delete=models.CASCADE, related_name="despesas", default=1)
    descricao = models.TextField(blank=True)
    valor = models.DecimalField(max_digits=7, decimal_places=2)
    data = models.DateField(default=timezone.now)

    def __str__(self):
        return f"{self.get_categoria_display()} - R${self.valor} ({self.data})"
