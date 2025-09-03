from django.urls import path
from .views import (
    MensalidadeListCreateView, MensalidadeRetrieveUpdateDestroyView,
    DespesaListCreateView, DespesaRetrieveUpdateDestroyView,
    SalarioListCreateView, SalarioRetrieveUpdateDestroyView,
    PagarSalarioAPIView, DashboardFinanceiroAPIView, RelatorioFinanceiroAPIView, GerarPixAPIView, ConsultarStatusPixAPIView,
    # GerarPagamentoPixAPIView, VerificarStatusPixAPIView, GerarPagamentoBancarioAPIView  # Comentado - usa Mercado Pago
)

app_name = "financeiro"

urlpatterns = [
    # Mensalidades API
    path('mensalidades/', MensalidadeListCreateView.as_view(), name='mensalidade_list_create'),
    path('mensalidades/<int:pk>/', MensalidadeRetrieveUpdateDestroyView.as_view(), name='mensalidade_detail'),
    path('mensalidades/<int:pk>/gerar-pix/', GerarPixAPIView.as_view(), name='gerar_pix'),
    path('mensalidades/<int:pk>/status-pix/', ConsultarStatusPixAPIView.as_view(), name='status_pix'),

    # Despesas API
    path('despesas/', DespesaListCreateView.as_view(), name='despesa_list_create'),
    path('despesas/<int:pk>/', DespesaRetrieveUpdateDestroyView.as_view(), name='despesa_detail'),

    # Salários API
    path('salarios/', SalarioListCreateView.as_view(), name='salario_list_create'),
    path('salarios/<int:pk>/', SalarioRetrieveUpdateDestroyView.as_view(), name='salario_detail'),
    path('pagar-salario/', PagarSalarioAPIView.as_view(), name='pagar_salario_api'),

    path('dashboard/', DashboardFinanceiroAPIView.as_view(), name='dashboard_financeiro_api'),

    # API para o relatório financeiro
    path('relatorio/', RelatorioFinanceiroAPIView.as_view(), name='relatorio_financeiro_api'),

    # Pagamentos PIX (comentado - usa Mercado Pago)
    # path('pix/gerar/<int:mensalidade_id>/', GerarPagamentoPixAPIView.as_view(), name='gerar-pagamento-pix'),
    # path('pix/status/<int:transacao_id>/', VerificarStatusPixAPIView.as_view(), name='verificar-status-pix'),
    
    # Pagamentos Bancários (comentado - usa Mercado Pago)
    # path('pagamento-bancario/gerar/<int:mensalidade_id>/', GerarPagamentoBancarioAPIView.as_view(), name='gerar-pagamento-bancario'),
]