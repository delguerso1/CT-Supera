"""Permissões de acesso a usuários.

Fecham o IDOR/escalonamento de privilégio em /api/usuarios/: sem estas classes,
qualquer usuário autenticado (inclusive aluno) podia ler, editar, excluir ou
promover qualquer outro usuário pela API de detalhe.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS

STAFF_TIPOS = ("gerente", "professor")


def _tipo(user):
    return getattr(user, "tipo", None)


class IsGerente(BasePermission):
    """Somente gerentes autenticados."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _tipo(request.user) == "gerente")


class IsStaffCT(BasePermission):
    """Gerente ou professor autenticado (equipe do CT)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and _tipo(request.user) in STAFF_TIPOS
        )


class PodeAcessarUsuario(BasePermission):
    """
    Detalhe de usuário (GET/PUT/PATCH/DELETE em /api/usuarios/<id>/):

    - Gerente: acesso total a qualquer usuário.
    - Professor: pode ler e editar (equipe do CT); exclusão só de gerente.
    - Aluno/qualquer outro: somente o próprio registro, e não pode excluir.

    A blindagem de campos privilegiados (tipo, is_active, senha, salário...) é
    feita no serializer, que os ignora para quem não é gerente.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        tipo = _tipo(user)

        if tipo == "gerente":
            return True

        # Exclusão de usuários é exclusiva de gerente.
        if request.method == "DELETE":
            return False

        if tipo == "professor":
            return True

        # Aluno (ou outros): apenas o próprio registro.
        return obj.pk == user.pk
