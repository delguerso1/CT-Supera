
from django.contrib import admin
from .models import Mensalidade

@admin.register(Mensalidade)
class MensalidadeAdmin(admin.ModelAdmin):
    list_display = ['aluno', 'valor', 'data_vencimento', 'status', 'mensalidade_paga']
    list_filter = ['status']

    def mensalidade_paga(self, obj):
        return obj.status == 'pago'
    mensalidade_paga.boolean = True
    mensalidade_paga.short_description = "Pago"
