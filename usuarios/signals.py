from datetime import date

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from usuarios.models import Usuario
from financeiro.models import Salario


@receiver(post_save, sender=Usuario)
def criar_salario_ao_criar_professor(sender, instance, created, **kwargs):
    """Cria ou atualiza a parcela de salário do professor no mês corrente (competência)."""
    if instance.tipo == "professor" and instance.salario_professor:
        print(f"🔹 Signal executado: Criando/atualizando salário para professor {instance.first_name}")
        try:
            hoje = timezone.now().date()
            competencia = date(hoje.year, hoje.month, 1)
            salario_existente = Salario.objects.filter(
                professor=instance,
                competencia=competencia,
            ).first()

            if salario_existente:
                salario_existente.valor = instance.salario_professor
                salario_existente.save(update_fields=["valor"])
                print(f"✅ Salário atualizado: {salario_existente}")
            else:
                salario = Salario.objects.create(
                    professor=instance,
                    valor=instance.salario_professor,
                    competencia=competencia,
                    status="pendente",
                    data_pagamento=None,
                )
                print(f"✅ Salário criado com sucesso: {salario}")
        except Exception as e:
            print(f"❌ Erro ao criar/atualizar salário: {e}")

# Mensalidade NÃO é mais criada no signal - apenas ao vincular aluno à turma
# (ver financeiro.services.criar_mensalidade_ao_vincular_turma e turmas.views.AdicionarAlunoAPIView)


