# Generated manually — tokens Expo podem exceder 255 caracteres.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0028_usuario_data_inativacao'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pushtokenexpo',
            name='token',
            field=models.CharField(max_length=512, unique=True),
        ),
    ]
