from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('turmas', '0013_alter_turma_faixa_etaria_help_text'),
    ]

    operations = [
        migrations.AlterField(
            model_name='turma',
            name='aceita_kids',
            field=models.BooleanField(default=False, help_text='Aceita crianças até 10 anos'),
        ),
        migrations.AlterField(
            model_name='turma',
            name='aceita_teen',
            field=models.BooleanField(default=False, help_text='Aceita adolescentes de 11 a 17 anos'),
        ),
    ]
