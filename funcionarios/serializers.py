from rest_framework import serializers
from usuarios.models import Usuario, PreCadastro
from turmas.models import Turma
from .models import Presenca

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'telefone', 'tipo', 'foto_perfil']

class PreCadastroSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreCadastro
        fields = ['id', 'nome', 'email', 'telefone', 'cpf', 'status', 'criado_em']

class PresencaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Presenca
        fields = ['id', 'usuario', 'data', 'turma', 'checkin_realizado', 'presenca_confirmada']

class TurmaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turma
        fields = ['id', 'ct', 'dias_semana', 'horario', 'capacidade_maxima', 'professor', 'alunos']