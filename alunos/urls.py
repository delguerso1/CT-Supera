from django.urls import path
from .views import (
    HistoricoPagamentosAPIView, RealizarPagamentoAPIView, PagamentoEmDiaAPIView,
    PainelAlunoAPIView, RealizarCheckinAPIView
)

urlpatterns = [
    # Histórico de pagamentos
    path('historico-pagamentos/', HistoricoPagamentosAPIView.as_view(), name='historico_pagamentos_api'),

    # Realizar pagamento
    path('realizar-pagamento/<int:mensalidade_id>/', RealizarPagamentoAPIView.as_view(), name='realizar_pagamento_api'),

    # Verificar pagamento em dia
    path('pagamento-em-dia/', PagamentoEmDiaAPIView.as_view(), name='pagamento_em_dia_api'),

    # Painel do aluno
    path('painel-aluno/', PainelAlunoAPIView.as_view(), name='painel_aluno_api'),

    # Realizar check-in
    path('realizar-checkin/', RealizarCheckinAPIView.as_view(), name='realizar_checkin_api'),
]