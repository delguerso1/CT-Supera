from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from datetime import date
from django.core.exceptions import PermissionDenied
from django.core.mail import send_mail
from django.core.validators import RegexValidator





class PreCadastro(models.Model):
    STATUS_CHOICES = [
    ('pendente', 'Pendente'),
    ('compareceu', 'Compareceu'),
    ('matriculado', 'Matriculado'),
    ('nao_compareceu', 'Não Compareceu'),
    ('desistiu', 'Desistiu'),
]

    nome = models.CharField(max_length=100, blank=False, null=False)
    telefone = models.CharField(max_length=20, validators=[RegexValidator(regex=r'^\(\d{2}\)\d{5}-\d{4}$', message="Formato inválido. Use (21)00000-0000.")], blank=False, null=False)
    data_de_nascimento = models.DateField(null=True, blank=False)
    email = models.EmailField(max_length=255, unique=True, blank=False, null=False, default='pendente', error_messages={
        'unique': "Esse e-mail já está cadastrado.",
        'blank': "O campo e-mail não pode estar vazio.",
        'null': "O campo e-mail não pode ser nulo.",
    })
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pendente')
    criado_em = models.DateTimeField(auto_now_add=True)
    turma = models.ForeignKey('turmas.Turma', on_delete=models.CASCADE, blank=True, null=True,)

    def __str__(self):
        return self.nome
    
def finalizar_agendamento(self, usuario):
    """Transforma o PreCadastro diretamente em um Usuario (Aluno). Apenas professores ou gerentes podem finalizar."""
    
    # 🔹 Verifica se o usuário solicitante tem permissão para finalizar
    if usuario.tipo not in ['professor', 'gerente']:
        raise PermissionDenied("⚠️ Apenas professores e gerentes podem finalizar o agendamento.")
    
    # 🔹 Garante que o agendamento pode ser finalizado
    if self.status == 'compareceu' and not self.usuario:
        senha_temporaria = Usuario.objects.make_random_password()
        
        # 🔹 Criando o usuário aluno
        usuario_aluno = Usuario.objects.create_user(
            username=self.cpf.replace(".", "").replace("-", ""),
            email=self.email if self.email else "",  # 🔹 Usa o e-mail fornecido no pré-cadastro
            password=senha_temporaria,
            tipo="aluno",
            first_name=self.nome,
            telefone=self.telefone
        )

        # 🔹 Atualiza o `PreCadastro` para vincular o novo usuário
        self.usuario = usuario_aluno
        self.status = 'matriculado'
        self.save()

        # 🔹 Enviar e-mail de credenciais ao aluno
        if usuario_aluno.email:  # 🔹 Apenas se o aluno forneceu um e-mail válido
            mensagem = f"""
            Olá {usuario_aluno.first_name}, bem-vindo ao sistema! 🎉

            ✅ Seus dados de acesso:
            - Usuário: {usuario_aluno.username} (CPF)
            - Senha: {senha_temporaria} (mude no primeiro acesso!)

            🔗 Acesse: https://meusistema.com/login
            """
            send_mail(
                "Seus dados de acesso ao sistema",
                mensagem,
                "sistema@meusistema.com",
                [usuario_aluno.email],  # 🔹 Envia apenas se houver um e-mail válido
                fail_silently=False
            )



from django.core.exceptions import ValidationError
from datetime import date

class Usuario(AbstractUser):
    TIPO_USUARIO_CHOICES= [
        ('gerente', 'Gerente'),
        ('professor', 'Professor'),
        ('aluno', 'Aluno'),
    ]
    
    username = models.CharField(max_length=14, unique=True, blank=False, null=False)  # 🔹 CPF sem formatação
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO_CHOICES)
    nome = models.CharField(max_length=255, blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    cpf = models.CharField(max_length=11, unique=True, blank=False, null=False)
    endereco = models.CharField(max_length=255, blank=True, null=True)
    ativo = models.BooleanField(default=True)  # 🔹 Para ativação/inativação rápida
    data_nascimento = models.DateField(null=True, blank=True)
    nome_responsavel = models.CharField(max_length=100, blank=True, null=True)
    telefone_responsavel = models.CharField(max_length=20, blank=True, null=True)
    telefone_emergencia = models.CharField(max_length=20, blank=True, null=True)
    ficha_medica = models.TextField(blank=True, null=True)

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


