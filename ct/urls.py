from django.urls import path
from . import views

app_name = "ct"

urlpatterns = [
    path("", views.lista_ct, name="lista_ct"),
    path("criar/", views.criar_ct, name="criar_ct"),
    path("editar/<int:ct_id>/", views.editar_ct, name="editar_ct"),
    path("excluir/<int:ct_id>/", views.excluir_ct, name="excluir_ct"),
]