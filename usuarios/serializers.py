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

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tipo', 'tipo_display', 'nome_completo', 'telefone',
            'endereco', 'data_nascimento', 'ativo',
            'dia_vencimento', 'valor_mensalidade', 'cpf',
            'nome_responsavel', 'telefone_responsavel', 'telefone_emergencia',
            'ficha_medica', 'salario_professor', 'pix_professor', 'foto_perfil',
            # Campos do PAR-Q
            'parq_question_1', 'parq_question_2', 'parq_question_3', 'parq_question_4',
            'parq_question_5', 'parq_question_6', 'parq_question_7',
            'parq_completed', 'parq_completion_date'
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
                         'parq_question_7', 'parq_completed', 'parq_completion_date']:
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
        
        # Verificar se algum campo PAR-Q foi atualizado
        parq_fields_updated = any(field in validated_data for field in [
            'parq_question_1', 'parq_question_2', 'parq_question_3', 'parq_question_4',
            'parq_question_5', 'parq_question_6', 'parq_question_7'
        ])
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        # Se campos PAR-Q foram atualizados, marcar como completo
        if parq_fields_updated and instance.is_aluno():
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

    class Meta:
        model = PreCadastro
        fields = ['id', 'first_name', 'last_name', 'email', 'telefone', 'data_nascimento', 'cpf', 'status', 'criado_em', 'dia_vencimento', 'valor_mensalidade']

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