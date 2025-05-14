from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('agendar-aula-experimental/', views.agendar_aula_experimental, name='agendar_aula_experimental'),
    path('painel/precadastros/', views.listar_precadastros, name='listar_precadastros'),
    path('painel/precadastro/<int:id_precadastro>/', views.atualizar_status_precadastro, name='atualizar_status_precadastro'),
    path('checkin/', views.realizar_checkin, name='realizar_checkin'),
    path('gerenciar-precadastros/', views.gerenciar_precadastros, name='gerenciar_precadastros'),
    path('confirmar-matricula/<int:precadastro_id>/', views.confirmar_matricula, name='confirmar_matricula'),
    path('recusar-matricula/<int:precadastro_id>/', views.recusar_matricula, name='recusar_matricula'),
    path("painel-aluno/", views.painel_aluno, name="painel_aluno"),
    path("reset-password/", auth_views.PasswordResetView.as_view(), name="password_reset"),
    path("reset-password/done/", auth_views.PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("reset-password/confirm/<uidb64>/<token>/", auth_views.PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("reset-password/complete/", auth_views.PasswordResetCompleteView.as_view(), name="password_reset_complete"),
    path("change-password/", auth_views.PasswordChangeView.as_view(), name="password_change"),
    path("change-password/done/", auth_views.PasswordChangeDoneView.as_view(), name="password_change_done"),
    path("atualizar/", views.atualizar_dados_aluno, name="atualizar_dados_aluno"),
]
