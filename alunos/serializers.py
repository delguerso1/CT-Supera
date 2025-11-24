from rest_framework import serializers
from usuarios.models import Usuario
from financeiro.models import Mensalidade
from funcionarios.models import Presenca
from turmas.models import Turma

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'data_nascimento', 'tipo', 'telefone', 'endereco',
            'nome_responsavel', 'telefone_responsavel', 'telefone_emergencia',
            'ficha_medica', 'ativo', 'foto_perfil',
            # Campos do PAR-Q
            'parq_question_1', 'parq_question_2', 'parq_question_3', 'parq_question_4',
            'parq_question_5', 'parq_question_6', 'parq_question_7',
            'parq_completed', 'parq_completion_date'
        ]

class MensalidadeSerializer(serializers.ModelSerializer):
    valor = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    data_vencimento = serializers.DateField(format="%Y-%m-%d")
    data_pagamento = serializers.DateField(format="%Y-%m-%d", allow_null=True)
    
    class Meta:
        model = Mensalidade
        fields = ['id', 'aluno', 'valor', 'data_vencimento', 'data_pagamento', 'status']

class PresencaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Presenca
        fields = ['id', 'usuario', 'data']

class TurmaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turma
        fields = ['id', 'nome', 'descricao', 'alunos']