# Generated manually for ObservacaoAula

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("turmas", "0012_turma_faixas_multiplas"),
        ("funcionarios", "0010_alter_presenca_unique_together"),
    ]

    operations = [
        migrations.CreateModel(
            name="ObservacaoAula",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("data", models.DateField()),
                ("texto", models.TextField(max_length=1000)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "autor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="observacoes_aula",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "turma",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="observacoes_aula",
                        to="turmas.turma",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(fields=("turma", "data"), name="unique_observacaoaula_turma_data"),
                ],
            },
        ),
    ]
