from django.urls import path
from .views import (
    RegistrarPresencaAPIView, PainelProfessorAPIView, AtualizarDadosProfessorAPIView,
    AtualizarDadosGerenteAPIView, PainelGerenteAPIView, ListarPrecadastrosAPIView, ConverterPrecadastroAPIView,
    HistoricoAulasProfessorAPIView, VerificarCheckinAlunosAPIView
)

urlpatterns = [
    path('registrar-presenca/<int:turma_id>/', RegistrarPresencaAPIView.as_view(), name='registrar_presenca_api'),
    path('verificar-checkin/<int:turma_id>/', VerificarCheckinAlunosAPIView.as_view(), name='verificar_checkin_alunos_api'),
    path('painel-professor/', PainelProfessorAPIView.as_view(), name='painel_professor_api'),
    path('atualizar-dados-professor/', AtualizarDadosProfessorAPIView.as_view(), name='atualizar_dados_professor_api'),
    path('atualizar-dados-gerente/', AtualizarDadosGerenteAPIView.as_view(), name='atualizar_dados_gerente_api'),
    path('painel-gerente/', PainelGerenteAPIView.as_view(), name='painel_gerente_api'),
    path('listar-precadastros/', ListarPrecadastrosAPIView.as_view(), name='listar_precadastros_api'),
    path('converter-precadastro/<int:precadastro_id>/', ConverterPrecadastroAPIView.as_view(), name='converter_precadastro_api'),
    path('historico-aulas-professor/', HistoricoAulasProfessorAPIView.as_view(), name='historico_aulas_professor_api'),
]