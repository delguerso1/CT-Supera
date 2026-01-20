from rest_framework import serializers
from usuarios.models import Usuario, PreCadastro
from financeiro.models import Mensalidade, Salario
import re

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

class UsuarioSerializer(serializers.ModelSerializer):
    nome_completo = serializers.SerializerMethodField()
    tipo_display = serializers.SerializerMethodField()
    centros_treinamento = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tipo', 'tipo_display', 'nome_completo', 'telefone',
            'endereco', 'data_nascimento', 'ativo', 'is_active',
            'dia_vencimento', 'valor_mensalidade', 'cpf',
            'nome_responsavel', 'telefone_responsavel', 'telefone_emergencia',
            'ficha_medica', 'salario_professor', 'pix_professor', 'foto_perfil',
            'centros_treinamento',
            # Campos do PAR-Q
            'parq_question_1', 'parq_question_2', 'parq_question_3', 'parq_question_4',
            'parq_question_5', 'parq_question_6', 'parq_question_7', 'parq_question_8',
            'parq_question_9', 'parq_question_10',
            'parq_completed', 'parq_completion_date',
            'contrato_aceito', 'contrato_aceito_em'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
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

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['tipo'] = instance.tipo
        
        # Remove ficha_medica para Professor e Gerente
        if instance.tipo in ['professor', 'gerente']:
            representation.pop('ficha_medica', None)
            representation.pop('nome_responsavel', None)
            representation.pop('telefone_responsavel', None)
            representation.pop('telefone_emergencia', None)
            representation.pop('dia_vencimento', None)
            representation.pop('valor_mensalidade', None)
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
        
        instance = self.Meta.model(**validated_data)
        instance.is_active = False  # Usuário inativo até ativar via link
        instance.set_unusable_password()  # Não define senha - usuário definirá via link
        instance.save()
        
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
        
        dia_vencimento_antigo = instance.dia_vencimento
        valor_mensalidade_antigo = instance.valor_mensalidade
        password = validated_data.pop('password', None)
        
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
        
        # Atualiza mensalidades pendentes se necessário
        if (
            ('dia_vencimento' in validated_data and validated_data['dia_vencimento'] != dia_vencimento_antigo)
            or ('valor_mensalidade' in validated_data and validated_data['valor_mensalidade'] != valor_mensalidade_antigo)
        ):
            instance.atualizar_mensalidades_pendentes()
        return instance

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

    class Meta:
        model = PreCadastro
        fields = ['id', 'first_name', 'last_name', 'email', 'telefone', 'data_nascimento', 'cpf', 'status', 'criado_em', 'dia_vencimento', 'valor_mensalidade']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if 'first_name' in attrs:
            attrs['first_name'] = self._formatar_nome(attrs['first_name'])
        if 'last_name' in attrs:
            attrs['last_name'] = self._formatar_nome(attrs['last_name'])
        return attrs

class MensalidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensalidade
        fields = ['id', 'aluno', 'valor', 'data_vencimento', 'status']

class SalarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salario
        fields = ['id', 'professor', 'valor', 'data_pagamento', 'status']

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
            raise serializers.ValidationError("CPF deve ter 11 dígitos.")
        
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