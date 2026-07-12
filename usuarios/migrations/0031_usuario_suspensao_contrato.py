from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0030_usuario_matriculado_em_limpar_precadastro_matriculado'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='contrato_suspenso',
            field=models.BooleanField(
                default=False,
                help_text='Contrato temporariamente suspenso (30/60 dias). Diferente de ativo=False (encerramento).',
            ),
        ),
        migrations.AddField(
            model_name='usuario',
            name='suspenso_desde',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='usuario',
            name='suspenso_ate',
            field=models.DateField(
                blank=True,
                help_text='Data final da suspensão (inclusive). Após essa data o contrato pode ser reativado.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='usuario',
            name='duracao_suspensao_dias',
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text='Duração escolhida na suspensão (30 ou 60 dias).',
                null=True,
            ),
        ),
    ]
