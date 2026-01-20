from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0016_add_parq_questions_8_10'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='contrato_aceito',
            field=models.BooleanField(default=False, help_text='Indica se o aluno aceitou o contrato'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='contrato_aceito_em',
            field=models.DateTimeField(blank=True, help_text='Data e hora do aceite do contrato', null=True),
        ),
        migrations.AddField(
            model_name='usuario',
            name='contrato_aceito_ip',
            field=models.GenericIPAddressField(blank=True, help_text='IP do aceite do contrato', null=True),
        ),
    ]
