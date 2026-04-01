from django.utils import timezone
from rest_framework import serializers
from .models import Salario, Despesa, Mensalidade, TransacaoC6Bank
from usuarios.serializers import UsuarioSerializer


class SalarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salario
        fields = ['id', 'professor', 'valor', 'competencia', 'data_pagamento', 'status']

    def create(self, validated_data):
        from datetime import date

        if 'competencia' not in validated_data:
            h = timezone.now().date()
            validated_data['competencia'] = date(h.year, h.month, 1)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)
        if new_status == 'pago' and instance.status != 'pago':
            if validated_data.get('data_pagamento') is None and not instance.data_pagamento:
                validated_data['data_pagamento'] = timezone.now().date()
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        prof = instance.professor
        data['professor'] = {
            'id': prof.id,
            'first_name': prof.first_name or '',
            'last_name': prof.last_name or '',
        }
        return data

class DespesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Despesa
        fields = ['id', 'categoria', 'descricao', 'valor', 'data']

class MensalidadeSerializer(serializers.ModelSerializer):
    aluno = UsuarioSerializer(read_only=True)
    valor_efetivo = serializers.SerializerMethodField()
    aluno_nome = serializers.SerializerMethodField()
    forma_pagamento_label = serializers.SerializerMethodField()

    class Meta:
        model = Mensalidade
        fields = '__all__'

    def get_forma_pagamento_label(self, obj):
        """PIX/Boleto/Cartão pela transação C6 aprovada; senão baixa manual na secretaria."""
        if getattr(obj, 'status', None) != 'pago':
            return ''
        approved = [t for t in obj.transacoes_c6.all() if t.status == 'aprovado']
        if not approved:
            return 'Baixa manual'
        approved.sort(
            key=lambda t: (
                t.data_aprovacao.timestamp() if t.data_aprovacao else 0,
                t.id,
            ),
            reverse=True,
        )
        tx = approved[0]
        labels = {
            'pix': 'PIX',
            'boleto': 'Boleto',
            'cartao': 'Cartão de crédito',
            'transferencia': 'Transferência',
        }
        return labels.get(tx.tipo, tx.tipo or '—')

    def get_aluno_nome(self, obj):
        if not getattr(obj, 'aluno_id', None):
            return ''
        u = obj.aluno
        nome = u.get_full_name() if hasattr(u, 'get_full_name') else ''
        if not nome:
            nome = f"{getattr(u, 'first_name', '') or ''} {getattr(u, 'last_name', '') or ''}".strip()
        return nome or f"Aluno #{u.pk}"

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