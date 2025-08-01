from django.urls import path
from .views import ListaCTAPIView, CriarCTAPIView, EditarCTAPIView, ExcluirCTAPIView, DetalheCTAPIView

urlpatterns = [
    # Listar Centros de Treinamento
    path('', ListaCTAPIView.as_view(), name='lista_ct_api'),

    # Detalhar Centro de Treinamento
    path('<int:pk>/', DetalheCTAPIView.as_view(), name='detalhe_ct_api'),

    # Criar Centro de Treinamento
    path('criar/', CriarCTAPIView.as_view(), name='criar_ct_api'),

    # Editar Centro de Treinamento
    path('editar/<int:ct_id>/', EditarCTAPIView.as_view(), name='editar_ct_api'),

    # Excluir Centro de Treinamento
    path('excluir/<int:ct_id>/', ExcluirCTAPIView.as_view(), name='excluir_ct_api'),
]