from django.contrib import admin
from .models import CentroDeTreinamento, SuperaNews, GaleriaFoto, CandidaturaTrabalho

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


@admin.register(CandidaturaTrabalho)
class CandidaturaTrabalhoAdmin(admin.ModelAdmin):
    list_display = (
        "nome_completo",
        "email",
        "tipo_vaga",
        "interesse_praia",
        "interesse_quadra",
        "data_envio",
    )
    list_filter = ("tipo_vaga", "data_envio", "interesse_praia", "interesse_quadra")
    search_fields = ("nome_completo", "email", "telefone", "mensagem")
    readonly_fields = ("data_envio",)
    ordering = ("-data_envio",)