from rest_framework import serializers
from .models import Salario, Despesa, Mensalidade, TransacaoPix, TransacaoBancaria
from usuarios.serializers import UsuarioSerializer

class SalarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salario
        fields = ['id', 'professor', 'valor', 'data_pagamento', 'status']

class DespesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Despesa
        fields = ['id', 'descricao', 'valor', 'data']

class MensalidadeSerializer(serializers.ModelSerializer):
    aluno = UsuarioSerializer(read_only=True)

    class Meta:
        model = Mensalidade
        fields = '__all__'

class TransacaoPixSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransacaoPix
        fields = [
            'id', 'mensalidade', 'codigo_pix', 'qr_code', 'valor',
            'status', 'data_criacao', 'data_expiracao', 'data_aprovacao',
            'identificador_externo'
        ]
        read_only_fields = [
            'codigo_pix', 'qr_code', 'status', 'data_criacao',
            'data_expiracao', 'data_aprovacao', 'identificador_externo'
        ]


class TransacaoBancariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransacaoBancaria
        fields = [
            'id', 'mensalidade', 'valor', 'status', 'data_criacao',
            'data_expiracao', 'data_aprovacao', 'identificador_externo',
            'preference_id', 'payment_url', 'metodo_pagamento'
        ]
        read_only_fields = [
            'status', 'data_criacao', 'data_expiracao', 'data_aprovacao',
            'identificador_externo', 'preference_id', 'payment_url', 'metodo_pagamento'
        ]