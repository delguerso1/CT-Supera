from django.contrib import admin

from wellhub.models import (
    CadastroWellhub,
    WellhubBooking,
    WellhubGymConfig,
    WellhubSlot,
    WellhubTurmaConfig,
    WellhubWebhookEvent,
)


@admin.register(WellhubGymConfig)
class WellhubGymConfigAdmin(admin.ModelAdmin):
    list_display = ("ct", "gym_id", "product_id", "ativo")


@admin.register(WellhubTurmaConfig)
class WellhubTurmaConfigAdmin(admin.ModelAdmin):
    list_display = ("turma", "wellhub_class_id", "publicar_wellhub", "cota_wellhub")
    list_filter = ("publicar_wellhub",)


@admin.register(WellhubSlot)
class WellhubSlotAdmin(admin.ModelAdmin):
    list_display = (
        "turma",
        "data_aula",
        "wellhub_slot_id",
        "total_capacity",
        "total_booked",
        "sync_status",
    )
    list_filter = ("sync_status", "data_aula")


@admin.register(CadastroWellhub)
class CadastroWellhubAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "telefone", "wellhub_user_id", "atualizado_em")
    search_fields = ("first_name", "last_name", "email", "telefone", "wellhub_user_id")


@admin.register(WellhubBooking)
class WellhubBookingAdmin(admin.ModelAdmin):
    list_display = ("wellhub_booking_id", "slot", "cadastro", "status", "late_cancel", "criado_em")
    list_filter = ("status", "late_cancel")


@admin.register(WellhubWebhookEvent)
class WellhubWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("event_id", "event_type", "processed", "criado_em")
    list_filter = ("processed", "event_type")
    readonly_fields = ("payload",)
