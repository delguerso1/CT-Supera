from django.urls import path
from . import views

app_name = 'turmas'

urlpatterns = [
    path('nova/', views.criar_turma, name='criar_turma'),
    path('<int:pk>/editar/', views.editar_turma, name='editar_turma'),
    path('<int:pk>/excluir/', views.excluir_turma, name='excluir_turma'),
    path('', views.lista_turmas, name='lista_turmas'),
]
