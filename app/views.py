from django.shortcuts import render
from datetime import datetime
   
def pagina_inicial(request):
    context = {
        'current_year': datetime.now().year
    }
    return render(request, 'home.html', context)


def error_404(request, exception):
    return render(request, "404.html", status=404)
