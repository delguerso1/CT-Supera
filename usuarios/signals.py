from django.db.models.signals import post_save
from django.dispatch import receiver
from usuarios.models import Usuario
from financeiro.models import Mensalidade, Salario
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

@receiver(post_save, sender=Usuario)
def criar_mensalidade_ao_criar_aluno(sender, instance, created, **kwargs):
    if created and instance.tipo == "aluno":
        print(f"🔹 Signal executado: Criando mensalidade para aluno {instance.first_name}")
        try:
            # Verifica se já existe uma mensalidade para este aluno
            if not Mensalidade.objects.filter(aluno=instance).exists():
                valor_mensalidade = instance.valor_mensalidade or 150.00
                
                # Cria a mensalidade para o mês corrente usando o dia de vencimento do aluno
                hoje = timezone.now().date()
                dia_vencimento = instance.dia_vencimento or hoje.day
                
                # Garante que o dia não ultrapasse o último dia do mês
                from calendar import monthrange
                ultimo_dia = monthrange(hoje.year, hoje.month)[1]
                dia_vencimento = min(dia_vencimento, ultimo_dia)
                
                # Se o dia de vencimento já passou no mês corrente, cria para o próximo mês
                data_vencimento = hoje.replace(day=dia_vencimento)
                if data_vencimento < hoje:
                    # Avança para o próximo mês
                    if hoje.month == 12:
                        data_vencimento = data_vencimento.replace(year=hoje.year + 1, month=1)
                    else:
                        data_vencimento = data_vencimento.replace(month=hoje.month + 1)
                
                mensalidade = Mensalidade.objects.create(
                    aluno=instance,
                    valor=valor_mensalidade,
                    data_vencimento=data_vencimento
                )
                print(f"✅ Mensalidade criada com sucesso: {mensalidade}")
            else:
                print(f"⚠️ Mensalidade já existe para o aluno {instance.first_name}")
        except Exception as e:
            print(f"❌ Erro ao criar mensalidade: {e}")



