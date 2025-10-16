from django.urls import path
from .views import ListaCriarTurmasAPIView, EditarExcluirTurmaAPIView, ListaAlunosTurmaAPIView, AdicionarAlunoAPIView, RemoverAlunoAPIView, ListaDiasSemanaAPIView

urlpatterns = [
    # Listar e criar turmas
    path('', ListaCriarTurmasAPIView.as_view(), name='lista_criar_turmas_api'),

    # Editar, excluir ou visualizar uma turma
    path('<int:pk>/', EditarExcluirTurmaAPIView.as_view(), name='editar_excluir_turma_api'),

    # Listar alunos de uma turma
    path('<int:turma_id>/alunos/', ListaAlunosTurmaAPIView.as_view(), name='lista_alunos_turma_api'),

    # Adicionar alunos a uma turma
    path('<int:turma_id>/adicionar-alunos/', AdicionarAlunoAPIView.as_view(), name='adicionar_aluno_api'),

    # Remover alunos de uma turma
    path('<int:turma_id>/remover-alunos/', RemoverAlunoAPIView.as_view(), name='remover_aluno_api'),

    # Listar dias da semana
    path('diassemana/', ListaDiasSemanaAPIView.as_view(), name='lista_dias_semana_api'),
]