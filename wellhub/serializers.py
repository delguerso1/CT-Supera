from rest_framework import serializers

from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot
from wellhub.filters import filter_reservas_queryset
from usuarios.utils import normalizar_telefone_br_para_precadastro
from app.date_api import format_data_api

STATUS_RESERVA_LABELS = {
    "requested": "Solicitada",
    "confirmed": "Confirmada",
    "rejected": "Rejeitada",
    "cancelled": "Cancelada",
    "late_cancelled": "Cancelamento tardio",
}


def _reservas_context(serializer) -> tuple:
    turma_id = serializer.context.get("turma_id")
    mes = serializer.context.get("mes")
    semana = serializer.context.get("semana")
    return turma_id, mes, semana


def _reservas_do_cadastro(serializer, obj):
    qs = obj.reservas.select_related("slot", "slot__turma", "slot__turma__ct")
    turma_id, mes, semana = _reservas_context(serializer)
    return filter_reservas_queryset(qs, turma_id, mes, semana)


def _serialize_ultima_reserva(booking):
    if not booking:
        return None
    status = booking.status
    return {
        "id": booking.id,
        "status": status,
        "status_display": STATUS_RESERVA_LABELS.get(status, status),
        "data_aula": format_data_api(booking.slot.data_aula),
        "horario": booking.slot.turma.horario.strftime("%H:%M"),
        "turma_id": booking.slot.turma_id,
    }


class CadastroWellhubSerializer(serializers.ModelSerializer):
    nome_completo = serializers.SerializerMethodField()
    ultima_reserva = serializers.SerializerMethodField()

    class Meta:
        model = CadastroWellhub
        fields = [
            "id",
            "wellhub_user_id",
            "first_name",
            "last_name",
            "nome_completo",
            "email",
            "telefone",
            "observacoes",
            "criado_em",
            "atualizado_em",
            "ultima_reserva",
        ]
        read_only_fields = ["id", "wellhub_user_id", "criado_em", "atualizado_em"]

    def get_nome_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_ultima_reserva(self, obj):
        booking = _reservas_do_cadastro(self, obj).order_by("-criado_em").first()
        return _serialize_ultima_reserva(booking)

    def validate_telefone(self, value):
        if not value:
            return value
        return normalizar_telefone_br_para_precadastro(value)


class CadastroWellhubDetailSerializer(CadastroWellhubSerializer):
    reservas = serializers.SerializerMethodField()

    class Meta(CadastroWellhubSerializer.Meta):
        fields = CadastroWellhubSerializer.Meta.fields + ["reservas"]

    def get_reservas(self, obj):
        qs = _reservas_do_cadastro(self, obj).order_by("-criado_em")[:50]
        return WellhubBookingListSerializer(qs, many=True).data


class WellhubBookingListSerializer(serializers.ModelSerializer):
    cadastro_nome = serializers.SerializerMethodField()
    data_aula = serializers.SerializerMethodField()
    turma_horario = serializers.SerializerMethodField()
    turma_ct = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = WellhubBooking
        fields = [
            "id",
            "wellhub_booking_id",
            "status",
            "status_display",
            "late_cancel",
            "cadastro",
            "cadastro_nome",
            "slot",
            "data_aula",
            "turma_horario",
            "turma_ct",
            "criado_em",
        ]

    def get_cadastro_nome(self, obj):
        if obj.cadastro:
            return str(obj.cadastro)
        return "—"

    def get_status_display(self, obj):
        return STATUS_RESERVA_LABELS.get(obj.status, obj.status)

    def get_data_aula(self, obj):
        return format_data_api(obj.slot.data_aula)

    def get_turma_horario(self, obj):
        return obj.slot.turma.horario.strftime("%H:%M")

    def get_turma_ct(self, obj):
        return obj.slot.turma.ct.nome
