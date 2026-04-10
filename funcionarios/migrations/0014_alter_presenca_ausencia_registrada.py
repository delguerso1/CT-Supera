# help_text de ausencia_registrada alinhado ao models.Presenca

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("funcionarios", "0013_presenca_ausencia_registrada"),
    ]

    operations = [
        migrations.AlterField(
            model_name="presenca",
            name="ausencia_registrada",
            field=models.BooleanField(
                default=False,
                help_text="Professor registrou falta (desmarcação). Incompatível com presença confirmada.",
            ),
        ),
    ]
