from django.urls import path
from . import views

app_name = 'financeiro'

urlpatterns = [
    path('', views.listar_mensalidades, name='listar_mensalidades'),
    path('registrar/', views.registrar_mensalidade, name='registrar_mensalidade'),
    path('editar/<int:mensalidade_id>/', views.editar_mensalidade, name='editar_mensalidade'),
    path('excluir/<int:mensalidade_id>/', views.excluir_mensalidade, name='excluir_mensalidade'),
    path('recibo/<int:mensalidade_id>/', views.visualizar_recibo, name='visualizar_recibo'),
    path('dashboard/', views.dashboard_financeiro, name='dashboard_financeiro'),
]