from django.apps import AppConfig


class FinanceiroConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'financeiro'

    def ready(self):
        from financeiro.signals import mes_virado, on_mes_virado
        mes_virado.connect(on_mes_virado)
