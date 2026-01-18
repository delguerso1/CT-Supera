from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("financeiro", "0010_transacaoc6bank"),
    ]

    operations = [
        migrations.AddField(
            model_name="mensalidade",
            name="data_pagamento",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
