"""Permissões do módulo financeiro.

Sem elas, qualquer usuário autenticado (inclusive aluno) listava mensalidades,
despesas, salários e cobranças PIX, e conseguia marcar pagamento sem receber.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from usuarios.permissions import IsGerente


class PodeConsultarMensalidade(BasePermission):
    """
    Gerente: lê e grava mensalidades.
    Aluno: somente leitura; o queryset da view limita às parcelas da própria conta.
    Professor e demais perfis: sem acesso a esta listagem.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        tipo = getattr(user, "tipo", None)
        if tipo == "gerente":
            return True
        return request.method in SAFE_METHODS and tipo == "aluno"


__all__ = ["IsGerente", "PodeConsultarMensalidade"]
