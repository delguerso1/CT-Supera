from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from datetime import date
from django.core.exceptions import PermissionDenied
from django.core.mail import send_mail
from django.core.validators import RegexValidator
from ct.models import CentroDeTreinamento
import logging
from usuarios.utils import enviar_convite_aluno

logger = logging.getLogger(__name__)



class PreCadastro(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('matriculado', 'Matriculado'),
        ('cancelado', 'Cancelado'),
    ]

    first_name = models.CharField(max_length=100, blank=False, null=False)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    cpf = models.CharField(max_length=11, unique=True, blank=True, null=True)
    telefone = models.CharField(max_length=20, validators=[RegexValidator(regex=r'^\(\d{2}\)\d{5}-\d{4}$', message="Formato inválido. Use (21)00000-0000.")], blank=False, null=False)
    data_nascimento = models.DateField(null=True, blank=False)
    email = models.EmailField(max_length=255, unique=True, blank=False, null=False, default='pendente', error_messages={
        'unique': "Esse e-mail já está cadastrado.",
        'blank': "O campo e-mail não pode estar vazio.",
        'null': "O campo e-mail não pode ser nulo.",
    })
    criado_em = models.DateTimeField(auto_now_add=True)
    turma = models.ForeignKey('turmas.Turma', on_delete=models.CASCADE, blank=True, null=True)
    usuario = models.OneToOneField('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')

    def __str__(self):
        return f"{self.first_name} {self.last_name or ''}".strip()

    def converter_para_aluno(self, usuario, dia_vencimento=None, valor_mensalidade=None):
        """Transforma o PreCadastro diretamente em um Usuario (Aluno). Apenas professores ou gerentes podem finalizar."""
        if usuario.tipo not in ['professor', 'gerente']:
            raise PermissionDenied("⚠️ Apenas professores e gerentes podem finalizar o agendamento.")

        if not self.usuario:
            # Verifica a idade do aluno
            idade = None
            if self.data_nascimento:
                hoje = date.today()
                idade = hoje.year - self.data_nascimento.year - (
                    (hoje.month, hoje.day) < (self.data_nascimento.month, self.data_nascimento.day)
                )

            # Define os campos de telefone com base na idade
            telefone_responsavel = None
            telefone_emergencia = None

            if idade is not None and idade < 18:
                if not self.telefone:
                    raise ValidationError("⚠️ Alunos menores de idade devem ter um telefone do responsável.")
                telefone_responsavel = self.telefone
            else:
                if not self.telefone:
                    raise ValidationError("⚠️ Alunos maiores de idade devem ter um telefone de emergência.")
                telefone_emergencia = self.telefone

            # Cria o usuário aluno inativo (será ativado via link)
            usuario_aluno = Usuario.objects.create_user(
                username=self.cpf.replace(".", "").replace("-", ""),
                email=self.email if self.email else "",
                password=None,  # Não define senha - usuário definirá via link
                tipo="aluno",
                first_name=self.first_name,
                last_name=self.last_name or "",
                telefone=self.telefone,
                cpf=self.cpf,
                data_nascimento=self.data_nascimento,
                telefone_responsavel=telefone_responsavel,
                telefone_emergencia=telefone_emergencia,
                dia_vencimento=dia_vencimento,
                valor_mensalidade=valor_mensalidade,
            )
            usuario_aluno.is_active = False  # Usuário inativo até ativar via link
            usuario_aluno.set_unusable_password()  # Não define senha válida
            usuario_aluno.save()
            self.usuario = usuario_aluno
            self.status = 'matriculado'  # Atualiza o status para matriculado
            self.save()

            # Enviar e-mail de ativação ao aluno
            if usuario_aluno.email:
                try:
                    enviar_convite_aluno(usuario_aluno)
                    logger.info(f"Convite de ativação enviado para {usuario_aluno.email}")
                except Exception as e:
                    logger.error(f"Erro ao enviar convite de ativação para {usuario_aluno.email}: {e}")
                    # Não falha o cadastro se o e-mail não for enviado
                    # O usuário pode solicitar novo convite posteriormente


class Usuario(AbstractUser):
    TIPO_USUARIO_CHOICES= [
        ('gerente', 'Gerente'),
        ('professor', 'Professor'),
        ('aluno', 'Aluno'),
    ]
    
    username = models.CharField(max_length=14, unique=True, blank=False, null=False)  # 🔹 CPF sem formatação
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO_CHOICES)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    cpf = models.CharField(max_length=11, unique=True, blank=False, null=False)
    endereco = models.CharField(max_length=255, blank=True, null=True)
    ativo = models.BooleanField(default=True)  # 🔹 Para ativação/inativação rápida
    data_nascimento = models.DateField(null=True, blank=True)
    nome_responsavel = models.CharField(max_length=100, blank=True, null=True)
    telefone_responsavel = models.CharField(max_length=20, blank=True, null=True)
    telefone_emergencia = models.CharField(max_length=20, blank=True, null=True)
    ficha_medica = models.TextField(blank=True, null=True)
    foto_perfil = models.ImageField(upload_to='fotos_perfil/', blank=True, null=True, help_text="Foto de perfil do usuário")
     # NOVOS CAMPOS PARA MENSALIDADE
    dia_vencimento = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Dia do vencimento da mensalidade (1-31)")
    valor_mensalidade = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text="Valor personalizado da mensalidade do aluno")
    
    # CAMPOS PARA PROFESSORES
    salario_professor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Salário do professor")
    pix_professor = models.CharField(max_length=255, null=True, blank=True, help_text="Chave PIX do professor para pagamentos")

    def is_gerente(self):
        return self.tipo == "gerente"
    def is_professor(self):
        return self.tipo == "professor"
    def is_aluno(self):
        return self.tipo == "aluno"

    @property
    def idade(self):
        """Calcula idade do usuário com base na data de nascimento."""
        if self.data_nascimento:
            today = date.today()
            return today.year - self.data_nascimento.year - (
                (today.month, today.day) < (self.data_nascimento.month, self.data_nascimento.day)
            )
        return None

    def clean(self):
        """Valida telefone com base no tipo de usuário e na idade."""
        super().clean()
        idade = self.idade

        # 🔹 Lógica para professores: apenas telefone é obrigatório
        if self.tipo == "professor" and not self.telefone:
            raise ValidationError({"telefone": "Professores devem informar um telefone."})

        # 🔹 Lógica para alunos: necessidade de telefone do responsável ou emergência
        if self.tipo == "aluno":
            if idade is not None:
                if idade < 18 and not self.telefone_responsavel:
                    raise ValidationError({"telefone_responsavel": "Alunos menores de idade devem ter um telefone do responsável."})
                elif idade >= 18 and not self.telefone_emergencia:
                    raise ValidationError({"telefone_emergencia": "Alunos maiores de idade devem ter um telefone de emergência."})

    def save(self, *args, **kwargs):
        """Remove pontos do CPF e define `username` baseado nele."""
        self.cpf = self.cpf.replace(".", "").replace("-", "")  # 🔹 Remove pontos e traços ao salvar
        if not self.username:
            self.username = self.cpf  # 🔹 Usa CPF sem pontos como `username`
        
        super().save(*args, **kwargs)

    def atualizar_mensalidades_pendentes(self):
        """Atualiza as mensalidades pendentes/atrasadas com o novo vencimento e valor."""
        from financeiro.models import Mensalidade
        from django.utils import timezone
        from calendar import monthrange
        hoje = timezone.now().date()
        mensalidades = Mensalidade.objects.filter(
            aluno=self,
            status__in=['pendente', 'atrasado'],
            data_vencimento__gte=hoje
        )
        for mensalidade in mensalidades:
            ano = mensalidade.data_vencimento.year
            mes = mensalidade.data_vencimento.month
            ultimo_dia = monthrange(ano, mes)[1]
            dia = min(int(self.dia_vencimento), ultimo_dia)
            nova_data_vencimento = mensalidade.data_vencimento.replace(day=dia)
            mensalidade.data_vencimento = nova_data_vencimento
            mensalidade.valor = self.valor_mensalidade
            mensalidade.save()


