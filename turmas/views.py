from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from usuarios.models import Usuario
from .models import Turma, DiaSemana
from .serializers import TurmaSerializer, UsuarioSerializer, DiaSemanaSerializer
from django.db import models


class ListaCriarTurmasAPIView(ListCreateAPIView):
    """API para listar e criar turmas."""
    queryset = Turma.objects.all()
    serializer_class = TurmaSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()] 

    def get_queryset(self):
        queryset = Turma.objects.filter(ativo=True)  # Filtra apenas turmas ativas
        
        # Filtra por CT se especificado
        ct_id = self.request.query_params.get('ct')
        if ct_id:
            queryset = queryset.filter(ct_id=ct_id)
            
        # Filtra por professor se especificado
        professor_id = self.request.query_params.get('professor')
        if professor_id:
            queryset = queryset.filter(professor_id=professor_id)
            
        # Ordena por horário e dias da semana
        queryset = queryset.order_by('horario')
        
        # Annotate com contagem de alunos ativos
        queryset = queryset.annotate(
            alunos_ativos_count=models.Count(
                'alunos',
                filter=models.Q(alunos__ativo=True)
            )
        )
        
        return queryset

class EditarExcluirTurmaAPIView(RetrieveUpdateDestroyAPIView):
    """API para editar, excluir ou visualizar uma turma."""
    permission_classes = [IsAuthenticated]
    queryset = Turma.objects.all()
    serializer_class = TurmaSerializer


class ListaAlunosTurmaAPIView(APIView):
    """API para listar os alunos de uma turma."""
    permission_classes = [IsAuthenticated]

    def get(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)

        # Verifica se a turma está ativa
        if not turma.ativo:
            return Response({"error": "Esta turma está inativa."}, status=status.HTTP_400_BAD_REQUEST)

        # Filtra apenas alunos ativos e inclui todos os campos necessários
        alunos = turma.alunos.filter(ativo=True)
        
        # Serializa os dados da turma e dos alunos
        turma_data = TurmaSerializer(turma).data
        alunos_data = UsuarioSerializer(alunos, many=True).data

        return Response({
            "turma": turma_data,
            "alunos": alunos_data
        }, status=status.HTTP_200_OK)


class AdicionarAlunoAPIView(APIView):
    """API para adicionar alunos a uma turma."""
    permission_classes = [IsAuthenticated]

    def post(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)

        # Verifica se a turma está ativa
        if not turma.ativo:
            return Response({"error": "Não é possível adicionar alunos a uma turma inativa."}, status=status.HTTP_400_BAD_REQUEST)

        alunos_ids = request.data.get("alunos", [])
        if not alunos_ids:
            return Response({"error": "Nenhum aluno foi fornecido."}, status=status.HTTP_400_BAD_REQUEST)

        # Filtra apenas alunos ativos e do tipo "aluno"
        alunos = Usuario.objects.filter(id__in=alunos_ids, tipo="aluno", ativo=True)
        if not alunos.exists():
            return Response({"error": "Nenhum aluno válido foi encontrado."}, status=status.HTTP_400_BAD_REQUEST)

        turma.alunos.add(*alunos)
        return Response({"message": "Alunos adicionados com sucesso!"}, status=status.HTTP_200_OK)


class RemoverAlunoAPIView(APIView):
    """API para remover alunos de uma turma."""
    permission_classes = [IsAuthenticated]

    def post(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)

        alunos_ids = request.data.get("alunos", [])
        if not alunos_ids:
            return Response({"error": "Nenhum aluno foi fornecido."}, status=status.HTTP_400_BAD_REQUEST)

        # Filtra apenas alunos do tipo "aluno"
        alunos = Usuario.objects.filter(id__in=alunos_ids, tipo="aluno")
        if not alunos.exists():
            return Response({"error": "Nenhum aluno válido foi encontrado."}, status=status.HTTP_400_BAD_REQUEST)

        # Remove os alunos da turma
        turma.alunos.remove(*alunos)
        return Response({"message": "Alunos removidos com sucesso!"}, status=status.HTTP_200_OK)


class ListaDiasSemanaAPIView(APIView):
    """API para listar os dias da semana."""
    permission_classes = []  # Remove todas as permissões para permitir acesso livre
    
    def get(self, request):
        dias = DiaSemana.objects.all().order_by('id')
        serializer = DiaSemanaSerializer(dias, many=True)
        return Response(serializer.data)