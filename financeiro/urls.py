from django.urls import path
from .views import (
    MensalidadeListCreateView, MensalidadeRetrieveUpdateDestroyView,
    BaixarMensalidadeAPIView,
    DespesaListCreateView, DespesaRetrieveUpdateDestroyView,
    SalarioListCreateView, SalarioRetrieveUpdateDestroyView,
    PagarSalarioAPIView, DashboardFinanceiroAPIView, RelatorioFinanceiroAPIView, 
    GerarPixAPIView, ConsultarStatusPixAPIView, ConsultarStatusPixPorTransacaoAPIView,
    # Integração C6 Bank
    C6BankTestConnectionAPIView, C6BankCreatePixPaymentAPIView, C6BankCheckPaymentStatusAPIView,
    C6BankTransactionListAPIView, C6BankTransactionDetailAPIView, C6BankWebhookAPIView,
    CriarPagamentoBancarioAPIView, ConsultarCheckoutStatusAPIView,
    # API Bank Slip - Boletos
    GerarBoletoAPIView, ConsultarBoletoAPIView, AlterarBoletoAPIView,
    CancelarBoletoAPIView, DownloadBoletoPDFAPIView,
)

app_name = "financeiro"

urlpatterns = [
    # Mensalidades API
    path('mensalidades/', MensalidadeListCreateView.as_view(), name='mensalidade_list_create'),
    path('mensalidades/<int:pk>/', MensalidadeRetrieveUpdateDestroyView.as_view(), name='mensalidade_detail'),
    path('mensalidades/<int:pk>/dar-baixa/', BaixarMensalidadeAPIView.as_view(), name='mensalidade_dar_baixa'),
    path('mensalidades/<int:pk>/gerar-pix/', GerarPixAPIView.as_view(), name='gerar_pix'),
    path('mensalidades/<int:pk>/status-pix/', ConsultarStatusPixAPIView.as_view(), name='status_pix'),
    path('mensalidades/<int:pk>/gerar-boleto/', GerarBoletoAPIView.as_view(), name='gerar_boleto'),

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

    # Pagamentos PIX - Rotas alternativas para compatibilidade com frontend
    # Frontend chama: financeiro/pix/gerar/${mensalidadeId}/
    # Frontend chama: financeiro/pix/status/${transacaoId}/
    path('pix/gerar/<int:mensalidade_id>/', GerarPixAPIView.as_view(), name='gerar-pix-alt'),
    path('pix/status/<int:transacao_id>/', ConsultarStatusPixPorTransacaoAPIView.as_view(), name='status-pix-transacao'),
    
    # Pagamento Bancário (Cartão) - Checkout C6 Bank
    path('pagamento-bancario/gerar/<int:mensalidade_id>/', CriarPagamentoBancarioAPIView.as_view(), name='criar_pagamento_bancario'),
    path('checkout/status/<int:transacao_id>/', ConsultarCheckoutStatusAPIView.as_view(), name='consultar_checkout_status'),
    
    # ========================================
    # INTEGRAÇÃO C6 BANK
    # ========================================
    path('c6/test-connection/', C6BankTestConnectionAPIView.as_view(), name='c6_test_connection'),
    path('c6/create-pix-payment/', C6BankCreatePixPaymentAPIView.as_view(), name='c6_create_pix_payment'),
    path('c6/check-payment-status/<int:transacao_id>/', C6BankCheckPaymentStatusAPIView.as_view(), name='c6_check_payment_status'),
    path('c6/transactions/', C6BankTransactionListAPIView.as_view(), name='c6_transaction_list'),
    path('c6/transactions/<int:pk>/', C6BankTransactionDetailAPIView.as_view(), name='c6_transaction_detail'),
    path('c6/webhook/', C6BankWebhookAPIView.as_view(), name='c6_webhook'),
    
    # ========================================
    # API BANK SLIP - BOLETOS BANCÁRIOS
    # ========================================
    path('boletos/<int:transacao_id>/consultar/', ConsultarBoletoAPIView.as_view(), name='consultar_boleto'),
    path('boletos/<int:transacao_id>/alterar/', AlterarBoletoAPIView.as_view(), name='alterar_boleto'),
    path('boletos/<int:transacao_id>/cancelar/', CancelarBoletoAPIView.as_view(), name='cancelar_boleto'),
    path('boletos/<int:transacao_id>/pdf/', DownloadBoletoPDFAPIView.as_view(), name='download_boleto_pdf'),
]