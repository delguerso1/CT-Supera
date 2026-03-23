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

    ORIGEM_CHOICES = [
        ('formulario', 'Pendente'),  # Cadastro pelo gerente
        ('aula_experimental', 'Aula experimental'),
        ('ex_aluno', 'Ex-aluno'),
    ]

    first_name = models.CharField(max_length=100, blank=False, null=False)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    cpf = models.CharField(max_length=11, unique=True, blank=True, null=True)
    telefone = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\d{10,11}$',
                message="Informe o telefone com DDD: 10 ou 11 dígitos (apenas números).",
            )
        ],
        blank=False,
        null=False,
        help_text="Apenas números, com DDD (10 ou 11 dígitos).",
    )
    data_nascimento = models.DateField(null=True, blank=False)
    email = models.EmailField(max_length=255, unique=False, blank=False, null=False, default='pendente', error_messages={
        'blank': "O campo e-mail não pode estar vazio.",
        'null': "O campo e-mail não pode ser nulo.",
    }, help_text="Pode repetir para menores (email do responsável)")
    criado_em = models.DateTimeField(auto_now_add=True)
    turma = models.ForeignKey('turmas.Turma', on_delete=models.CASCADE, blank=True, null=True)
    usuario = models.OneToOneField('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    origem = models.CharField(max_length=20, choices=ORIGEM_CHOICES, blank=True, null=True, help_text="Origem do pré-cadastro: aula experimental, ex-aluno ou formulário")
    data_aula_experimental = models.DateField(null=True, blank=True, help_text="Data escolhida pelo cliente para a aula experimental")
    compareceu_aula_experimental = models.BooleanField(default=False, help_text="Professor marcou comparecimento na aula experimental")
    reagendou_aula_experimental = models.BooleanField(default=False, help_text="Cliente já fez um reagendamento (máx. 1)")

    def __str__(self):
        return f"{self.first_name} {self.last_name or ''}".strip()

    def converter_para_aluno(self, usuario, dia_vencimento=None, valor_mensalidade=None, plano=None, dias_habilitados=None):
        """Transforma o PreCadastro diretamente em um Usuario (Aluno). Apenas professores ou gerentes podem finalizar."""
        if usuario.tipo not in ['professor', 'gerente']:
            raise PermissionDenied("⚠️ Apenas professores e gerentes podem finalizar o agendamento.")

        if not self.usuario:
            cpf_digits = ''.join(c for c in str(self.cpf or '') if c.isdigit())
            if len(cpf_digits) != 11:
                raise ValidationError(
                    "⚠️ Informe um CPF válido com 11 dígitos antes de matricular."
                )
            self.cpf = cpf_digits

            # Reingresso / ex-aluno: já existe cadastro com este CPF — vincula em vez de criar (evita UNIQUE em username/cpf).
            existente = Usuario.objects.filter(tipo='aluno', cpf=cpf_digits).first()
            if existente:
                existente.dia_vencimento = dia_vencimento
                existente.valor_mensalidade = valor_mensalidade
                if plano is not None:
                    existente.plano = plano
                existente.ativo = True
                if dias_habilitados:
                    existente.dias_habilitados.set(dias_habilitados)
                existente.save()
                if hasattr(existente, 'atualizar_mensalidades_pendentes'):
                    existente.atualizar_mensalidades_pendentes()
                self.usuario = existente
                self.status = 'matriculado'
                self.save(update_fields=['usuario', 'status', 'cpf'])
                logger.info(
                    'Pré-cadastro %s vinculado ao aluno existente id=%s (CPF %s)',
                    self.pk,
                    existente.pk,
                    cpf_digits,
                )
                return existente

            def _formatar_nome(valor):
                if not valor:
                    return valor
                partes = [p for p in valor.strip().split(' ') if p]
                partes_formatadas = []
                for parte in partes:
                    subpartes = [sp for sp in parte.split('-') if sp]
                    subpartes_formatadas = [
                        sp[0].upper() + sp[1:].lower() if sp else ''
                        for sp in subpartes
                    ]
                    partes_formatadas.append('-'.join(subpartes_formatadas))
                return ' '.join(partes_formatadas)

            # Verifica a idade do aluno
            idade = None
            if self.data_nascimento:
                hoje = date.today()
                idade = hoje.year - self.data_nascimento.year - (
                    (hoje.month, hoje.day) < (self.data_nascimento.month, self.data_nascimento.day)
                )

            # Telefone do responsável (menores) é opcional; maiores precisam de telefone (emergência)
            telefone_responsavel = None
            telefone_emergencia = None

            if idade is not None and idade < 18:
                pass
            else:
                if not self.telefone:
                    raise ValidationError(
                        "⚠️ Alunos maiores de idade devem informar o telefone (usado como telefone de emergência)."
                    )
                telefone_emergencia = self.telefone

            # Cria o usuário aluno inativo (será ativado via link)
            usuario_aluno = Usuario.objects.create_user(
                username=cpf_digits,
                email=self.email if self.email else "",
                password=None,  # Não define senha - usuário definirá via link
                tipo="aluno",
                first_name=_formatar_nome(self.first_name),
                last_name=_formatar_nome(self.last_name or ""),
                telefone=self.telefone or "",
                cpf=cpf_digits,
                data_nascimento=self.data_nascimento,
                telefone_responsavel=telefone_responsavel,
                telefone_emergencia=telefone_emergencia,
                dia_vencimento=dia_vencimento,
                valor_mensalidade=valor_mensalidade,
                plano=plano,
            )
            usuario_aluno.is_active = False  # Usuário inativo até ativar via link
            usuario_aluno.set_unusable_password()  # Não define senha válida
            usuario_aluno.save()
            if dias_habilitados:
                usuario_aluno.dias_habilitados.set(dias_habilitados)
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
            return usuario_aluno
        return self.usuario


class Usuario(AbstractUser):
    TIPO_USUARIO_CHOICES= [
        ('gerente', 'Gerente'),
        ('professor', 'Professor'),
        ('aluno', 'Aluno'),
    ]

    PLANO_CHOICES = [
        ('3x', '3 vezes na semana'),
        ('2x', '2 vezes na semana'),
        ('1x', '1 vez na semana'),
    ]
    
    username = models.CharField(max_length=14, unique=True, blank=False, null=False)  # 🔹 CPF sem formatação
    email = models.EmailField(max_length=255, unique=False, blank=False, null=False, help_text='Pode repetir para menores (email do responsável)')
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
    
    # CAMPOS DO QUESTIONÁRIO PAR-Q (apenas para alunos)
    parq_question_1 = models.BooleanField(default=False, help_text="PAR-Q: Algum médico já disse que você possui algum problema de coração ou pressão arterial, e que somente deveria realizar atividade física supervisionado por profissionais de saúde?")
    parq_question_2 = models.BooleanField(default=False, help_text="PAR-Q: Você sente dores no peito quando pratica atividade física?")
    parq_question_3 = models.BooleanField(default=False, help_text="PAR-Q: No último mês, você sentiu dores no peito ao praticar atividade física?")
    parq_question_4 = models.BooleanField(default=False, help_text="PAR-Q: Você apresenta algum desequilíbrio devido à tontura e/ou perda momentânea da consciência?")
    parq_question_5 = models.BooleanField(default=False, help_text="PAR-Q: Você possui algum problema ósseo ou articular, que pode ser afetado ou agravado pela atividade física?")
    parq_question_6 = models.BooleanField(default=False, help_text="PAR-Q: Você toma atualmente algum tipo de medicação de uso contínuo?")
    parq_question_7 = models.BooleanField(default=False, help_text="PAR-Q: Você realiza algum tipo de tratamento médico para pressão arterial ou problemas cardíacos?")
    parq_question_8 = models.BooleanField(default=False, help_text="PAR-Q: Você realiza algum tratamento médico contínuo, que possa ser afetado ou prejudicado com a atividade física?")
    parq_question_9 = models.BooleanField(default=False, help_text="PAR-Q: Você já se submeteu a algum tipo de cirurgia, que comprometa de alguma forma a atividade física?")
    parq_question_10 = models.BooleanField(default=False, help_text="PAR-Q: Sabe de alguma outra razão pela qual a atividade física possa eventualmente comprometer sua saúde?")
    parq_completed = models.BooleanField(default=False, help_text="Indica se o questionário PAR-Q foi preenchido")
    parq_completion_date = models.DateTimeField(null=True, blank=True, help_text="Data de preenchimento do questionário PAR-Q")
    # ACEITE DE CONTRATO
    contrato_aceito = models.BooleanField(default=False, help_text="Indica se o aluno aceitou o contrato")
    contrato_aceito_em = models.DateTimeField(null=True, blank=True, help_text="Data e hora do aceite do contrato")
    contrato_aceito_ip = models.GenericIPAddressField(null=True, blank=True, help_text="IP do aceite do contrato")
     # NOVOS CAMPOS PARA MENSALIDADE
    dia_vencimento = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Dia do vencimento da mensalidade (1-31)")
    valor_mensalidade = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text="Valor personalizado da mensalidade do aluno")
    
    # CAMPOS PARA PROFESSORES
    salario_professor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Salário do professor")
    pix_professor = models.CharField(max_length=255, null=True, blank=True, help_text="Chave PIX do professor para pagamentos")

    # CAMPOS DO PLANO (apenas para alunos)
    plano = models.CharField(max_length=2, choices=PLANO_CHOICES, null=True, blank=True, help_text="Plano semanal do aluno")
    dias_habilitados = models.ManyToManyField('turmas.DiaSemana', blank=True, related_name='alunos_habilitados')

    def is_gerente(self):
        return self.tipo == "gerente"
    def is_professor(self):
        return self.tipo == "professor"
    def is_aluno(self):
        return self.tipo == "aluno"

    def limite_aulas_semanais(self):
        """Retorna o limite de aulas semanais de acordo com o plano."""
        plano_limites = {
            '3x': 3,
            '2x': 2,
            '1x': 1,
        }
        return plano_limites.get(self.plano)

    def get_parq_questions(self):
        """Retorna as perguntas do PAR-Q para o usuário."""
        if not self.is_aluno():
            return []
        
        questions = [
            {
                'field': 'parq_question_1',
                'question': 'Algum médico já disse que você possui algum problema de coração ou pressão arterial, e que somente deveria realizar atividade física supervisionado por profissionais de saúde?',
                'value': self.parq_question_1
            },
            {
                'field': 'parq_question_2', 
                'question': 'Você sente dores no peito quando pratica atividade física?',
                'value': self.parq_question_2
            },
            {
                'field': 'parq_question_3',
                'question': 'No último mês, você sentiu dores no peito ao praticar atividade física?',
                'value': self.parq_question_3
            },
            {
                'field': 'parq_question_4',
                'question': 'Você apresenta algum desequilíbrio devido à tontura e/ou perda momentânea da consciência?',
                'value': self.parq_question_4
            },
            {
                'field': 'parq_question_5',
                'question': 'Você possui algum problema ósseo ou articular, que pode ser afetado ou agravado pela atividade física?',
                'value': self.parq_question_5
            },
            {
                'field': 'parq_question_6',
                'question': 'Você toma atualmente algum tipo de medicação de uso contínuo?',
                'value': self.parq_question_6
            },
            {
                'field': 'parq_question_7',
                'question': 'Você realiza algum tipo de tratamento médico para pressão arterial ou problemas cardíacos?',
                'value': self.parq_question_7
            },
            {
                'field': 'parq_question_8',
                'question': 'Você realiza algum tratamento médico contínuo, que possa ser afetado ou prejudicado com a atividade física?',
                'value': self.parq_question_8
            },
            {
                'field': 'parq_question_9',
                'question': 'Você já se submeteu a algum tipo de cirurgia, que comprometa de alguma forma a atividade física?',
                'value': self.parq_question_9
            },
            {
                'field': 'parq_question_10',
                'question': 'Sabe de alguma outra razão pela qual a atividade física possa eventualmente comprometer sua saúde?',
                'value': self.parq_question_10
            }
        ]
        return questions

    def has_parq_restrictions(self):
        """Verifica se o usuário tem alguma restrição no PAR-Q."""
        if not self.is_aluno():
            return False
        
        return any([
            self.parq_question_1, self.parq_question_2, self.parq_question_3,
            self.parq_question_4, self.parq_question_5, self.parq_question_6,
            self.parq_question_7, self.parq_question_8, self.parq_question_9,
            self.parq_question_10
        ])

    def can_participate_in_activities(self):
        """Verifica se o aluno pode participar das atividades baseado no PAR-Q."""
        if not self.is_aluno():
            return True
        
        return not self.has_parq_restrictions()

    def can_fill_parq_again(self):
        """Verifica se o aluno pode preencher o questionário PAR-Q novamente (1 ano após o último preenchimento)."""
        if not self.is_aluno():
            return True
        
        # Se nunca preencheu, pode preencher
        if not self.parq_completed or not self.parq_completion_date:
            return True
        
        # Verifica se passou 1 ano desde o último preenchimento
        from django.utils import timezone
        from datetime import timedelta
        
        data_preenchimento = self.parq_completion_date
        if isinstance(data_preenchimento, str):
            from django.utils.dateparse import parse_datetime
            data_preenchimento = parse_datetime(data_preenchimento)
        
        if data_preenchimento:
            # Se a data de preenchimento é datetime, converte para date
            if hasattr(data_preenchimento, 'date'):
                data_preenchimento = data_preenchimento.date()
            
            um_ano_depois = data_preenchimento + timedelta(days=365)
            hoje = timezone.now().date()
            
            return hoje >= um_ano_depois
        
        return True

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

        # 🔹 Alunos maiores de idade: telefone de emergência obrigatório (responsável é opcional para menores)
        if self.tipo == "aluno" and idade is not None and idade >= 18 and not self.telefone_emergencia:
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


class PushTokenExpo(models.Model):
    """Token Expo Push por dispositivo (app mobile). Usado para avisos do gerente aos alunos."""

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="push_tokens_expo",
    )
    token = models.CharField(max_length=255, unique=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Token push Expo"
        verbose_name_plural = "Tokens push Expo"

    def __str__(self):
        return f"{self.usuario_id} — {self.token[:24]}…"


