from django.contrib.auth.models import AbstractUser
from django.db import models

class Usuario(AbstractUser):
    TIPO_USUARIO_CHOICES= (
        ('gerente', 'Gerente'),
        ('funcionario', 'Funcionário'),
        ('aluno', 'Aluno'),
    )
    
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO_CHOICES)
    
    telefone = models.CharField(max_length=20, blank=True, null=True)
    cpf = models.CharField(max_length=14, unique=True, blank=True, null=True)
    
    ativo = models.BooleanField(default=True)  # para status rápido de ativação/inativação
    
    def is_gerente(self):
        return self.tipo == 'gerente'

    def is_funcionario(self):
        return self.tipo == 'funcionario'

    def is_aluno(self):
        return self.tipo == 'aluno'
