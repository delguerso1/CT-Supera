# Copia matriculado_em do pré-cadastro para o aluno, depois remove pré-cadastros matriculados.

from django.db import migrations, models


def backfill_matriculado_em_usuario(apps, schema_editor):
    PreCadastro = apps.get_model("usuarios", "PreCadastro")
    Usuario = apps.get_model("usuarios", "Usuario")
    for pc in PreCadastro.objects.filter(status="matriculado", usuario_id__isnull=False):
        u = Usuario.objects.filter(pk=pc.usuario_id).first()
        if not u:
            continue
        ts = pc.matriculado_em or pc.criado_em
        if u.matriculado_em is None or ts > u.matriculado_em:
            u.matriculado_em = ts
            u.save(update_fields=["matriculado_em"])


def delete_matriculados_precadastro(apps, schema_editor):
    PreCadastro = apps.get_model("usuarios", "PreCadastro")
    PreCadastro.objects.filter(status="matriculado").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0029_alter_pushtokenexpo_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="usuario",
            name="matriculado_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Momento em que a matrícula foi efetivada (pré-cadastro → aluno). Usado em relatórios financeiros.",
                null=True,
            ),
        ),
        migrations.RunPython(backfill_matriculado_em_usuario, migrations.RunPython.noop),
        migrations.RunPython(delete_matriculados_precadastro, migrations.RunPython.noop),
    ]
