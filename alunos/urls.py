# alunos/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('login/aluno/', views.aluno_login, name='login_aluno'),
    path('agendar-aula-experimental/', views.agendar_aula_experimental, name='agendar_aula_experimental'),
    path('painel/precadastros/', views.listar_precadastros, name='listar_precadastros'),
    path('painel/precadastro/<int:id_precadastro>/', views.atualizar_status_precadastro, name='atualizar_status_precadastro'),
    path('checkin/', views.realizar_checkin, name='realizar_checkin'),
    path('gerenciar-precadastros/', views.gerenciar_precadastros, name='gerenciar_precadastros'),
    path('confirmar-matricula/<int:precadastro_id>/', views.confirmar_matricula, name='confirmar_matricula'),
    path('recusar-matricula/<int:precadastro_id>/', views.recusar_matricula, name='recusar_matricula'),
]
