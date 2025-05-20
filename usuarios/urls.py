from django.urls import path
from . import views
from django.contrib.auth import views as auth_views


app_name = "usuarios"

urlpatterns = [
    # 🔹 Rota para o painel do usuário
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),

    # 🔹 Rota para ativação da conta via link enviado por e-mail
    path("ativar-conta/<uidb64>/<token>/", views.ativar_conta, name="ativar_conta"),

    # 🔹 Rota para Agendamento de Aula Experimental
    path("agendar-aula-experimental/", views.agendar_aula_experimental, name="agendar_aula_experimental"),

    # 🔹 Rota para CRUD Pré cadastro

    path("precadastros/lista/", views.listar_precadastros, name="listar_precadastros"),
    path("precadastros/editar/<int:precadastro_id>/", views.editar_precadastro, name="editar_precadastro"),
    path("precadastros/excluir/<int:precadastro_id>/", views.excluir_precadastro, name="excluir_precadastro"),
    path("precadastros/cadastrar/", views.cadastrar_precadastro, name="cadastrar_precadastro"),


    # 🔹 Rota para CRUD de usuários
    path("editar/<int:usuario_id>/", views.editar_usuario, name="editar_usuario"),
    path("excluir/<int:usuario_id>/", views.excluir_usuario, name="excluir_usuario"),
    path("lista/", views.lista_usuarios, name="lista_usuarios"),
    path("cadastrar/", views.cadastrar_usuario, name="cadastrar_usuario"),

    # 🔹 Redefinição e mudança de senha
    path("reset-password/", auth_views.PasswordResetView.as_view(), name="password_reset"),
    path("reset-password/done/", auth_views.PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("reset-password/confirm/<uidb64>/<token>/", auth_views.PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("reset-password/complete/", auth_views.PasswordResetCompleteView.as_view(), name="password_reset_complete"),
    path("change-password/", auth_views.PasswordChangeView.as_view(), name="password_change"),
    path("change-password/done/", auth_views.PasswordChangeDoneView.as_view(), name="password_change_done"),
    

]