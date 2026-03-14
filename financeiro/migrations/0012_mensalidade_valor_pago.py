from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("financeiro", "0011_mensalidade_data_pagamento"),
    ]

    operations = [
        migrations.AddField(
            model_name="mensalidade",
            name="valor_pago",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Valor efetivamente recebido (com multa/juros quando aplicável). Se nulo, considera-se o valor base.",
                max_digits=10,
                null=True,
            ),
        ),
    ]
