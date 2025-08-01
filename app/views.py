from django.shortcuts import render
from datetime import datetime
from rest_framework.response import Response
from rest_framework.views import APIView
   
def pagina_inicial(request):
    context = {
        'current_year': datetime.now().year
    }
    return render(request, 'home.html', context)


def error_404(request, exception):
    return render(request, "404.html", status=404)

class StatusAPIView(APIView):
    """API para verificar o status do backend."""
    def get(self, request):
        return Response({"status": "OK", "message": "Backend funcionando corretamente!"})
