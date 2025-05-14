from django.contrib import admin
from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ("cpf", "first_name", "tipo", "email", "is_active")  # 🔹 Agora usamos CPF!
    list_filter = ("tipo", "is_active")
    search_fields = ("cpf", "email", "first_name")
    ordering = ["cpf"]  # 🔹 Ordenação pelo CPF
    exclude = ("username",)  # 🔹 Esconde `username` no formulário do admin

    def ativar_usuario(self, request, queryset):
        queryset.update(is_active=True)
    ativar_usuario.short_description = "Ativar usuários selecionados"

    def desativar_usuario(self, request, queryset):
        queryset.update(is_active=False)
    desativar_usuario.short_description = "Desativar usuários selecionados"

    actions = [ativar_usuario, desativar_usuario]
