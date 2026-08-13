from django.core.management.base import BaseCommand

from financeiro.services import listar_exalunos_com_mensalidade_aberta


class Command(BaseCommand):
    help = (
        "Lista ex-alunos (ativo=False) com mensalidade pendente ou atrasada. "
        "Diagnóstico do residual após encerramento de contrato."
    )

    def handle(self, *args, **options):
        grupos = listar_exalunos_com_mensalidade_aberta()
        if not grupos:
            self.stdout.write(self.style.SUCCESS("Nenhum ex-aluno com mensalidade em aberto."))
            return

        total_parcelas = sum(len(g["mensalidades"]) for g in grupos)
        self.stdout.write(
            self.style.WARNING(
                f"{len(grupos)} ex-aluno(s) com {total_parcelas} parcela(s) em aberto:"
            )
        )
        for grupo in grupos:
            aluno = grupo["aluno"]
            nome = aluno.get_full_name()
            self.stdout.write(
                f"\n  {nome}  id={aluno.id}  cpf={aluno.cpf}  "
                f"inativacao={aluno.data_inativacao}"
            )
            for m in grupo["mensalidades"]:
                venc = m.data_vencimento.isoformat() if m.data_vencimento else "-"
                self.stdout.write(
                    f"    mensalidade id={m.id}  {m.status_efetivo}  "
                    f"venc={venc}  R$ {m.valor}"
                )
