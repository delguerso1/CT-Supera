from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('turmas', '0012_turma_faixas_multiplas'),
    ]

    operations = [
        migrations.AlterField(
            model_name='turma',
            name='aceita_teen',
            field=models.BooleanField(default=False, help_text='Aceita adolescentes de 13 a 17 anos'),
        ),
        migrations.AlterField(
            model_name='turma',
            name='aceita_adultos',
            field=models.BooleanField(default=True, help_text='Aceita 18 anos ou mais'),
        ),
    ]
