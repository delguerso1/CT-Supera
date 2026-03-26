from django.urls import path
from .views import (
    RegistrarPresencaAPIView, PainelProfessorAPIView, AtualizarDadosProfessorAPIView,
    AtualizarDadosGerenteAPIView, PainelGerenteAPIView, ListaAlunosInativosPainelAPIView,
    ListarPrecadastrosAPIView, ConverterPrecadastroAPIView,
    HistoricoAulasProfessorAPIView, VerificarCheckinAlunosAPIView,
    RelatorioPresencaAPIView, CorrigirPresencaAPIView
)

urlpatterns = [
    path('registrar-presenca/<int:turma_id>/', RegistrarPresencaAPIView.as_view(), name='registrar_presenca_api'),
    path('verificar-checkin/<int:turma_id>/', VerificarCheckinAlunosAPIView.as_view(), name='verificar_checkin_alunos_api'),
    path('relatorio-presenca/', RelatorioPresencaAPIView.as_view(), name='relatorio_presenca_api'),
    path('corrigir-presenca/<int:presenca_id>/', CorrigirPresencaAPIView.as_view(), name='corrigir_presenca_api'),
    path('painel-professor/', PainelProfessorAPIView.as_view(), name='painel_professor_api'),
    path('atualizar-dados-professor/', AtualizarDadosProfessorAPIView.as_view(), name='atualizar_dados_professor_api'),
    path('atualizar-dados-gerente/', AtualizarDadosGerenteAPIView.as_view(), name='atualizar_dados_gerente_api'),
    path('painel-gerente/', PainelGerenteAPIView.as_view(), name='painel_gerente_api'),
    path('painel-gerente/alunos-inativos/', ListaAlunosInativosPainelAPIView.as_view(), name='lista_alunos_inativos_painel_api'),
    path('listar-precadastros/', ListarPrecadastrosAPIView.as_view(), name='listar_precadastros_api'),
    path('converter-precadastro/<int:precadastro_id>/', ConverterPrecadastroAPIView.as_view(), name='converter_precadastro_api'),
    path('historico-aulas-professor/', HistoricoAulasProfessorAPIView.as_view(), name='historico_aulas_professor_api'),
]