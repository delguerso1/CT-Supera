from django.db import migrations, models


def migrate_professor_to_professores(apps, schema_editor):
    Turma = apps.get_model('turmas', 'Turma')
    for turma in Turma.objects.all():
        professor_id = getattr(turma, 'professor_id', None)
        if professor_id:
            turma.professores.add(professor_id)


def reverse_migrate_professores_to_professor(apps, schema_editor):
    Turma = apps.get_model('turmas', 'Turma')
    for turma in Turma.objects.all():
        professores = turma.professores.all()
        if professores.exists():
            turma.professor_id = professores.first().id
            turma.save(update_fields=['professor'])


class Migration(migrations.Migration):

    dependencies = [
        ('turmas', '0009_merge_0005_populate_dias_semana_0008_turma_ativo'),
    ]

    operations = [
        migrations.AddField(
            model_name='turma',
            name='professores',
            field=models.ManyToManyField(blank=True, limit_choices_to={'tipo': 'professor'}, related_name='turmas', to='usuarios.usuario'),
        ),
        migrations.RunPython(migrate_professor_to_professores, reverse_migrate_professores_to_professor),
        migrations.RemoveField(
            model_name='turma',
            name='professor',
        ),
    ]
