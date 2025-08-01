# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0012_alter_usuario_cpf'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='foto_perfil',
            field=models.ImageField(blank=True, help_text='Foto de perfil do usuário', null=True, upload_to='fotos_perfil/'),
        ),
    ] 