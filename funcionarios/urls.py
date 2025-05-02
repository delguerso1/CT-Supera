from django.urls import path
from . import views

urlpatterns = [
    path('cadastrar/', views.cadastrar_funcionario, name='cadastrar_funcionario'),
    path('lista/', views.lista_funcionarios, name='lista_funcionarios'),
    path('editar/<int:funcionario_id>/', views.editar_funcionario, name='editar_funcionario'),
path('excluir/<int:funcionario_id>/', views.excluir_funcionario, name='excluir_funcionario'),
]