from django.contrib import admin
from .models import Mensalidade, Despesa

@admin.register(Mensalidade)
class MensalidadeAdmin(admin.ModelAdmin):
    list_display = ["aluno", "formatar_valor", "data_vencimento", "status", "mensalidade_paga"]
    list_filter = ["status", "data_vencimento"]
    search_fields = ["aluno__user__username", "aluno__user__first_name", "aluno__user__last_name"]
    ordering = ["-data_vencimento"]

    def mensalidade_paga(self, obj):
        return obj.status == "pago"
    mensalidade_paga.boolean = True
    mensalidade_paga.short_description = "Pago"

    def formatar_valor(self, obj):
        return f"R$ {obj.valor:.2f}"
    formatar_valor.short_description = "Valor"

@admin.register(Despesa)
class DespesaAdmin(admin.ModelAdmin):
    list_display = ("categoria", "usuario", "valor", "data", "descricao")  # 🔹 Substituí `funcionario` por `usuario`
    list_filter = ["categoria", "usuario", "data"]
    search_fields = ("usuario__username", "descricao")  # 🔹 Corrigido erro aqui
    ordering = ["-data"]
    date_hierarchy = "data"
    list_per_page = 20
