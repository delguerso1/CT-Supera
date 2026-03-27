# Generated manually for matriculado_em + backfill

from django.db import migrations, models


def backfill_matriculado_em(apps, schema_editor):
    PreCadastro = apps.get_model("usuarios", "PreCadastro")
    for p in PreCadastro.objects.filter(status="matriculado", matriculado_em__isnull=True):
        if p.usuario_id:
            u = getattr(p, "usuario", None)
            if u is not None:
                p.matriculado_em = u.date_joined
        if p.matriculado_em is None:
            p.matriculado_em = p.criado_em
        p.save(update_fields=["matriculado_em"])


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0026_alter_precadastro_telefone"),
    ]

    operations = [
        migrations.AddField(
            model_name="precadastro",
            name="matriculado_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Momento em que o pré-cadastro passou a matriculado (nova matrícula via fluxo de pré-cadastro).",
                null=True,
            ),
        ),
        migrations.RunPython(backfill_matriculado_em, migrations.RunPython.noop),
    ]
