from django.urls import path
from .views import (
     ListarPrecadastrosAPIView, EditarExcluirPrecadastroAPIView,
    FinalizarAgendamentoAPIView, LoginAPIView, LogoutAPIView, AtivarContaAPIView,
    ListarCriarUsuariosAPIView, EditarExcluirUsuarioAPIView, ReenviarConviteAPIView,
    SolicitarRecuperacaoSenhaAPIView, RedefinirSenhaAPIView
)

urlpatterns = [

    path('precadastros/', ListarPrecadastrosAPIView.as_view(), name='listar_precadastros_api'),
    path('precadastros/<int:pk>/', EditarExcluirPrecadastroAPIView.as_view(), name='editar_excluir_precadastro_api'),
    path('finalizar-agendamento/<int:precadastro_id>/', FinalizarAgendamentoAPIView.as_view(), name='finalizar_agendamento_api'),
    path('login/', LoginAPIView.as_view(), name='login_api'),
    path('logout/', LogoutAPIView.as_view(), name='logout_api'),
    path('ativar-conta/<str:uidb64>/<str:token>/', AtivarContaAPIView.as_view(), name='ativar_conta_api'),
    path('reenviar-convite/<int:usuario_id>/', ReenviarConviteAPIView.as_view(), name='reenviar_convite_api'),
    path('esqueci-senha/', SolicitarRecuperacaoSenhaAPIView.as_view(), name='solicitar_recuperacao_senha_api'),
    path('redefinir-senha/<str:uidb64>/<str:token>/', RedefinirSenhaAPIView.as_view(), name='redefinir_senha_api'),
    path('', ListarCriarUsuariosAPIView.as_view(), name='listar_criar_usuarios_api'),
    path('<int:pk>/', EditarExcluirUsuarioAPIView.as_view(), name='editar_excluir_usuario_api'),
]