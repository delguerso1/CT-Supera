from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("wellhub", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="wellhubbooking",
            name="presenca_confirmada",
            field=models.BooleanField(
                default=False,
                help_text="Professor confirmou comparecimento na aula.",
            ),
        ),
        migrations.AddField(
            model_name="wellhubbooking",
            name="ausencia_registrada",
            field=models.BooleanField(
                default=False,
                help_text="Professor registrou falta para a aula do dia.",
            ),
        ),
    ]
