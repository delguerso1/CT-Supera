from django.core.management.base import BaseCommand
from django.conf import settings

from wellhub.client import WellhubClient, WellhubAPIError
from wellhub.config_check import format_wellhub_config_hint, settings_wellhub_gym_id
from wellhub.services.sync_classes import ensure_gym_config, setup_piloto_classes
from wellhub.services.sync_slots import sync_all_published_slots


class Command(BaseCommand):
    help = (
        "Configura integração Wellhub para Praia de Itaipuaçu (07h, 08h, 19h): "
        "WellhubGymConfig, classes e primeira sync de slots."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-api",
            action="store_true",
            help="Apenas registros locais, sem chamar API Wellhub.",
        )

    def handle(self, *args, **options):
        gym_id = settings_wellhub_gym_id()
        if not gym_id:
            self.stderr.write(self.style.ERROR("WELLHUB_GYM_ID não configurado."))
            self.stderr.write(format_wellhub_config_hint())
            return

        product_id = getattr(settings, "WELLHUB_PRODUCT_ID", 1)
        ensure_gym_config(int(gym_id), product_id=product_id)
        self.stdout.write(self.style.SUCCESS(f"WellhubGymConfig criado (gym_id={gym_id})."))

        client = WellhubClient()
        call_api = not options["skip_api"] and client.configured
        if not call_api:
            self.stdout.write(
                self.style.WARNING("API Wellhub não chamada (--skip-api ou credenciais ausentes).")
            )
            self.stdout.write(format_wellhub_config_hint(client))

        if call_api:
            self.stdout.write(
                f"Chamando API Wellhub (gym_id={client.gym_id}, product_id={client.product_id})..."
            )

        try:
            configs = setup_piloto_classes(client=client, call_api=call_api)
        except WellhubAPIError as exc:
            self.stderr.write(self.style.ERROR(f"Erro ao criar/atualizar classe na Wellhub: {exc}"))
            return
        for cfg in configs:
            self.stdout.write(
                f"  Turma {cfg.turma_id} ({cfg.turma.horario}) → class_id={cfg.wellhub_class_id or 'local'}"
            )

        stats = sync_all_published_slots(client=client, call_api=call_api)
        self.stdout.write(self.style.SUCCESS(f"Slots sincronizados: {stats}"))
