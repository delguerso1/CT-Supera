# Generated manually for competência mensal vs data efetiva de pagamento

from datetime import date

from django.db import migrations, models


def forwards_populate_competencia(apps, schema_editor):
    Salario = apps.get_model("financeiro", "Salario")
    for s in Salario.objects.all().iterator():
        dp = s.data_pagamento
        if dp:
            s.competencia = date(dp.year, dp.month, 1)
        else:
            s.competencia = date.today().replace(day=1)
        s.save(update_fields=["competencia"])


def forwards_dedupe(apps, schema_editor):
    Salario = apps.get_model("financeiro", "Salario")
    from collections import defaultdict

    grouped = defaultdict(list)
    for s in Salario.objects.all().order_by("id"):
        grouped[(s.professor_id, s.competencia)].append(s)

    for _key, rows in grouped.items():
        if len(rows) <= 1:
            continue
        # Prioriza registro pago; senão o de maior id (mais recente)
        rows_sorted = sorted(
            rows,
            key=lambda x: (0 if x.status == "pago" else 1, -x.id),
        )
        keeper = rows_sorted[0]
        for r in rows_sorted[1:]:
            r.delete()


def forwards_clear_data_pagamento_pendente(apps, schema_editor):
    Salario = apps.get_model("financeiro", "Salario")
    Salario.objects.filter(status="pendente").update(data_pagamento=None)


class Migration(migrations.Migration):

    dependencies = [
        ("financeiro", "0013_mensalidade_unique_aluno_mes"),
    ]

    operations = [
        migrations.AddField(
            model_name="salario",
            name="competencia",
            field=models.DateField(
                help_text="Primeiro dia do mês de competência (ex.: 01/03/2026 para março/2026).",
                null=True,
            ),
        ),
        migrations.RunPython(forwards_populate_competencia, migrations.RunPython.noop),
        migrations.RunPython(forwards_dedupe, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="salario",
            name="competencia",
            field=models.DateField(
                help_text="Primeiro dia do mês de competência (ex.: 01/03/2026 para março/2026).",
            ),
        ),
        migrations.AlterField(
            model_name="salario",
            name="data_pagamento",
            field=models.DateField(
                blank=True,
                help_text="Data em que o pagamento foi efetivado (preenchido ao marcar como pago).",
                null=True,
            ),
        ),
        migrations.RunPython(forwards_clear_data_pagamento_pendente, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="salario",
            constraint=models.UniqueConstraint(
                fields=("professor", "competencia"),
                name="financeiro_salario_unique_professor_competencia",
            ),
        ),
    ]
