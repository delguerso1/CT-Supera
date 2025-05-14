from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view, name="login_view"),  # Login único para todos os usuários
    path("logout/", views.logout_view, name="logout"),
    
]