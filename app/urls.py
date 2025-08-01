"""
URL configuration for app project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from app.views import StatusAPIView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('status/', StatusAPIView.as_view(), name='status_api'),  # Endpoint de status
    path('api/alunos/', include('alunos.urls')),
    path('api/turmas/', include('turmas.urls')),
    path('api/funcionarios/', include('funcionarios.urls')),
    path('api/financeiro/', include('financeiro.urls')),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/cts/', include('ct.urls')),
]

# Configuração para servir arquivos de mídia em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)