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
    professor_nomes = serializers.SerializerMethodField()
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
    professores = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.filter(tipo='professor'),
        allow_null=True,
        required=False,
        many=True
    )

    class Meta:
        model = Turma
        fields = [
            'id', 'ct', 'ct_nome', 'dias_semana', 'dias_semana_nomes', 'horario', 'capacidade_maxima',
            'professores', 'professor_nomes', 'alunos', 'alunos_count', 'vagas_disponiveis',
            'tem_vagas', 'ativo'
        ]
        depth = 1

    def get_professor_nomes(self, obj):
        professores = obj.professores.all()
        nomes = []
        for professor in professores:
            first = professor.first_name or ''
            last = professor.last_name or ''
            nomes.append(f"{first} {last}".strip())
        return [nome for nome in nomes if nome]

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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        dias_semana = attrs.get('dias_semana')
        ct = attrs.get('ct')

        if dias_semana is None and self.instance:
            dias_semana = self.instance.dias_semana.all()
        if ct is None and self.instance:
            ct = self.instance.ct

        if not dias_semana:
            raise serializers.ValidationError({
                'dias_semana': 'Informe os dias da semana da turma.'
            })

        if ct and ct.dias_semana.exists():
            dias_turma_ids = {dia.id for dia in dias_semana}
            dias_ct_ids = set(ct.dias_semana.values_list('id', flat=True))
            if not dias_turma_ids.issubset(dias_ct_ids):
                raise serializers.ValidationError({
                    'dias_semana': 'Os dias da turma devem estar dentro dos dias de funcionamento do CT.'
                })

        return attrs

class DiaSemanaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaSemana
        fields = ['id', 'nome']