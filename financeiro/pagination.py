"""
Paginação customizada para o módulo financeiro.
Permite page_size maior em listagens filtradas (ex: mensalidades do mês).
"""
from rest_framework.pagination import PageNumberPagination


class MensalidadePagination(PageNumberPagination):
    """Paginação para mensalidades: permite até 500 itens por página."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500
