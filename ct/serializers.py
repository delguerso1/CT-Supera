from rest_framework import serializers
from .models import CentroDeTreinamento, SuperaNews, GaleriaFoto
from turmas.models import DiaSemana

class CentroDeTreinamentoSerializer(serializers.ModelSerializer):
    dias_semana = serializers.PrimaryKeyRelatedField(
        queryset=DiaSemana.objects.all(),
        many=True,
        required=False
    )
    dias_semana_nomes = serializers.SerializerMethodField()

    class Meta:
        model = CentroDeTreinamento
        fields = ['id', 'nome', 'endereco', 'telefone', 'dias_semana', 'dias_semana_nomes']

    def get_dias_semana_nomes(self, obj):
        return [dia.nome for dia in obj.dias_semana.all()]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        dias_semana = attrs.get('dias_semana', None)
        if self.instance is None:
            if not dias_semana:
                raise serializers.ValidationError({
                    'dias_semana': 'Informe os dias de funcionamento do CT.'
                })
        elif dias_semana is not None and len(dias_semana) == 0:
            raise serializers.ValidationError({
                'dias_semana': 'O CT precisa ter pelo menos um dia de funcionamento.'
            })
        return attrs


class SuperaNewsSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.get_full_name', read_only=True)
    ativo = serializers.BooleanField(default=True, required=False)
    
    class Meta:
        model = SuperaNews
        fields = ['id', 'titulo', 'descricao', 'imagem', 'autor', 'autor_nome', 
                  'data_criacao', 'data_atualizacao', 'ativo']
        read_only_fields = ['autor', 'data_criacao', 'data_atualizacao']


class GaleriaFotoSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.get_full_name', read_only=True)
    ativo = serializers.BooleanField(default=True, required=False)
    
    class Meta:
        model = GaleriaFoto
        fields = ['id', 'titulo', 'descricao', 'imagem', 'autor', 'autor_nome',
                  'data_criacao', 'data_atualizacao', 'ativo']
        read_only_fields = ['autor', 'data_criacao', 'data_atualizacao']