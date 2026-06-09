from django.db import models


class WellhubGymConfig(models.Model):
    """Configuração Wellhub por centro de treinamento."""

    ct = models.OneToOneField(
        "ct.CentroDeTreinamento",
        on_delete=models.CASCADE,
        related_name="wellhub_config",
    )
    gym_id = models.PositiveIntegerField(help_text="Identificador da academia na Wellhub.")
    product_id = models.PositiveIntegerField(default=1)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Configuração Wellhub (CT)"
        verbose_name_plural = "Configurações Wellhub (CT)"

    def __str__(self):
        return f"Wellhub {self.gym_id} — {self.ct.nome}"


class WellhubTurmaConfig(models.Model):
    """Turma publicada na Booking API Wellhub."""

    turma = models.OneToOneField(
        "turmas.Turma",
        on_delete=models.CASCADE,
        related_name="wellhub_config",
    )
    wellhub_class_id = models.CharField(max_length=64, blank=True, default="")
    publicar_wellhub = models.BooleanField(default=False)
    cota_wellhub = models.PositiveIntegerField(default=5)

    class Meta:
        verbose_name = "Configuração Wellhub (Turma)"
        verbose_name_plural = "Configurações Wellhub (Turma)"

    def __str__(self):
        return f"Wellhub turma {self.turma_id} (class={self.wellhub_class_id or '—'})"


class WellhubSlot(models.Model):
    """Ocorrência de aula sincronizada como slot na Wellhub."""

    SYNC_PENDING = "pending"
    SYNC_OK = "ok"
    SYNC_ERROR = "error"
    SYNC_CHOICES = [
        (SYNC_PENDING, "Pendente"),
        (SYNC_OK, "OK"),
        (SYNC_ERROR, "Erro"),
    ]

    turma = models.ForeignKey(
        "turmas.Turma",
        on_delete=models.CASCADE,
        related_name="wellhub_slots",
    )
    data_aula = models.DateField()
    occur_date = models.DateTimeField()
    wellhub_slot_id = models.CharField(max_length=64, blank=True, default="")
    total_capacity = models.PositiveIntegerField(default=5)
    total_booked = models.PositiveIntegerField(default=0)
    opens_at = models.DateTimeField()
    closes_at = models.DateTimeField()
    sync_status = models.CharField(
        max_length=16, choices=SYNC_CHOICES, default=SYNC_PENDING
    )
    sync_error = models.TextField(blank=True, default="")
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Slot Wellhub"
        verbose_name_plural = "Slots Wellhub"
        unique_together = ("turma", "data_aula")
        ordering = ["occur_date"]

    def __str__(self):
        return f"Slot {self.turma_id} {self.data_aula}"


class CadastroWellhub(models.Model):
    """Cadastro exclusivo de clientes Wellhub (separado de PreCadastro)."""

    wellhub_user_id = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="Identificador estável do usuário na Wellhub (gpw-id, gympass-id, etc.).",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    telefone = models.CharField(max_length=20, blank=True, default="")
    observacoes = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cadastro Wellhub"
        verbose_name_plural = "Cadastros Wellhub"
        ordering = ["-atualizado_em"]

    def __str__(self):
        nome = f"{self.first_name} {self.last_name}".strip()
        return nome or f"Cadastro Wellhub #{self.pk}"


class WellhubBooking(models.Model):
    """Reserva originada na Wellhub."""

    STATUS_CHOICES = [
        ("requested", "Solicitada"),
        ("confirmed", "Confirmada"),
        ("rejected", "Rejeitada"),
        ("cancelled", "Cancelada"),
        ("late_cancelled", "Cancelamento tardio"),
    ]

    wellhub_booking_id = models.CharField(max_length=64, unique=True)
    slot = models.ForeignKey(
        WellhubSlot,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    cadastro = models.ForeignKey(
        CadastroWellhub,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservas",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="requested")
    late_cancel = models.BooleanField(default=False)
    presenca_confirmada = models.BooleanField(
        default=False,
        help_text="Professor confirmou comparecimento na aula.",
    )
    ausencia_registrada = models.BooleanField(
        default=False,
        help_text="Professor registrou falta para a aula do dia.",
    )
    checkin_validado = models.BooleanField(
        default=False,
        help_text="Check-in confirmado na Wellhub via Access Validate.",
    )
    checkin_validado_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Momento em que o Access Validate foi aceito pela Wellhub.",
    )
    checkin_validate_response = models.JSONField(
        default=dict,
        blank=True,
        help_text="Resposta da API POST /access/v1/validate.",
    )
    payload = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Reserva Wellhub"
        verbose_name_plural = "Reservas Wellhub"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"Booking {self.wellhub_booking_id} ({self.status})"


class WellhubWebhookEvent(models.Model):
    """Auditoria e idempotência de webhooks Wellhub."""

    event_id = models.CharField(max_length=128, unique=True)
    event_type = models.CharField(max_length=64, blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)
    processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Evento webhook Wellhub"
        verbose_name_plural = "Eventos webhook Wellhub"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.event_type or 'event'} ({self.event_id})"
