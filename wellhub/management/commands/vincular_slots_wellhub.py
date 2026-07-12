"""Vincula wellhub_slot_id em slots pendentes consultando a API Wellhub."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from wellhub.client import WellhubAPIError, WellhubClient
from wellhub.models import WellhubSlot, WellhubTurmaConfig
from wellhub.services.sync_slots import (
    _parse_remote_occur,
    _slot_id_from_item,
    find_remote_slot_id,
)


class Command(BaseCommand):
    help = (
        "Tenta vincular wellhub_slot_id nos slots locais pendentes "
        "(lista API ou GET slot conhecido)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--slot-id",
            type=str,
            default="",
            help="wellhub_slot_id conhecido (ex.: do webhook) para vincular via GET.",
        )
        parser.add_argument(
            "--class-id",
            type=str,
            default="",
            help="class_id Wellhub (obrigatório com --slot-id se não for inferível).",
        )

    def handle(self, *args, **options):
        client = WellhubClient()
        if not client.configured:
            self.stderr.write(self.style.ERROR("Wellhub API não configurada."))
            return

        known_slot = (options.get("slot_id") or "").strip()
        known_class = (options.get("class_id") or "").strip()
        vinculados = 0

        if known_slot:
            vinculados += self._vincular_slot_conhecido(client, known_slot, known_class)

        pendentes = (
            WellhubSlot.objects.filter(wellhub_slot_id="")
            .filter(occur_date__gte=timezone.now())
            .select_related("turma")
            .order_by("occur_date")
        )
        self.stdout.write(f"Slots futuros sem id: {pendentes.count()}")

        for slot in pendentes:
            cfg = WellhubTurmaConfig.objects.filter(turma=slot.turma).first()
            if not cfg or not cfg.wellhub_class_id:
                continue
            try:
                remote_id = find_remote_slot_id(client, cfg.wellhub_class_id, slot)
            except WellhubAPIError as exc:
                self.stdout.write(
                    self.style.WARNING(f"  {slot.data_aula} {slot.turma.horario}: {exc}")
                )
                continue
            if not remote_id:
                self.stdout.write(
                    f"  {slot.data_aula} {slot.turma.horario}: ainda não listável"
                )
                continue
            slot.wellhub_slot_id = remote_id
            slot.sync_status = WellhubSlot.SYNC_OK
            slot.sync_error = ""
            slot.save(update_fields=["wellhub_slot_id", "sync_status", "sync_error"])
            vinculados += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"  {slot.data_aula} {slot.turma.horario} → id={remote_id}"
                )
            )

        self.stdout.write(self.style.SUCCESS(f"Total vinculados: {vinculados}"))

    def _vincular_slot_conhecido(
        self, client: WellhubClient, slot_id: str, class_id: str
    ) -> int:
        if not class_id:
            # Tenta todas as classes publicadas
            configs = WellhubTurmaConfig.objects.filter(
                publicar_wellhub=True
            ).exclude(wellhub_class_id="")
        else:
            configs = WellhubTurmaConfig.objects.filter(wellhub_class_id=class_id)

        for cfg in configs:
            try:
                remote = client.get_slot(cfg.wellhub_class_id, slot_id)
            except WellhubAPIError as exc:
                self.stdout.write(
                    self.style.WARNING(
                        f"GET slot {slot_id} class={cfg.wellhub_class_id}: {exc}"
                    )
                )
                continue
            if not isinstance(remote, dict) or not remote:
                continue
            occur = (
                remote.get("occur_date")
                or remote.get("occurDate")
                or (remote.get("slot") or {}).get("occur_date")
                or (remote.get("data") or {}).get("occur_date")
            )
            rid = _slot_id_from_item(remote) or slot_id
            self.stdout.write(f"GET ok class={cfg.wellhub_class_id} occur={occur} id={rid}")
            if not occur:
                continue
            dt = _parse_remote_occur(str(occur))
            if not dt:
                continue
            local = WellhubSlot.objects.filter(
                turma=cfg.turma, data_aula=dt.date()
            ).first()
            if not local:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Sem slot local para {dt.date()} turma={cfg.turma_id}"
                    )
                )
                continue
            local.wellhub_slot_id = str(rid)
            local.sync_status = WellhubSlot.SYNC_OK
            local.sync_error = ""
            local.save(update_fields=["wellhub_slot_id", "sync_status", "sync_error"])
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Vinculado local pk={local.pk} {local.data_aula} "
                    f"{local.turma.horario} → {rid}"
                )
            )
            return 1
        return 0
