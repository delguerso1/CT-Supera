# Generated manually to populate DiaSemana table

from django.db import migrations

def populate_dias_semana(apps, schema_editor):
    DiaSemana = apps.get_model('turmas', 'DiaSemana')
    
    dias = [
        'Segunda-feira',
        'Terça-feira', 
        'Quarta-feira',
        'Quinta-feira',
        'Sexta-feira',
        'Sábado',
        'Domingo'
    ]
    
    for dia in dias:
        DiaSemana.objects.get_or_create(nome=dia)

def reverse_populate_dias_semana(apps, schema_editor):
    DiaSemana = apps.get_model('turmas', 'DiaSemana')
    DiaSemana.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('turmas', '0004_diasemana_alter_turma_options_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_dias_semana, reverse_populate_dias_semana),
    ]
