from rest_framework import serializers
from .models import CentroDeTreinamento, SuperaNews, GaleriaFoto, CandidaturaTrabalho
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
        fields = ['id', 'nome', 'endereco', 'telefone', 'sem_financeiro', 'dias_semana', 'dias_semana_nomes']

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


MAX_CURRICULO_BYTES = 5 * 1024 * 1024


class CandidaturaTrabalhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidaturaTrabalho
        fields = [
            'id',
            'nome_completo',
            'email',
            'telefone',
            'tipo_vaga',
            'interesse_praia',
            'interesse_quadra',
            'periodo_ed_fis',
            'mensagem',
            'curriculo',
            'data_envio',
        ]
        read_only_fields = ['id', 'data_envio']

    def validate_curriculo(self, value):
        if value.size > MAX_CURRICULO_BYTES:
            raise serializers.ValidationError('O arquivo deve ter no máximo 5 MB.')
        return value

    def validate(self, attrs):
        if not attrs.get('interesse_praia') and not attrs.get('interesse_quadra'):
            raise serializers.ValidationError({
                'non_field_errors': ['Informe interesse em ao menos uma modalidade (praia ou quadra).']
            })
        return attrs


class CandidaturaTrabalhoListSerializer(serializers.ModelSerializer):
    """Leitura para gerentes (painel / app)."""

    tipo_vaga_display = serializers.CharField(source='get_tipo_vaga_display', read_only=True)
    curriculo_url = serializers.SerializerMethodField()

    class Meta:
        model = CandidaturaTrabalho
        fields = [
            'id',
            'nome_completo',
            'email',
            'telefone',
            'tipo_vaga',
            'tipo_vaga_display',
            'interesse_praia',
            'interesse_quadra',
            'periodo_ed_fis',
            'mensagem',
            'data_envio',
            'curriculo_url',
        ]

    def get_curriculo_url(self, obj):
        if not obj.curriculo:
            return None
        request = self.context.get('request')
        path = obj.curriculo.url
        if request:
            return request.build_absolute_uri(path)
        return path