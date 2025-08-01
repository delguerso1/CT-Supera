from rest_framework import serializers
from .models import CentroDeTreinamento

class CentroDeTreinamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroDeTreinamento
        fields = ['id', 'nome', 'endereco', 'telefone']