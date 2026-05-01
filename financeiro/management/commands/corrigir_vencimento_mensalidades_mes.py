"""
Recalcula data_vencimento com proximo_dia_util_br para mensalidades já gravadas
em um mês/calendário (ex.: maio/2026 após mudança de regra).
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from financeiro.dias_uteis import proximo_dia_util_br
from financeiro.models import Mensalidade


class Command(BaseCommand):
    help = (
        "Ajusta data_vencimento das mensalidades cujo vencimento está no mês indicado, "
        "aplicando a regra de dia útil (sem sábado, domingo nem feriado nacional BR). "
        "Se a nova data cair em outro mês e já existir mensalidade do aluno nesse mês, "
        "o registro é ignorado e listado em aviso."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--ano",
            type=int,
            default=None,
            help="Ano do vencimento (padrão: ano atual no fuso do Django).",
        )
        parser.add_argument(
            "--mes",
            type=int,
            default=5,
            help="Mês do vencimento 1-12 (padrão: 5 = maio).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Apenas mostra o que seria alterado, sem gravar.",
        )

    def handle(self, *args, **options):
        hoje = timezone.localdate()
        ano = options["ano"] if options["ano"] is not None else hoje.year
        mes = options["mes"]
        dry_run = options["dry_run"]

        if mes < 1 or mes > 12:
            self.stderr.write(self.style.ERROR("Use --mes entre 1 e 12."))
            return

        qs = Mensalidade.objects.filter(data_vencimento__year=ano, data_vencimento__month=mes).select_related(
            "aluno"
        )
        total = qs.count()
        atualizadas = 0
        inalteradas = 0
        conflitos = []

        self.stdout.write(f"Processando {total} mensalidade(s) com vencimento em {mes:02d}/{ano}...")

        for m in qs.iterator():
            antiga = m.data_vencimento
            nova = proximo_dia_util_br(antiga)
            if nova == antiga:
                inalteradas += 1
                continue

            if (nova.year, nova.month) != (antiga.year, antiga.month):
                existe_outra = (
                    Mensalidade.objects.filter(
                        aluno_id=m.aluno_id,
                        data_vencimento__year=nova.year,
                        data_vencimento__month=nova.month,
                    )
                    .exclude(pk=m.pk)
                    .exists()
                )
                if existe_outra:
                    nome = m.aluno.get_full_name() if m.aluno else f"aluno_id={m.aluno_id}"
                    conflitos.append(
                        f"id={m.pk} {nome}: {antiga} -> {nova} (já existe parcela em {nova.month:02d}/{nova.year})"
                    )
                    continue

            if dry_run:
                self.stdout.write(f"  [dry-run] id={m.pk} {antiga} -> {nova}")
                atualizadas += 1
                continue

            m.data_vencimento = nova
            m.save(update_fields=["data_vencimento"])
            atualizadas += 1

        self.stdout.write(self.style.SUCCESS(f"Alteradas: {atualizadas}"))
        self.stdout.write(f"Inalteradas (já dia útil): {inalteradas}")
        if conflitos:
            self.stdout.write(self.style.WARNING(f"Ignoradas por conflito de unicidade (aluno/mês): {len(conflitos)}"))
            for linha in conflitos:
                self.stdout.write(self.style.WARNING(f"  {linha}"))
        if dry_run:
            self.stdout.write(self.style.NOTICE("Nenhuma alteração gravada (--dry-run)."))
