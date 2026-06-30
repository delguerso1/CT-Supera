from django.core.management.base import BaseCommand

from wellhub.client import WellhubClient
from wellhub.config_check import format_wellhub_config_hint
from wellhub.services.sync_slots import sync_all_published_slots


class Command(BaseCommand):
    help = "Sincroniza slots Wellhub do mês corrente (seg/qua, Praia de Itaipuaçu)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-api",
            action="store_true",
            help="Atualiza apenas registros locais.",
        )

    def handle(self, *args, **options):
        client = WellhubClient()
        call_api = not options["skip_api"] and client.configured
        if not call_api and not options["skip_api"]:
            self.stdout.write(
                self.style.WARNING("API Wellhub não chamada (credenciais ausentes).")
            )
            self.stdout.write(format_wellhub_config_hint(client))
        stats = sync_all_published_slots(client=client, call_api=call_api)
        self.stdout.write(self.style.SUCCESS(str(stats)))
