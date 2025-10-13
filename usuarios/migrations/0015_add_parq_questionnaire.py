# Generated manually to add PAR-Q questionnaire fields

from django.db import migrations, models

def create_parq_fields(apps, schema_editor):
    # This migration will add PAR-Q fields to the Usuario model
    pass

def reverse_create_parq_fields(apps, schema_editor):
    # This migration can be reversed by removing the PAR-Q fields
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0013_usuario_foto_perfil'),
    ]

    operations = [
        # Add PAR-Q questionnaire fields
        migrations.AddField(
            model_name='usuario',
            name='parq_question_1',
            field=models.BooleanField(default=False, help_text='PAR-Q: Alguma vez um médico disse que você tem um problema de coração e que só deveria fazer atividade física recomendada por um médico?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_2',
            field=models.BooleanField(default=False, help_text='PAR-Q: Você sente dor no peito quando faz atividade física?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_3',
            field=models.BooleanField(default=False, help_text='PAR-Q: No último mês, você teve dor no peito quando não estava fazendo atividade física?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_4',
            field=models.BooleanField(default=False, help_text='PAR-Q: Você perde o equilíbrio por causa de tontura ou alguma vez perdeu a consciência?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_5',
            field=models.BooleanField(default=False, help_text='PAR-Q: Você tem algum problema ósseo ou articular que poderia piorar com a mudança de sua atividade física?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_6',
            field=models.BooleanField(default=False, help_text='PAR-Q: Atualmente um médico está prescrevendo medicamentos para sua pressão arterial ou condição cardíaca?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_7',
            field=models.BooleanField(default=False, help_text='PAR-Q: Você sabe de alguma outra razão pela qual não deveria fazer atividade física?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_completed',
            field=models.BooleanField(default=False, help_text='Indica se o questionário PAR-Q foi preenchido'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_completion_date',
            field=models.DateTimeField(null=True, blank=True, help_text='Data de preenchimento do questionário PAR-Q'),
        ),
    ]
