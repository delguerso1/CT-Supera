from django.core.management.base import BaseCommand

from wellhub.client import WellhubClient
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
        stats = sync_all_published_slots(client=client, call_api=call_api)
        self.stdout.write(self.style.SUCCESS(str(stats)))
