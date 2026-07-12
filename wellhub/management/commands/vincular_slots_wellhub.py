"""Vincula wellhub_slot_id em slots pendentes e aplica janela mensal de reserva."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from wellhub.client import WellhubAPIError, WellhubClient
from wellhub.models import WellhubSlot, WellhubTurmaConfig
from wellhub.services.sync_slots import (
    _parse_remote_occur,
    _slot_id_from_item,
    bind_slot_id_and_patch,
    discover_slots_near_id,
    find_remote_slot_id,
)


class Command(BaseCommand):
    help = (
        "Vincula wellhub_slot_id nos slots locais pendentes e aplica PATCH "
        "da janela mensal (lista API, GET conhecido ou scan de ids próximos)."
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
            help="class_id Wellhub (opcional com --slot-id).",
        )
        parser.add_argument(
            "--scan-near",
            type=str,
            default="",
            help=(
                "Varre ids próximos a este slot_id via GET (quando a listagem "
                "não retorna slots). Ex.: --scan-near=228699094"
            ),
        )
        parser.add_argument(
            "--range",
            type=int,
            default=150,
            dest="scan_range",
            help="Raio do scan (±N) com --scan-near (padrão 150).",
        )

    def handle(self, *args, **options):
        client = WellhubClient()
        if not client.configured:
            self.stderr.write(self.style.ERROR("Wellhub API não configurada."))
            return

        known_slot = (options.get("slot_id") or "").strip()
        known_class = (options.get("class_id") or "").strip()
        scan_near = (options.get("scan_near") or "").strip()
        scan_range = int(options.get("scan_range") or 150)
        vinculados = 0

        if known_slot:
            vinculados += self._vincular_slot_conhecido(
                client, known_slot, known_class
            )

        if scan_near:
            self.stdout.write(
                f"Scan ±{scan_range} em torno de {scan_near}..."
            )
            found = discover_slots_near_id(
                client, scan_near, radius=scan_range
            )
            for slot, rid in found:
                vinculados += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  scan {slot.data_aula} {slot.turma.horario} → id={rid}"
                    )
                )

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
                    self.style.WARNING(
                        f"  {slot.data_aula} {slot.turma.horario}: {exc}"
                    )
                )
                continue
            if not remote_id:
                self.stdout.write(
                    f"  {slot.data_aula} {slot.turma.horario}: ainda não listável"
                )
                continue
            bind_slot_id_and_patch(slot, cfg, client, remote_id)
            vinculados += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"  {slot.data_aula} {slot.turma.horario} → id={remote_id}"
                )
            )

        # Reaplica janela mensal em slots já vinculados (ex.: segunda ok, quarta antiga).
        patched = self._patch_janela_vinculados(client)
        self.stdout.write(
            self.style.SUCCESS(
                f"Total vinculados nesta execução: {vinculados}; "
                f"janelas PATCH: {patched}"
            )
        )

    def _patch_janela_vinculados(self, client: WellhubClient) -> int:
        qs = (
            WellhubSlot.objects.exclude(wellhub_slot_id="")
            .filter(occur_date__gte=timezone.now())
            .select_related("turma")
        )
        count = 0
        for slot in qs:
            cfg = WellhubTurmaConfig.objects.filter(turma=slot.turma).first()
            if not cfg or not cfg.wellhub_class_id:
                continue
            try:
                bind_slot_id_and_patch(
                    slot, cfg, client, slot.wellhub_slot_id
                )
                count += 1
                self.stdout.write(
                    f"  PATCH janela {slot.data_aula} {slot.turma.horario} "
                    f"id={slot.wellhub_slot_id}"
                )
            except Exception as exc:  # noqa: BLE001 — comando operacional
                self.stdout.write(
                    self.style.WARNING(
                        f"  PATCH falhou {slot.data_aula} {slot.turma.horario}: {exc}"
                    )
                )
        return count

    def _vincular_slot_conhecido(
        self, client: WellhubClient, slot_id: str, class_id: str
    ) -> int:
        if not class_id:
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
            self.stdout.write(
                f"GET ok class={cfg.wellhub_class_id} occur={occur} id={rid}"
            )
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
            bind_slot_id_and_patch(local, cfg, client, str(rid))
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Vinculado+PATCH pk={local.pk} {local.data_aula} "
                    f"{local.turma.horario} → {rid}"
                )
            )
            return 1
        return 0
