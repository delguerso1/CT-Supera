from django.contrib import admin
from .models import CentroDeTreinamento

@admin.register(CentroDeTreinamento)
class CentroDeTreinamentoAdmin(admin.ModelAdmin):
    list_display = ("nome", "endereco")
    search_fields = ("nome",)
    list_filter = ("nome",)