import re

from django.db import migrations


def normalizar_telefones_precadastro(apps, schema_editor):
    PreCadastro = apps.get_model("usuarios", "PreCadastro")
    for p in PreCadastro.objects.all():
        if not p.telefone:
            continue
        digitos = re.sub(r"\D", "", p.telefone)
        if len(digitos) in (10, 11) and p.telefone != digitos:
            p.telefone = digitos
            p.save(update_fields=["telefone"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0024_push_token_expo"),
    ]

    operations = [
        migrations.RunPython(normalizar_telefones_precadastro, noop),
    ]
