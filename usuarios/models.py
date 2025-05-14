from django.contrib.auth.models import AbstractUser
from django.db import models

class Usuario(AbstractUser):
    TIPO_USUARIO_CHOICES= (
        ('gerente', 'Gerente'),
        ('professor', 'Professor'),
        ('aluno', 'Aluno'),
    )
    
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO_CHOICES)
    
    telefone = models.CharField(max_length=20, blank=True, null=True)
    cpf = models.CharField(max_length=11, unique=True, blank=False, null=False)
    
    ativo = models.BooleanField(default=True)  # para status rápido de ativação/inativação
    
    def is_gerente(self):
        return self.tipo == 'gerente'

    def is_professor(self):
        return self.tipo == 'professor'

    def is_aluno(self):
        return self.tipo == 'aluno'
    
    def save(self, *args, **kwargs):
        self.cpf = self.cpf.replace(".", "").replace("-", "")  # 🔹 Remove pontos e traços ao salvar
        if not self.username:
            self.username = self.cpf  # 🔹 Usa CPF sem pontos como `username`
        super().save(*args, **kwargs)



