from django.urls import path
from . import views

app_name = "financeiro"

urlpatterns = [
    path("", views.listar_mensalidades, name="listar_mensalidades"),
    path("registrar/", views.registrar_mensalidade, name="registrar_mensalidade"),
    path("editar/<int:mensalidade_id>/", views.editar_mensalidade, name="editar_mensalidade"),
    path("excluir/<int:mensalidade_id>/", views.excluir_mensalidade, name="excluir_mensalidade"),
    path("recibo/<int:mensalidade_id>/", views.visualizar_recibo, name="visualizar_recibo"),
    path("dashboard-financeiro/", views.dashboard_financeiro, name="dashboard_financeiro"),

    # URLs de despesas
    path("despesas/", views.listar_despesas, name="listar_despesas"),
    path("despesas/registrar/", views.registrar_despesa, name="registrar_despesa"),
    path("despesas/editar/<int:despesa_id>/", views.editar_despesa, name="editar_despesa"),
    path("despesas/excluir/<int:despesa_id>/", views.excluir_despesa, name="excluir_despesa"),

    # URLs de relatório financeiro
    path("relatorio-financeiro/", views.relatorio_financeiro, name="relatorio_financeiro"),
]