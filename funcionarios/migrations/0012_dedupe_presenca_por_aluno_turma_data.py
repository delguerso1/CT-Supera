# Remove registros duplicados de Presenca (mesmo aluno, turma e dia), mantendo o de maior id.

from django.db import migrations
from django.db.models import Count, Max


def dedupe_presencas(apps, schema_editor):
    Presenca = apps.get_model("funcionarios", "Presenca")
    grupos = (
        Presenca.objects.values("usuario_id", "turma_id", "data")
        .annotate(cnt=Count("id"), max_id=Max("id"))
        .filter(cnt__gt=1)
    )
    for g in grupos:
        Presenca.objects.filter(
            usuario_id=g["usuario_id"],
            turma_id=g["turma_id"],
            data=g["data"],
        ).exclude(pk=g["max_id"]).delete()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("funcionarios", "0011_observacaoaula"),
    ]

    operations = [
        migrations.RunPython(dedupe_presencas, noop_reverse),
    ]
