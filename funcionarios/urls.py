from django.urls import path
from . import views

app_name = "funcionarios"

urlpatterns = [
    # 🔹 Gestão de usuários dentro do app funcionários
    path("atualizar-dados-professor/", views.atualizar_dados_professor, name="atualizar_dados_professor"),
    path('converter-precadastro/<int:precadastro_id>/', views.converter_precadastro, name='converter_precadastro'),

    # 🔹 Registro de presença
    path("presenca/<int:turma_id>/", views.registrar_presenca, name="registrar_presenca"),

    # 🔹 Painéis
    path("painel-gerente/", views.painel_gerente, name="painel_gerente"),
    path("painel-professor/", views.painel_professor, name="painel_professor"),
]