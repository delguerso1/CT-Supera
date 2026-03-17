# Migra faixa_etaria (única) para aceita_kids, aceita_teen, aceita_adultos (múltiplas)

from django.db import migrations, models


def migrar_faixa_para_booleanos(apps, schema_editor):
    Turma = apps.get_model('turmas', 'Turma')
    for turma in Turma.objects.all():
        faixa = getattr(turma, 'faixa_etaria', None) or 'adultos'
        turma.aceita_kids = faixa == 'kids'
        turma.aceita_teen = faixa == 'teen'
        turma.aceita_adultos = faixa == 'adultos'
        turma.save()


def reverter_para_faixa(apps, schema_editor):
    Turma = apps.get_model('turmas', 'Turma')
    for turma in Turma.objects.all():
        if turma.aceita_kids:
            turma.faixa_etaria = 'kids'
        elif turma.aceita_teen:
            turma.faixa_etaria = 'teen'
        else:
            turma.faixa_etaria = 'adultos'
        turma.save()


class Migration(migrations.Migration):

    dependencies = [
        ('turmas', '0011_turma_faixa_etaria'),
    ]

    operations = [
        migrations.AddField(
            model_name='turma',
            name='aceita_kids',
            field=models.BooleanField(default=False, help_text='Aceita crianças até 12 anos'),
        ),
        migrations.AddField(
            model_name='turma',
            name='aceita_teen',
            field=models.BooleanField(default=False, help_text='Aceita adolescentes até 18 anos'),
        ),
        migrations.AddField(
            model_name='turma',
            name='aceita_adultos',
            field=models.BooleanField(default=True, help_text='Aceita maiores de 18 anos'),
        ),
        migrations.RunPython(migrar_faixa_para_booleanos, reverter_para_faixa),
        migrations.RemoveField(
            model_name='turma',
            name='faixa_etaria',
        ),
    ]
