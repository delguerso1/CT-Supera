# Permite email duplicado para menores de idade (email do responsável)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0020_precadastro_origem'),
    ]

    operations = [
        migrations.AlterField(
            model_name='precadastro',
            name='email',
            field=models.EmailField(
                default='pendente',
                help_text='Pode repetir para menores (email do responsável)',
                max_length=255,
                error_messages={'blank': 'O campo e-mail não pode estar vazio.', 'null': 'O campo e-mail não pode ser nulo.'}
            ),
        ),
        migrations.AlterField(
            model_name='usuario',
            name='email',
            field=models.EmailField(blank=False, help_text='Pode repetir para menores (email do responsável)', max_length=255, null=False, unique=False),
        ),
    ]
