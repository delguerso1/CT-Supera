from rest_framework import serializers
from .models import CentroDeTreinamento, SuperaNews, GaleriaFoto

class CentroDeTreinamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroDeTreinamento
        fields = ['id', 'nome', 'endereco', 'telefone']


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