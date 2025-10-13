from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings
import os
from datetime import datetime
from rest_framework.response import Response
from rest_framework.views import APIView
   
def pagina_inicial(request):
    context = {
        'current_year': datetime.now().year
    }
    return render(request, 'home.html', context)

def serve_frontend(request, path=''):
    """Serve o frontend React para todas as rotas não-API"""
    # Se for uma requisição para arquivos estáticos do frontend
    if path.startswith('static/'):
        file_path = os.path.join(settings.STATIC_ROOT, 'frontend', path)
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                response = HttpResponse(f.read())
                # Definir o content-type correto baseado na extensão
                if path.endswith('.js'):
                    response['Content-Type'] = 'application/javascript'
                elif path.endswith('.css'):
                    response['Content-Type'] = 'text/css'
                elif path.endswith('.png'):
                    response['Content-Type'] = 'image/png'
                elif path.endswith('.jpg') or path.endswith('.jpeg'):
                    response['Content-Type'] = 'image/jpeg'
                elif path.endswith('.ico'):
                    response['Content-Type'] = 'image/x-icon'
                return response
    
    # Para todas as outras rotas, servir o index.html do React
    index_path = os.path.join(settings.STATIC_ROOT, 'frontend', 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HttpResponse(content, content_type='text/html')
    
    # Se o index.html não existir, retornar erro 404
    return HttpResponse("Frontend não encontrado", status=404)

def error_404(request, exception):
    return render(request, "404.html", status=404)

class StatusAPIView(APIView):
    """API para verificar o status do backend."""
    def get(self, request):
        return Response({"status": "OK", "message": "Backend funcionando corretamente!"})
