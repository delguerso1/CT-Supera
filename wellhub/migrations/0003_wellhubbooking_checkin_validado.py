from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("wellhub", "0002_wellhubbooking_presenca_professor"),
    ]

    operations = [
        migrations.AddField(
            model_name="wellhubbooking",
            name="checkin_validado",
            field=models.BooleanField(
                default=False,
                help_text="Check-in confirmado na Wellhub via Access Validate.",
            ),
        ),
        migrations.AddField(
            model_name="wellhubbooking",
            name="checkin_validado_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Momento em que o Access Validate foi aceito pela Wellhub.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="wellhubbooking",
            name="checkin_validate_response",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Resposta da API POST /access/v1/validate.",
            ),
        ),
    ]
