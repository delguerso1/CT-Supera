from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0015_add_parq_questionnaire'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='parq_question_8',
            field=models.BooleanField(default=False, help_text='PAR-Q: Você realiza algum tratamento médico contínuo, que possa ser afetado ou prejudicado com a atividade física?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_9',
            field=models.BooleanField(default=False, help_text='PAR-Q: Você já se submeteu a algum tipo de cirurgia, que comprometa de alguma forma a atividade física?'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='parq_question_10',
            field=models.BooleanField(default=False, help_text='PAR-Q: Sabe de alguma outra razão pela qual a atividade física possa eventualmente comprometer sua saúde?'),
        ),
    ]
