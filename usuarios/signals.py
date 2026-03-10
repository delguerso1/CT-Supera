from django.db.models.signals import post_save
from django.dispatch import receiver
from usuarios.models import Usuario
from financeiro.models import Salario
from django.utils import timezone
from datetime import timedelta

@receiver(post_save, sender=Usuario)
def criar_salario_ao_criar_professor(sender, instance, created, **kwargs):
    """Cria salário automaticamente quando um professor é cadastrado ou atualizado."""
    if instance.tipo == "professor" and instance.salario_professor:
        print(f"🔹 Signal executado: Criando/atualizando salário para professor {instance.first_name}")
        try:
            # Verifica se já existe um salário para este professor no mês atual
            hoje = timezone.now().date()
            salario_existente = Salario.objects.filter(
                professor=instance,
                data_pagamento__month=hoje.month,
                data_pagamento__year=hoje.year
            ).first()
            
            if salario_existente:
                # Atualiza o salário existente
                salario_existente.valor = instance.salario_professor
                salario_existente.save()
                print(f"✅ Salário atualizado: {salario_existente}")
            else:
                # Cria um novo salário
                salario = Salario.objects.create(
                    professor=instance,
                    valor=instance.salario_professor,
                    data_pagamento=hoje
                )
                print(f"✅ Salário criado com sucesso: {salario}")
        except Exception as e:
            print(f"❌ Erro ao criar/atualizar salário: {e}")

# Mensalidade NÃO é mais criada no signal - apenas ao vincular aluno à turma
# (ver financeiro.services.criar_mensalidade_ao_vincular_turma e turmas.views.AdicionarAlunoAPIView)


