# Falta registrada explicitamente pelo professor (desmarcação de presença).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("funcionarios", "0012_dedupe_presenca_por_aluno_turma_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="presenca",
            name="ausencia_registrada",
            field=models.BooleanField(
                default=False,
                help_text="Professor registrou falta (desmarcou presença). Exclui presença confirmada.",
            ),
        ),
    ]
