from rest_framework import serializers
from .models import Salario, Despesa, Mensalidade, TransacaoC6Bank
from usuarios.serializers import UsuarioSerializer

class SalarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salario
        fields = ['id', 'professor', 'valor', 'data_pagamento', 'status']

class DespesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Despesa
        fields = ['id', 'categoria', 'descricao', 'valor', 'data']

class MensalidadeSerializer(serializers.ModelSerializer):
    aluno = UsuarioSerializer(read_only=True)
    valor_efetivo = serializers.SerializerMethodField()

    class Meta:
        model = Mensalidade
        fields = '__all__'

    def get_valor_efetivo(self, obj):
        """Valor a exibir: valor_pago (com multa/juros) se houver, senão valor base."""
        return obj.valor_pago if obj.valor_pago is not None else obj.valor

    def to_representation(self, instance):
        """Status na API reflete vencimento (pendente / atrasado / pago), não só o valor gravado no BD."""
        ret = super().to_representation(instance)
        ret['status'] = instance.status_efetivo
        return ret


class TransacaoC6BankSerializer(serializers.ModelSerializer):
    mensalidade_info = serializers.SerializerMethodField()
    
    class Meta:
        model = TransacaoC6Bank
        fields = [
            'id', 'mensalidade', 'mensalidade_info', 'tipo', 'valor', 'status',
            'txid', 'chave_pix', 'qr_code', 'codigo_pix', 'payment_url',
            'boleto_url', 'boleto_codigo', 'data_criacao', 'data_expiracao',
            'data_aprovacao', 'data_cancelamento', 'descricao', 'observacoes',
            'resposta_api', 'erro_api'
        ]
        read_only_fields = [
            'txid', 'qr_code', 'codigo_pix', 'payment_url', 'boleto_url',
            'boleto_codigo', 'data_criacao', 'data_expiracao', 'data_aprovacao',
            'data_cancelamento', 'resposta_api', 'erro_api'
        ]
    
    def get_mensalidade_info(self, obj):
        """Retorna informações básicas da mensalidade"""
        return {
            'id': obj.mensalidade.id,
            'aluno_nome': obj.mensalidade.aluno.get_full_name(),
            'valor': obj.mensalidade.valor,
            'data_vencimento': obj.mensalidade.data_vencimento,
            'status': obj.mensalidade.status_efetivo
        }