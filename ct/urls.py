from django.urls import path
from .views import (
    ListaCTAPIView, CriarCTAPIView, EditarCTAPIView, ExcluirCTAPIView, DetalheCTAPIView,
    ListarSuperaNewsAPIView, CriarSuperaNewsAPIView, EditarSuperaNewsAPIView, ExcluirSuperaNewsAPIView,
    ListarGaleriaFotosAPIView, CriarGaleriaFotoAPIView, EditarGaleriaFotoAPIView, ExcluirGaleriaFotoAPIView
)

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

    # ========== SUPERA NEWS ==========
    # Listar notícias
    path('supera-news/', ListarSuperaNewsAPIView.as_view(), name='listar_supera_news'),
    
    # Criar notícia
    path('supera-news/criar/', CriarSuperaNewsAPIView.as_view(), name='criar_supera_news'),
    
    # Editar notícia
    path('supera-news/editar/<int:pk>/', EditarSuperaNewsAPIView.as_view(), name='editar_supera_news'),
    
    # Excluir notícia
    path('supera-news/excluir/<int:pk>/', ExcluirSuperaNewsAPIView.as_view(), name='excluir_supera_news'),

    # ========== GALERIA DE FOTOS ==========
    # Listar fotos
    path('galeria/', ListarGaleriaFotosAPIView.as_view(), name='listar_galeria_fotos'),
    
    # Criar foto
    path('galeria/criar/', CriarGaleriaFotoAPIView.as_view(), name='criar_galeria_foto'),
    
    # Editar foto
    path('galeria/editar/<int:pk>/', EditarGaleriaFotoAPIView.as_view(), name='editar_galeria_foto'),
    
    # Excluir foto
    path('galeria/excluir/<int:pk>/', ExcluirGaleriaFotoAPIView.as_view(), name='excluir_galeria_foto'),
]