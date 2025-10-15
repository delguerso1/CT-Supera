from django.contrib import admin
from .models import CentroDeTreinamento, SuperaNews, GaleriaFoto

@admin.register(CentroDeTreinamento)
class CentroDeTreinamentoAdmin(admin.ModelAdmin):
    list_display = ("nome", "endereco")
    search_fields = ("nome",)
    list_filter = ("nome",)


@admin.register(SuperaNews)
class SuperaNewsAdmin(admin.ModelAdmin):
    list_display = ("titulo", "autor", "data_criacao", "ativo")
    search_fields = ("titulo", "descricao")
    list_filter = ("ativo", "data_criacao", "autor")
    readonly_fields = ("data_criacao", "data_atualizacao")


@admin.register(GaleriaFoto)
class GaleriaFotoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "autor", "data_criacao", "ativo")
    search_fields = ("titulo", "descricao")
    list_filter = ("ativo", "data_criacao", "autor")
    readonly_fields = ("data_criacao", "data_atualizacao")