from django.db.models.signals import post_save
from django.dispatch import receiver
from usuarios.models import Usuario

@receiver(post_save, sender=Usuario)
def atualizar_dashboard_gerente(sender, instance, created, **kwargs):
    """Atualiza automaticamente o dashboard do gerente quando um professor é cadastrado."""
    if created and instance.tipo == "professor":
        print(f"Novo professor cadastrado: {instance.first_name}")  # 🔹 Aqui você pode adicionar lógica de atualização!