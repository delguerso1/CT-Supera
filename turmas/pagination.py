"""Paginação da listagem de turmas: permite ?page_size= no cliente (Expo / web)."""

from rest_framework.pagination import PageNumberPagination


class TurmaListPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 2000
