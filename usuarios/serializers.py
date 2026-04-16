from rest_framework import serializers
from rest_framework.fields import empty
from django.db import transaction
from django.utils import timezone
from usuarios.models import Usuario, PreCadastro
from turmas.models import DiaSemana, Turma
from turmas.views import _validar_aluno_turma
from financeiro.services import criar_mensalidade_ao_vincular_turma
from financeiro.models import Mensalidade, Salario
import re
from app.date_api import (
    DATA_API_FMT,
    DATE_INPUT_FORMATS,
    format_data_api,
    format_datetime_api,
)

def validar_senha_serializer(senha):
    """Valida a força da senha no serializer"""
    if not senha:
        return
    
    if len(senha) < 8:
        raise serializers.ValidationError("A senha deve ter pelo menos 8 caracteres.")
    
    if not re.search(r'[A-Z]', senha):
        raise serializers.ValidationError("A senha deve conter pelo menos uma letra maiúscula.")
    
    if not re.search(r'[a-z]', senha):
        raise serializers.ValidationError("A senha deve conter pelo menos uma letra minúscula.")
    
    if not re.search(r'\d', senha):
        raise serializers.ValidationError("A senha deve conter pelo menos um número.")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', senha):
        raise serializers.ValidationError("A senha deve conter pelo menos um caractere especial (!@#$%^&*(),.?\":{}|<>).")


def idade_em_anos_completos(data_nascimento):
    if not data_nascimento:
        return None
    from datetime import date
    hoje = date.today()
    return hoje.year - data_nascimento.year - (
        (hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day)
    )


def validar_email_aluno_cadastro(email, data_nascimento, instance_usuario=None, instance_precadastro=None):
    """
    E-mail para aluno (Usuario ou pré-cadastro): mesma regra na web e no app Expo.
    Maiores: único entre maiores (incl. professor/gerente) e pré-cadastros adultos.
    Menores: podem repetir (responsável, irmãos), sem ordem de cadastro.
    """
    if not email or str(email).strip().lower() == 'pendente':
        return

    email_limpo = str(email).strip().lower()
    qs_u = Usuario.objects.filter(email__iexact=email_limpo)
    qs_p = PreCadastro.objects.filter(email__iexact=email_limpo)
    if instance_usuario is not None:
        qs_u = qs_u.exclude(pk=instance_usuario.pk)
        # Pré-cadastro matriculado continua no banco com o mesmo e-mail do aluno;
        # não é "outra pessoa" usando o e-mail.
        qs_p = qs_p.exclude(usuario_id=instance_usuario.pk)
    if instance_precadastro is not None:
        qs_p = qs_p.exclude(pk=instance_precadastro.pk)

    if not qs_u.exists() and not qs_p.exists():
        return

    idade = idade_em_anos_completos(data_nascimento) if data_nascimento else None
    if idade is None:
        raise serializers.ValidationError({'email': 'Esse e-mail já está cadastrado.'})

    if idade >= 18:
        for u in qs_u:
            if u.tipo in ('professor', 'gerente'):
                raise serializers.ValidationError({'email': 'Esse e-mail já está cadastrado.'})
            if u.tipo == 'aluno':
                u_idade = idade_em_anos_completos(u.data_nascimento) if u.data_nascimento else None
                if u_idade is None or u_idade >= 18:
                    raise serializers.ValidationError({'email': 'Esse e-mail já está cadastrado.'})
        for p in qs_p:
            p_idade = idade_em_anos_completos(p.data_nascimento) if p.data_nascimento else None
            if p_idade is None or p_idade >= 18:
                raise serializers.ValidationError({'email': 'Esse e-mail já está cadastrado.'})
        return


class UsuarioSerializer(serializers.ModelSerializer):
    data_nascimento = serializers.DateField(
        format=DATA_API_FMT,
        input_formats=DATE_INPUT_FORMATS,
        required=False,
        allow_null=True,
    )
    nome_completo = serializers.SerializerMethodField()
    tipo_display = serializers.SerializerMethodField()
    centros_treinamento = serializers.SerializerMethodField()
    turmas_vinculadas = serializers.SerializerMethodField()
    turmas = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        max_length=2,
        required=False,
        allow_empty=True,
        write_only=True,
    )
    dias_habilitados = serializers.PrimaryKeyRelatedField(
        queryset=DiaSemana.objects.all(),
        many=True,
        required=False
    )
    dias_habilitados_nomes = serializers.SerializerMethodField()

    def _formatar_nome(self, valor):
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

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tipo', 'tipo_display', 'nome_completo', 'telefone',
            'endereco', 'data_nascimento', 'ativo', 'data_inativacao', 'is_active',
            'dia_vencimento', 'valor_mensalidade', 'cpf',
            'plano', 'dias_habilitados', 'dias_habilitados_nomes',
            'nome_responsavel', 'telefone_responsavel', 'telefone_emergencia',
            'ficha_medica', 'salario_professor', 'pix_professor',             'foto_perfil',
            'centros_treinamento',
            'turmas_vinculadas',
            'turmas',
            # Campos do PAR-Q
            'parq_question_1', 'parq_question_2', 'parq_question_3', 'parq_question_4',
            'parq_question_5', 'parq_question_6', 'parq_question_7', 'parq_question_8',
            'parq_question_9', 'parq_question_10',
            'parq_completed', 'parq_completion_date',
            'contrato_aceito', 'contrato_aceito_em'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'data_inativacao': {
                'format': DATA_API_FMT,
                'input_formats': DATE_INPUT_FORMATS,
                'required': False,
                'allow_null': True,
            },
        }

    def get_nome_completo(self, obj):
        first = obj.first_name or ''
        last = obj.last_name or ''
        return f"{first} {last}".strip()

    def get_tipo_display(self, obj):
        tipos = {
            'aluno': 'Aluno',
            'professor': 'Professor',
            'gerente': 'Gerente'
        }
        return tipos.get(obj.tipo, obj.tipo)
    
    def get_centros_treinamento(self, obj):
        """Retorna os Centros de Treinamento vinculados ao usuário (alunos através de turmas, professores através de turmas que lecionam)"""
        if obj.tipo == 'aluno':
            # Busca CTs através das turmas do aluno
            cts = obj.turmas_aluno.select_related('ct').values('ct__id', 'ct__nome').distinct()
            return [{'id': ct['ct__id'], 'nome': ct['ct__nome']} for ct in cts]
        elif obj.tipo == 'professor':
            # Busca CTs através das turmas que o professor leciona
            cts = obj.turmas.select_related('ct').values('ct__id', 'ct__nome').distinct()
            return [{'id': ct['ct__id'], 'nome': ct['ct__nome']} for ct in cts]
        return []

    def get_turmas_vinculadas(self, obj):
        """Turmas do aluno com CT e horário (listagem / detalhe)."""
        if obj.tipo != 'aluno':
            return []
        out = []
        for t in obj.turmas_aluno.all().order_by('horario', 'id'):
            horario_str = t.horario.strftime('%H:%M') if getattr(t, 'horario', None) else ''
            dias = [dia.nome for dia in t.dias_semana.all()]
            out.append({
                'id': t.id,
                'ct_nome': t.ct.nome if t.ct_id else '',
                'horario': horario_str,
                'dias_semana_nomes': dias,
                'ativo': bool(t.ativo),
            })
        return out

    def get_dias_habilitados_nomes(self, obj):
        return [dia.nome for dia in obj.dias_habilitados.all()]

    def validate_cpf(self, value):
        if value is None or (isinstance(value, str) and not str(value).strip()):
            return value
        cpf_limpo = re.sub(r'\D', '', str(value))
        if len(cpf_limpo) != 11:
            raise serializers.ValidationError('CPF deve conter exatamente 11 dígitos.')
        return cpf_limpo

    def validate_turmas(self, value):
        if not value:
            return []
        if len(value) > 2:
            raise serializers.ValidationError('No máximo duas turmas por aluno.')
        seen = set()
        for tid in value:
            if tid in seen:
                raise serializers.ValidationError('Não repita a mesma turma.')
            seen.add(tid)
            if not Turma.objects.filter(id=tid, ativo=True).exists():
                raise serializers.ValidationError(f'Turma {tid} inválida ou inativa.')
        return list(value)

    def _aplicar_turmas_aluno(self, instance, turmas_ids):
        """Define até duas turmas no M2M; valida compatibilidade com dias habilitados."""
        if turmas_ids == []:
            instance.turmas_aluno.clear()
            return
        turma_objs = []
        for tid in turmas_ids[:2]:
            turma_obj = Turma.objects.filter(id=tid, ativo=True).first()
            if not turma_obj:
                raise serializers.ValidationError({'turmas': f'Turma {tid} inválida ou inativa.'})
            ok, motivo = _validar_aluno_turma(instance, turma_obj)
            if not ok:
                raise serializers.ValidationError({'turmas': motivo})
            turma_objs.append(turma_obj)
        instance.turmas_aluno.set(turma_objs)
        for t in turma_objs:
            criar_mensalidade_ao_vincular_turma(instance, t)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.parq_completion_date:
            representation['parq_completion_date'] = format_datetime_api(instance.parq_completion_date)
        if instance.contrato_aceito_em:
            representation['contrato_aceito_em'] = format_datetime_api(instance.contrato_aceito_em)
        representation['tipo'] = instance.tipo
        if instance.tipo == 'aluno':
            representation['turmas'] = list(
                instance.turmas_aluno.order_by('horario', 'id').values_list('id', flat=True)[:2]
            )
        else:
            representation['turmas'] = []

        # Remove ficha_medica para Professor e Gerente
        if instance.tipo in ['professor', 'gerente']:
            representation.pop('ficha_medica', None)
            representation.pop('nome_responsavel', None)
            representation.pop('telefone_responsavel', None)
            representation.pop('telefone_emergencia', None)
            representation.pop('dia_vencimento', None)
            representation.pop('valor_mensalidade', None)
            representation.pop('plano', None)
            representation.pop('dias_habilitados', None)
            representation.pop('dias_habilitados_nomes', None)
            representation.pop('turmas_vinculadas', None)
            representation.pop('turmas', None)
            # Remove campos PAR-Q para professor e gerente
            for field in ['parq_question_1', 'parq_question_2', 'parq_question_3', 
                         'parq_question_4', 'parq_question_5', 'parq_question_6', 
                         'parq_question_7', 'parq_question_8', 'parq_question_9',
                         'parq_question_10', 'parq_completed', 'parq_completion_date',
                         'contrato_aceito', 'contrato_aceito_em']:
                representation.pop(field, None)
        
        return representation

    def create(self, validated_data):
        # Cria usuário inativo (será ativado via link)
        from usuarios.utils import enviar_convite_aluno
        dias_habilitados = validated_data.pop('dias_habilitados', [])
        turmas_ids = validated_data.pop('turmas', empty)

        with transaction.atomic():
            instance = self.Meta.model(**validated_data)
            instance.is_active = False  # Usuário inativo até ativar via link
            instance.set_unusable_password()  # Não define senha - usuário definirá via link
            instance.save()

            if dias_habilitados:
                instance.dias_habilitados.set(dias_habilitados)

            if turmas_ids is not empty and instance.tipo == 'aluno':
                self._aplicar_turmas_aluno(instance, turmas_ids)

        # Envia convite de ativação se o usuário tiver e-mail
        if instance.email:
            try:
                enviar_convite_aluno(instance)
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Convite de ativação enviado para {instance.email}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erro ao enviar convite de ativação para {instance.email}: {e}")

        return instance

    def update(self, instance, validated_data):
        print(f"[DEBUG] Serializer update - validated_data: {validated_data}")
        print(f"[DEBUG] Serializer update - instance: {instance.id}")

        turmas_val = validated_data.pop('turmas', empty)
        dias_habilitados = validated_data.pop('dias_habilitados', None)
        dia_vencimento_antigo = instance.dia_vencimento
        valor_mensalidade_antigo = instance.valor_mensalidade
        password = validated_data.pop('password', None)

        with transaction.atomic():
            # Verificar se algum campo PAR-Q foi realmente alterado (valor mudou)
            parq_fields = ['parq_question_1', 'parq_question_2', 'parq_question_3', 'parq_question_4',
                           'parq_question_5', 'parq_question_6', 'parq_question_7', 'parq_question_8',
                           'parq_question_9', 'parq_question_10']

            parq_fields_present = any(field in validated_data for field in parq_fields)
            parq_fields_updated = False
            for field in parq_fields:
                if field in validated_data:
                    # Compara o valor atual com o novo valor
                    valor_atual = getattr(instance, field, False)
                    valor_novo = validated_data[field]
                    if valor_atual != valor_novo:
                        parq_fields_updated = True
                        break

            # Validar se pode preencher o PAR-Q novamente (1 ano após último preenchimento)
            # Só valida se os valores realmente mudaram E o questionário já foi preenchido antes
            if parq_fields_updated and instance.is_aluno() and instance.parq_completed:
                if not instance.can_fill_parq_again():
                    from django.utils import timezone
                    from datetime import timedelta

                    data_preenchimento = instance.parq_completion_date
                    if data_preenchimento:
                        if hasattr(data_preenchimento, 'date'):
                            data_preenchimento = data_preenchimento.date()

                        um_ano_depois = data_preenchimento + timedelta(days=365)
                        hoje = timezone.now().date()

                        dias_restantes = (um_ano_depois - hoje).days

                        raise serializers.ValidationError({
                            'parq_question_1': f'O questionário PAR-Q só pode ser preenchido uma vez por ano. '
                                             f'Último preenchimento: {instance.parq_completion_date.strftime("%d/%m/%Y") if instance.parq_completion_date else "N/A"}. '
                                             f'Você poderá preencher novamente em {dias_restantes} dia(s).'
                        })

            # Registra desistência (inativação) para relatórios mensais
            if instance.tipo == 'aluno' and 'ativo' in validated_data:
                if validated_data['ativo'] is False and instance.ativo is True:
                    validated_data['data_inativacao'] = timezone.now().date()
                elif validated_data['ativo'] is True:
                    validated_data['data_inativacao'] = None

            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            # Se campos PAR-Q foram enviados pela primeira vez ou atualizados, marcar como completo
            if instance.is_aluno() and (parq_fields_updated or (parq_fields_present and not instance.parq_completed)):
                from django.utils import timezone
                instance.parq_completed = True
                instance.parq_completion_date = timezone.now()

            if password is not None:
                instance.set_password(password)
            instance.save()

            if dias_habilitados is not None:
                instance.dias_habilitados.set(dias_habilitados)

            if turmas_val is not empty and instance.tipo == 'aluno':
                self._aplicar_turmas_aluno(instance, turmas_val)

            # Atualiza mensalidades pendentes se necessário
            if (
                ('dia_vencimento' in validated_data and validated_data['dia_vencimento'] != dia_vencimento_antigo)
                or ('valor_mensalidade' in validated_data and validated_data['valor_mensalidade'] != valor_mensalidade_antigo)
            ):
                instance.atualizar_mensalidades_pendentes()
        return instance

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if 'first_name' in attrs:
            attrs['first_name'] = self._formatar_nome(attrs['first_name'])
        if 'last_name' in attrs:
            attrs['last_name'] = self._formatar_nome(attrs['last_name'])
        tipo = attrs.get('tipo', getattr(self.instance, 'tipo', None))
        cpf_enviado = 'cpf' in attrs
        cpf = attrs.get('cpf') if cpf_enviado else None
        if cpf is None and self.instance:
            cpf = self.instance.cpf
        if cpf is not None and str(cpf).strip():
            cpf = re.sub(r'\D', '', str(cpf))
        else:
            cpf = None
        if not cpf:
            raise serializers.ValidationError({
                'cpf': 'CPF é obrigatório para este tipo de usuário.'
            })
        if len(cpf) != 11:
            raise serializers.ValidationError({
                'cpf': 'CPF deve conter exatamente 11 dígitos.',
            })
        if cpf_enviado:
            attrs['cpf'] = cpf
        # Login é sempre o CPF (11 dígitos); sobrescreve username vazio ou enviado pelo cliente
        attrs['username'] = cpf
        email = attrs.get('email')
        if email is None and self.instance:
            email = self.instance.email
        if email and str(email).strip().lower() != 'pendente':
            if tipo in ('professor', 'gerente'):
                qs = Usuario.objects.filter(email=email)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({'email': 'Esse e-mail já está cadastrado.'})
            elif tipo == 'aluno':
                data_nascimento = attrs.get('data_nascimento')
                if data_nascimento is None and self.instance:
                    data_nascimento = self.instance.data_nascimento
                validar_email_aluno_cadastro(
                    email,
                    data_nascimento,
                    instance_usuario=self.instance,
                    instance_precadastro=None,
                )
        return attrs

class PreCadastroSerializer(serializers.ModelSerializer):
    dia_vencimento = serializers.IntegerField(required=False, allow_null=True)
    valor_mensalidade = serializers.DecimalField(max_digits=7, decimal_places=2, required=False, allow_null=True)

    def _formatar_nome(self, valor):
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

    turma = serializers.PrimaryKeyRelatedField(queryset=Turma.objects.filter(ativo=True), required=False, allow_null=True)
    origem_display = serializers.SerializerMethodField()
    data_nascimento = serializers.DateField(
        format=DATA_API_FMT,
        input_formats=DATE_INPUT_FORMATS,
        required=False,
        allow_null=True,
    )
    data_aula_experimental = serializers.DateField(
        format=DATA_API_FMT,
        input_formats=DATE_INPUT_FORMATS,
        required=False,
        allow_null=True,
    )

    def get_origem_display(self, obj):
        if not obj.origem:
            return 'Pendente'
        labels = {
            'aula_experimental': 'Aula experimental',
            'ex_aluno': 'Ex-aluno',
            'formulario': 'Pendente',
        }
        return labels.get(obj.origem, obj.origem)

    class Meta:
        model = PreCadastro
        fields = [
            'id', 'first_name', 'last_name', 'email', 'telefone', 'data_nascimento', 'cpf', 'status', 'origem', 'origem_display',
            'criado_em', 'matriculado_em', 'dia_vencimento', 'valor_mensalidade', 'turma',
            'data_aula_experimental', 'compareceu_aula_experimental', 'reagendou_aula_experimental',
        ]
        read_only_fields = ('matriculado_em', 'criado_em')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.criado_em:
            ret['criado_em'] = format_datetime_api(instance.criado_em)
        if instance.matriculado_em:
            ret['matriculado_em'] = format_datetime_api(instance.matriculado_em)
        return ret

    def validate_cpf(self, value):
        if value is None:
            return None
        s = str(value).strip()
        if not s:
            return None
        cpf_limpo = re.sub(r'\D', '', s)
        if len(cpf_limpo) != 11:
            raise serializers.ValidationError('CPF deve conter exatamente 11 dígitos.')
        return cpf_limpo

    def validate_telefone(self, value):
        from usuarios.utils import normalizar_telefone_br_para_precadastro

        if value is None or not str(value).strip():
            raise serializers.ValidationError('Telefone é obrigatório.')
        digitos = normalizar_telefone_br_para_precadastro(value)
        if len(digitos) not in (10, 11):
            raise serializers.ValidationError(
                'Informe o telefone com DDD: 10 ou 11 dígitos (apenas números).'
            )
        return digitos

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if 'first_name' in attrs:
            attrs['first_name'] = self._formatar_nome(attrs['first_name'])
        if 'last_name' in attrs:
            attrs['last_name'] = self._formatar_nome(attrs['last_name'])
        email = attrs.get('email')
        if email is None and self.instance:
            email = self.instance.email
        data_nascimento = attrs.get('data_nascimento')
        if self.instance:
            data_nascimento = data_nascimento or (self.instance.data_nascimento if self.instance else None)
        if email and str(email).strip().lower() != 'pendente':
            validar_email_aluno_cadastro(
                email,
                data_nascimento,
                instance_usuario=None,
                instance_precadastro=self.instance,
            )

        # Validação para origem=aula_experimental
        origem = attrs.get('origem') or (self.instance.origem if self.instance else None)
        if origem == 'aula_experimental':
            data_aula = attrs.get('data_aula_experimental') or (self.instance.data_aula_experimental if self.instance else None)
            turma = attrs.get('turma') or (self.instance.turma if self.instance else None)
            if not data_aula:
                raise serializers.ValidationError({
                    'data_aula_experimental': 'Informe a data da aula experimental.'
                })
            from datetime import date
            hoje = date.today()
            if data_aula.month != hoje.month or data_aula.year != hoje.year:
                raise serializers.ValidationError({
                    'data_aula_experimental': 'A data deve ser no mês atual.'
                })
            if data_aula < hoje:
                raise serializers.ValidationError({
                    'data_aula_experimental': 'A data não pode ser no passado.'
                })
            if turma:
                DIAS_MAP = {'Segunda-feira': 0, 'Terça-feira': 1, 'Quarta-feira': 2, 'Quinta-feira': 3,
                            'Sexta-feira': 4, 'Sábado': 5, 'Domingo': 6}
                dias_turma = turma.dias_semana.all()
                weekdays_turma = {DIAS_MAP.get(d.nome) for d in dias_turma if DIAS_MAP.get(d.nome) is not None}
                if data_aula.weekday() not in weekdays_turma:
                    raise serializers.ValidationError({
                        'data_aula_experimental': 'A data deve ser um dia de aula da turma selecionada.'
                    })
            cpf_raw = attrs.get('cpf') or (self.instance.cpf if self.instance else None)
            if cpf_raw:
                cpf_limpo = ''.join(c for c in str(cpf_raw) if c.isdigit())
                if len(cpf_limpo) == 11:
                    qs = PreCadastro.objects.filter(
                        cpf=cpf_limpo, origem='aula_experimental', status='pendente'
                    )
                    if self.instance:
                        qs = qs.exclude(pk=self.instance.pk)
                    if qs.exists():
                        raise serializers.ValidationError({
                            'cpf': 'Este CPF já possui uma aula experimental agendada. Para reagendar, acesse o link enviado no e-mail de confirmação.'
                        })
        return attrs

class MensalidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensalidade
        fields = ['id', 'aluno', 'valor', 'data_vencimento', 'status']

class SalarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salario
        fields = ['id', 'professor', 'valor', 'competencia', 'data_pagamento', 'status']

class DefinirSenhaSerializer(serializers.Serializer):
    """Serializer para definição de senha via API"""
    new_password1 = serializers.CharField(
        min_length=8,
        write_only=True,
        help_text="Mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial"
    )
    new_password2 = serializers.CharField(write_only=True)

    def validate_new_password1(self, value):
        """Valida a força da senha"""
        validar_senha_serializer(value)
        return value

    def validate(self, attrs):
        """Valida se as senhas coincidem"""
        password1 = attrs.get('new_password1')
        password2 = attrs.get('new_password2')
        
        if password1 and password2 and password1 != password2:
            raise serializers.ValidationError({
                "new_password2": "As senhas não coincidem."
            })
        
        return attrs


class SolicitarRecuperacaoSenhaSerializer(serializers.Serializer):
    """Serializer para solicitação de recuperação de senha"""
    cpf = serializers.CharField(
        max_length=14,
        help_text="CPF do usuário (com ou sem formatação)"
    )
    
    def validate_cpf(self, value):
        """Valida e limpa o CPF"""
        # Remove formatação
        cpf_limpo = re.sub(r'\D', '', value)
        
        if len(cpf_limpo) != 11:
            raise serializers.ValidationError("CPF deve conter exatamente 11 dígitos.")
        
        return cpf_limpo


class RedefinirSenhaSerializer(serializers.Serializer):
    """Serializer para redefinição de senha via token"""
    new_password1 = serializers.CharField(
        min_length=8,
        write_only=True,
        help_text="Mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial"
    )
    new_password2 = serializers.CharField(write_only=True)

    def validate_new_password1(self, value):
        """Valida a força da senha"""
        validar_senha_serializer(value)
        return value

    def validate(self, attrs):
        """Valida se as senhas coincidem"""
        password1 = attrs.get('new_password1')
        password2 = attrs.get('new_password2')
        
        if password1 and password2 and password1 != password2:
            raise serializers.ValidationError({
                "new_password2": "As senhas não coincidem."
            })
        
        return attrs