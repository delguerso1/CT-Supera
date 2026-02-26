"""
Middleware que detecta a virada de mês e emite o signal mes_virado.
Na primeira requisição de cada novo mês, dispara a geração de mensalidades.
"""
from django.core.cache import cache
from django.utils import timezone

from financeiro.signals import mes_virado

CACHE_KEY_ULTIMO_MES_GERADO = 'financeiro_ultimo_mes_mensalidades'
CACHE_TIMEOUT = 60 * 24 * 60 * 60  # 60 dias em segundos


class MensalidadeMesViradoMiddleware:
    """
    Detecta quando entramos em um novo mês e emite o signal mes_virado
    para que as mensalidades sejam geradas automaticamente.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self._verificar_virada_mes()
        return self.get_response(request)

    def _verificar_virada_mes(self):
        hoje = timezone.now().date()
        mes_atual = f'{hoje.year}-{hoje.month:02d}'

        ultimo_mes_processado = cache.get(CACHE_KEY_ULTIMO_MES_GERADO)

        if ultimo_mes_processado != mes_atual:
            mes_virado.send(
                sender=self.__class__,
                ano=hoje.year,
                mes=hoje.month
            )
            cache.set(CACHE_KEY_ULTIMO_MES_GERADO, mes_atual, CACHE_TIMEOUT)
