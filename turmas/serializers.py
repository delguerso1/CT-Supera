from rest_framework import serializers
from usuarios.models import Usuario
from .models import Turma, DiaSemana
from ct.serializers import CentroDeTreinamentoSerializer
from ct.models import CentroDeTreinamento

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'telefone', 'tipo', 'foto_perfil']

class TurmaSerializer(serializers.ModelSerializer):
    professor_nome = serializers.SerializerMethodField()
    dias_semana_nomes = serializers.SerializerMethodField()
    alunos_count = serializers.SerializerMethodField()
    vagas_disponiveis = serializers.SerializerMethodField()
    tem_vagas = serializers.SerializerMethodField()
    ct_nome = serializers.SerializerMethodField()

    ct = serializers.PrimaryKeyRelatedField(
        queryset=CentroDeTreinamento.objects.all()
    )
    dias_semana = serializers.PrimaryKeyRelatedField(
        queryset=DiaSemana.objects.all(),
        many=True
    )
    professor = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.filter(tipo='professor'),
        allow_null=True,
        required=False
    )

    class Meta:
        model = Turma
        fields = [
            'id', 'ct', 'ct_nome', 'dias_semana', 'dias_semana_nomes', 'horario', 'capacidade_maxima',
            'professor', 'professor_nome', 'alunos', 'alunos_count', 'vagas_disponiveis',
            'tem_vagas', 'ativo'
        ]
        depth = 1

    def get_professor_nome(self, obj):
        if obj.professor:
            first = obj.professor.first_name or ''
            last = obj.professor.last_name or ''
            return f"{first} {last}".strip()
        return ""

    def get_dias_semana_nomes(self, obj):
        return [dia.nome for dia in obj.dias_semana.all()]

    def get_alunos_count(self, obj):
        return obj.alunos.filter(ativo=True).count()

    def get_vagas_disponiveis(self, obj):
        alunos_ativos = obj.alunos.filter(ativo=True).count()
        return max(0, obj.capacidade_maxima - alunos_ativos)

    def get_tem_vagas(self, obj):
        return self.get_vagas_disponiveis(obj) > 0

    def get_ct_nome(self, obj):
        return obj.ct.nome if obj.ct else ""

    # Para criação/edição, sobrescrever o comportamento
    def to_internal_value(self, data):
        # Para escrita, aceita ct como ID
        if 'ct' in data:
            data = data.copy()
            # Converte para o formato que o modelo espera
        return super().to_internal_value(data)

class DiaSemanaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaSemana
        fields = ['id', 'nome']