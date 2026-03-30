from django.db import IntegrityError, models
from django.db.models import UniqueConstraint
from django.db.models.functions import ExtractMonth, ExtractYear
from django.utils import timezone
from datetime import timedelta, date
from calendar import monthrange
from usuarios.models import Usuario


def _hoje_br():
    return timezone.now().date()

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
    valor_pago = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Valor efetivamente recebido (com multa/juros quando aplicável). Se nulo, considera-se o valor base."
    )
    data_inicio = models.DateField(auto_now_add=True)  # 🔹 Define data de início automática
    data_vencimento = models.DateField()
    data_pagamento = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pendente")
    observacoes = models.TextField(blank=True, null=True)

    @property
    def status_efetivo(self):
        """
        Status para exibição e filtros:
        - pago: registrado como pago
        - atrasado: não pago e já passou o dia de vencimento
        - pendente: não pago e ainda não venceu (hoje <= vencimento)
        """
        if self.status == "pago":
            return "pago"
        hoje = _hoje_br()
        if self.data_vencimento and hoje > self.data_vencimento:
            return "atrasado"
        return "pendente"

    def save(self, *args, **kwargs):
        hoje = _hoje_br()

        if not self.data_vencimento:
            self.data_vencimento = self.data_inicio + timedelta(days=30)  # 🔹 Define vencimento automático

        if self.status == "pago":
            if not self.data_pagamento:
                self.data_pagamento = timezone.now()
        else:
            # Mantém o registro alinhado: pendente vs atrasado conforme a data
            if hoje > self.data_vencimento:
                self.status = "atrasado"
            else:
                self.status = "pendente"

        super().save(*args, **kwargs)

    @staticmethod
    def _calcular_data_vencimento(aluno, ano, mes, dia_referencia):
        dia_vencimento = aluno.dia_vencimento or dia_referencia
        try:
            dia_vencimento = int(dia_vencimento)
        except (TypeError, ValueError):
            dia_vencimento = dia_referencia
        ultimo_dia = monthrange(ano, mes)[1]
        dia_vencimento = min(dia_vencimento, ultimo_dia)
        return date(ano, mes, dia_vencimento)

    @classmethod
    def criar_proxima_mensalidade(cls, mensalidade_base):
        referencia = mensalidade_base.data_vencimento
        if not referencia:
            return None
        ano = referencia.year + 1 if referencia.month == 12 else referencia.year
        mes = 1 if referencia.month == 12 else referencia.month + 1
        data_vencimento = cls._calcular_data_vencimento(
            mensalidade_base.aluno,
            ano,
            mes,
            referencia.day
        )
        existe = cls.objects.filter(
            aluno=mensalidade_base.aluno,
            data_vencimento__year=ano,
            data_vencimento__month=mes
        ).exists()
        if existe:
            return None
        valor = mensalidade_base.aluno.valor_mensalidade or mensalidade_base.valor
        try:
            return cls.objects.create(
                aluno=mensalidade_base.aluno,
                valor=valor,
                data_vencimento=data_vencimento,
            )
        except IntegrityError:
            return None

    class Meta:
        constraints = [
            UniqueConstraint(
                'aluno',
                ExtractYear('data_vencimento'),
                ExtractMonth('data_vencimento'),
                name='uniq_mensalidade_aluno_ano_mes',
            ),
        ]

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
    competencia = models.DateField(
        help_text="Primeiro dia do mês de competência (ex.: 01/03/2026 para março/2026).",
    )
    data_pagamento = models.DateField(
        null=True,
        blank=True,
        help_text="Data em que o pagamento foi efetivado (preenchido ao marcar como pago).",
    )
    status = models.CharField(max_length=20, choices=[('pendente', 'Pendente'), ('pago', 'Pago')], default='pendente')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["professor", "competencia"],
                name="financeiro_salario_unique_professor_competencia",
            )
        ]

    def __str__(self):
        comp = self.competencia.strftime("%m/%Y") if self.competencia else "?"
        return f"{self.professor.get_full_name()} - R${self.valor} ({comp}) ({self.status})"


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
    identificador_externo = models.CharField(max_length=100, unique=True)  # ID da transação externa

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
    identificador_externo = models.CharField(max_length=100, unique=True)  # ID da transação externa
    preference_id = models.CharField(max_length=100, blank=True, null=True)  # ID da preferência externa
    payment_url = models.URLField(blank=True, null=True)  # URL de pagamento
    metodo_pagamento = models.CharField(max_length=50, blank=True, null=True)  # Cartão de crédito, débito, etc.

    def __str__(self):
        return f"Bancário {self.identificador_externo} - {self.mensalidade.aluno.get_full_name()}"

    class Meta:
        verbose_name = "Transação Bancária"
        verbose_name_plural = "Transações Bancárias"


class TransacaoC6Bank(models.Model):
    """
    Modelo para transações específicas do C6 Bank
    """
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('aprovado', 'Aprovado'),
        ('rejeitado', 'Rejeitado'),
        ('expirado', 'Expirado'),
        ('processando', 'Processando'),
        ('cancelado', 'Cancelado')
    ]
    
    TIPO_CHOICES = [
        ('pix', 'PIX'),
        ('boleto', 'Boleto'),
        ('cartao', 'Cartão de Crédito/Débito'),
        ('transferencia', 'Transferência Bancária')
    ]

    mensalidade = models.ForeignKey(Mensalidade, on_delete=models.CASCADE, related_name='transacoes_c6')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='pix')
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    
    # Dados específicos do C6 Bank
    txid = models.CharField(max_length=100, unique=True, blank=True, null=True)  # ID da transação no C6 Bank
    chave_pix = models.CharField(max_length=100, blank=True, null=True)  # Chave PIX do recebedor
    qr_code = models.TextField(blank=True, null=True)  # QR Code em base64
    codigo_pix = models.TextField(blank=True, null=True)  # Código PIX copia e cola
    
    # URLs e dados de pagamento
    payment_url = models.URLField(blank=True, null=True)  # URL de pagamento
    boleto_url = models.URLField(blank=True, null=True)  # URL do boleto
    boleto_codigo = models.CharField(max_length=100, blank=True, null=True)  # Código do boleto
    
    # Timestamps
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_expiracao = models.DateTimeField()
    data_aprovacao = models.DateTimeField(null=True, blank=True)
    data_cancelamento = models.DateTimeField(null=True, blank=True)
    
    # Dados adicionais
    descricao = models.TextField(blank=True, null=True)
    observacoes = models.TextField(blank=True, null=True)
    
    # Dados de resposta da API
    resposta_api = models.JSONField(blank=True, null=True)  # Resposta completa da API
    erro_api = models.TextField(blank=True, null=True)  # Mensagem de erro da API

    def __str__(self):
        return f"C6 Bank {self.tipo.upper()} - {self.mensalidade.aluno.get_full_name()} - R$ {self.valor}"

    class Meta:
        verbose_name = "Transação C6 Bank"
        verbose_name_plural = "Transações C6 Bank"
        ordering = ['-data_criacao']