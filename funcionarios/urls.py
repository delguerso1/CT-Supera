from django.urls import path
from . import views

urlpatterns = [
    # 🔹 Gestão de funcionários
    path('cadastrar/', views.cadastrar_funcionario, name='cadastrar_funcionario'),
    path('lista/', views.lista_funcionarios, name='lista_funcionarios'),
    path('editar/<int:funcionario_id>/', views.editar_funcionario, name='editar_funcionario'),
    path('excluir/<int:funcionario_id>/', views.excluir_funcionario, name='excluir_funcionario'),
    path("atualizar-dados-professor/", views.atualizar_dados_professor, name="atualizar_dados_professor"),

    # 🔹 Registro de presença
    path('presenca/<int:turma_id>/', views.registrar_presenca, name='registrar_presenca'),

    # 🔹 Painéis
    path("painel-gerente/", views.painel_gerente, name="painel_gerente"),
    path("painel-professor/", views.painel_professor, name="painel_professor"),
]