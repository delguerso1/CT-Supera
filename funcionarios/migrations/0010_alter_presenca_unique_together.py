# Generated manually - permite múltiplas presenças por usuário no mesmo dia (uma por turma)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('funcionarios', '0009_presenca_checkin_realizado_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='presenca',
            unique_together={('usuario', 'turma', 'data')},
        ),
    ]
