import json
import logging

from django.db import models
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wellhub.filters import (
    parse_mes_param,
    parse_turma_id_param,
    reservas_filter_q,
    resolve_semana_filtro,
)
from wellhub.models import (
    CadastroWellhub,
    WellhubBooking,
    WellhubTurmaConfig,
    WellhubWebhookEvent,
)
from wellhub.permissions import IsGerente
from wellhub.serializers import (
    CadastroWellhubDetailSerializer,
    CadastroWellhubSerializer,
    WellhubBookingListSerializer,
)
from wellhub.services.bookings import handle_booking_cancel, handle_booking_requested
from wellhub.services.checkins import handle_checkin_occurred
from wellhub.services.sync_slots import sync_all_published_slots
from wellhub.webhooks import (
    extract_event_id,
    extract_event_type,
    is_cancel_event,
    is_checkin_event,
    is_late_cancel_event,
    is_requested_event,
    verify_gympass_signature,
)

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class WellhubWebhookAPIView(APIView):
    """
    Webhook único Wellhub (booking + demais eventos).
    URL: POST /api/wellhub/webhook/
    """

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        raw_body = request.body
        signature = request.headers.get("X-Gympass-Signature") or request.META.get(
            "HTTP_X_GYMPASS_SIGNATURE"
        )

        if not verify_gympass_signature(raw_body, signature):
            logger.warning("Webhook Wellhub: assinatura inválida")
            return JsonResponse({"error": "Assinatura inválida"}, status=403)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return JsonResponse({"error": "JSON inválido"}, status=400)

        if not isinstance(payload, dict):
            return JsonResponse({"error": "Payload deve ser objeto JSON"}, status=400)

        event_type = extract_event_type(payload)
        event_id = extract_event_id(payload, raw_body)

        if WellhubWebhookEvent.objects.filter(event_id=event_id, processed=True).exists():
            return JsonResponse({"status": "duplicate", "event_id": event_id})

        event, created = WellhubWebhookEvent.objects.get_or_create(
            event_id=event_id,
            defaults={"event_type": event_type, "payload": payload},
        )
        if not created and event.processed:
            return JsonResponse({"status": "duplicate", "event_id": event_id})

        event.event_type = event_type or event.event_type
        event.payload = payload
        event.save(update_fields=["event_type", "payload"])

        try:
            result = self._dispatch(event_type, payload)
            event.processed = True
            event.error_message = ""
            event.save(update_fields=["processed", "error_message"])
            return JsonResponse({"status": "ok", "result": result, "event_id": event_id})
        except Exception as exc:
            logger.exception("Erro processando webhook Wellhub: %s", exc)
            event.error_message = str(exc)[:2000]
            event.save(update_fields=["error_message"])
            return JsonResponse(
                {"status": "error", "message": str(exc), "event_id": event_id},
                status=200,
            )

    def _dispatch(self, event_type: str, payload: dict) -> dict:
        if is_requested_event(event_type):
            action, detail = handle_booking_requested(payload)
            return {"handler": "booking_requested", "action": action, "detail": detail}
        if is_late_cancel_event(event_type):
            action, detail = handle_booking_cancel(payload, late=True)
            return {"handler": "late_cancel", "action": action, "detail": detail}
        if is_cancel_event(event_type):
            action, detail = handle_booking_cancel(payload, late=False)
            return {"handler": "cancel", "action": action, "detail": detail}
        if is_checkin_event(event_type):
            action, detail = handle_checkin_occurred(payload)
            return {"handler": "checkin", "action": action, "detail": detail}
        logger.info("Webhook Wellhub ignorado (tipo=%s)", event_type)
        return {"handler": "ignored", "event_type": event_type}


class WellhubCadastroFilterMixin:
    """Lê ``mes`` (YYYY-MM), ``semana_inicio`` (YYYY-MM-DD) e ``turma_id``."""

    def get_filter_turma_id(self):
        return parse_turma_id_param(self.request.query_params.get("turma_id"))

    def get_filter_mes(self):
        return parse_mes_param(self.request.query_params.get("mes"))

    def get_filter_semana(self):
        mes = self.get_filter_mes()
        if not mes:
            return None
        return resolve_semana_filtro(
            mes,
            self.request.query_params.get("semana_inicio"),
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["turma_id"] = self.get_filter_turma_id()
        ctx["mes"] = self.get_filter_mes()
        ctx["semana"] = self.get_filter_semana()
        return ctx


class WellhubTurmasOpcoesAPIView(APIView):
    """Turmas publicadas na Wellhub (opções do filtro)."""

    permission_classes = [IsAuthenticated, IsGerente]

    def get(self, request):
        configs = (
            WellhubTurmaConfig.objects.filter(publicar_wellhub=True, turma__ativo=True)
            .select_related("turma", "turma__ct")
            .order_by("turma__horario")
        )
        data = [
            {
                "id": cfg.turma_id,
                "horario": cfg.turma.horario.strftime("%H:%M"),
                "ct_nome": cfg.turma.ct.nome,
                "label": f"{cfg.turma.horario.strftime('%H:%M')} — {cfg.turma.ct.nome}",
            }
            for cfg in configs
        ]
        return Response(data)


class CadastroWellhubListAPIView(WellhubCadastroFilterMixin, ListAPIView):
    serializer_class = CadastroWellhubSerializer
    permission_classes = [IsAuthenticated, IsGerente]
    pagination_class = None

    def get_queryset(self):
        qs = CadastroWellhub.objects.all()
        turma_id = self.get_filter_turma_id()
        mes = self.get_filter_mes()
        semana = self.get_filter_semana()
        filtro_reservas = reservas_filter_q(
            turma_id=turma_id,
            mes=mes,
            semana=semana,
        )
        if filtro_reservas:
            qs = qs.filter(filtro_reservas).distinct()

        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                models.Q(first_name__icontains=q)
                | models.Q(last_name__icontains=q)
                | models.Q(email__icontains=q)
                | models.Q(telefone__icontains=q)
            )
        return qs.order_by("-atualizado_em")


class CadastroWellhubDetailAPIView(WellhubCadastroFilterMixin, RetrieveUpdateAPIView):
    queryset = CadastroWellhub.objects.all()
    permission_classes = [IsAuthenticated, IsGerente]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CadastroWellhubDetailSerializer
        return CadastroWellhubSerializer


class WellhubReservaListAPIView(ListAPIView):
    serializer_class = WellhubBookingListSerializer
    permission_classes = [IsAuthenticated, IsGerente]
    pagination_class = None

    def get_queryset(self):
        qs = WellhubBooking.objects.select_related(
            "slot", "slot__turma", "slot__turma__ct", "cadastro"
        ).order_by("-criado_em")

        status_param = self.request.query_params.get("status", "").strip()
        if status_param:
            qs = qs.filter(status=status_param)

        data_param = self.request.query_params.get("data", "").strip()
        if data_param:
            qs = qs.filter(slot__data_aula=data_param)

        turma_id = self.request.query_params.get("turma_id", "").strip()
        if turma_id.isdigit():
            qs = qs.filter(slot__turma_id=int(turma_id))

        return qs


class WellhubSyncSlotsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsGerente]

    def post(self, request):
        stats = sync_all_published_slots(call_api=True)
        return Response({"message": "Sincronização concluída.", "stats": stats})
