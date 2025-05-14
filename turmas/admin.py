from django.contrib import admin
from .models import Turma

@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ("nome", "dia_semana", "horario", "ct", "professor")
    list_filter = ("dia_semana", "ct")
    search_fields = ("nome", "professor__nome")
    ordering = ["dia_semana", "horario"]
    actions = ["delete_selected"]
    