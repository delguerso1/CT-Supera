from django.contrib import admin
from .models import Turma

class TurmaAdmin(admin.ModelAdmin):
    list_display = ["display_dias_semana", "horario", "capacidade_maxima", "professor"]  # 🔹 Alterado para `dias_semana`
    list_filter = ["dias_semana", "horario", "professor"]
    ordering = ["horario"]  # 🔹 Removi `dia_semana` do ordering

    def display_dias_semana(self, obj):
        return ", ".join([dia.nome for dia in obj.dias_semana.all()])  # 🔹 Mostra os dias selecionados
    display_dias_semana.short_description = "Dias da Semana"

admin.site.register(Turma, TurmaAdmin)