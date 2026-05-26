from django.urls import path

from wellhub.views import (
    CadastroWellhubDetailAPIView,
    CadastroWellhubListAPIView,
    WellhubReservaListAPIView,
    WellhubSyncSlotsAPIView,
    WellhubTurmasOpcoesAPIView,
    WellhubWebhookAPIView,
)

app_name = "wellhub"

urlpatterns = [
    path("webhook/", WellhubWebhookAPIView.as_view(), name="webhook"),
    path("turmas-opcoes/", WellhubTurmasOpcoesAPIView.as_view(), name="turmas_opcoes"),
    path("cadastros/", CadastroWellhubListAPIView.as_view(), name="cadastros_list"),
    path("cadastros/<int:pk>/", CadastroWellhubDetailAPIView.as_view(), name="cadastros_detail"),
    path("reservas/", WellhubReservaListAPIView.as_view(), name="reservas_list"),
    path("sync/slots/", WellhubSyncSlotsAPIView.as_view(), name="sync_slots"),
]
