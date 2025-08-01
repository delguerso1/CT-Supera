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
    aluno = models.ForeignKey(Usuario, on_delete=models.CASCADE, limit_choices_to={"tipo": "aluno"}, related_name="mensalidades")
    valor = models.DecimalField(max_digits=7, decimal_places=2, default=150.00)  # 🔹 Valor padrão da mensalidade
    data_inicio = models.DateField(auto_now_add=True)  # 🔹 Define data de início automática
    data_vencimento = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pendente")
    observacoes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        hoje = timezone.now().date()

        if not self.data_vencimento:
            self.data_vencimento = self.data_inicio + timedelta(days=30)  # 🔹 Define vencimento automático

        if self.status == "pendente" and hoje > self.data_vencimento:
            self.status = "atrasado"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.aluno.get_full_name()} - R${self.valor} ({self.get_status_display()})"



class Despesa(models.Model):
    categoria = models.CharField(max_length=20, choices=CATEGORIAS_DESPESAS)
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={"tipo": "gerente"})
    descricao = models.TextField(blank=True)
    valor = models.DecimalField(max_digits=7, decimal_places=2)
    data = models.DateField(default=timezone.now)

    def __str__(self):
        return f"{self.get_categoria_display()} - R${self.valor} ({self.data})"


class Salario(models.Model):
    professor = models.ForeignKey(Usuario, on_delete=models.CASCADE, limit_choices_to={"tipo": "professor"})
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_pagamento = models.DateField()
    status = models.CharField(max_length=20, choices=[('pendente', 'Pendente'), ('pago', 'Pago')], default='pendente')

    def __str__(self):
        return f"{self.professor.get_full_name()} - R${self.valor} em {self.data_pagamento} ({self.status})"


class TransacaoPix(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('aprovado', 'Aprovado'),
        ('rejeitado', 'Rejeitado'),
        ('expirado', 'Expirado')
    ]

    mensalidade = models.ForeignKey(Mensalidade, on_delete=models.CASCADE, related_name='transacoes_pix')
    codigo_pix = models.TextField()  # Código PIX copia e cola
    qr_code = models.TextField()     # QR Code em base64
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_expiracao = models.DateTimeField()
    data_aprovacao = models.DateTimeField(null=True, blank=True)
    identificador_externo = models.CharField(max_length=100, unique=True)  # ID da transação no Mercado Pago

    def __str__(self):
        return f"PIX {self.identificador_externo} - {self.mensalidade.aluno.get_full_name()}"

    class Meta:
        verbose_name = "Transação PIX"
        verbose_name_plural = "Transações PIX"


class TransacaoBancaria(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('aprovado', 'Aprovado'),
        ('rejeitado', 'Rejeitado'),
        ('expirado', 'Expirado'),
        ('processando', 'Processando')
    ]

    mensalidade = models.ForeignKey(Mensalidade, on_delete=models.CASCADE, related_name='transacoes_bancarias')
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_expiracao = models.DateTimeField()
    data_aprovacao = models.DateTimeField(null=True, blank=True)
    identificador_externo = models.CharField(max_length=100, unique=True)  # ID da transação no Mercado Pago
    preference_id = models.CharField(max_length=100, blank=True, null=True)  # ID da preferência no Mercado Pago
    payment_url = models.URLField(blank=True, null=True)  # URL de pagamento
    metodo_pagamento = models.CharField(max_length=50, blank=True, null=True)  # Cartão de crédito, débito, etc.

    def __str__(self):
        return f"Bancário {self.identificador_externo} - {self.mensalidade.aluno.get_full_name()}"

    class Meta:
        verbose_name = "Transação Bancária"
        verbose_name_plural = "Transações Bancárias"
