from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from usuarios.models import Usuario
from .models import Turma, DiaSemana
from .serializers import TurmaSerializer, UsuarioSerializer, DiaSemanaSerializer
from .pagination import TurmaListPagination
from django.db import models
from financeiro.services import criar_mensalidade_ao_vincular_turma
from datetime import date
from calendar import monthrange


def _validar_aluno_turma(aluno, turma):
    if not aluno.dias_habilitados.exists():
        return False, "Dias habilitados do aluno não configurados."

    dias_turma = set(turma.dias_semana.values_list('id', flat=True))
    if not dias_turma:
        return False, "A turma não possui dias da semana cadastrados."

    dias_aluno = set(aluno.dias_habilitados.values_list('id', flat=True))
    # Pelo menos um dia em comum: aluno pode ter mais dias habilitados que a turma
    # (ex.: seg–sex no aluno e turma só seg/qua/sex).
    dias_comuns = dias_aluno & dias_turma
    if not dias_comuns:
        return False, (
            "Não há dia em comum entre os dias habilitados do aluno e os dias em que a turma funciona."
        )

    return True, None


class ListaCriarTurmasAPIView(ListCreateAPIView):
    """API para listar e criar turmas."""
    queryset = Turma.objects.all()
    serializer_class = TurmaSerializer
    pagination_class = TurmaListPagination

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()] 

    def get_queryset(self):
        queryset = Turma.objects.all()
        incluir = str(self.request.query_params.get('incluir_inativas', '')).lower() in (
            '1', 'true', 'yes',
        )
        user = self.request.user
        is_gerente = (
            user.is_authenticated
            and getattr(user, 'tipo', None) == 'gerente'
        )
        if not (incluir and is_gerente):
            queryset = queryset.filter(ativo=True)

        # Filtra por CT se especificado
        ct_id = self.request.query_params.get('ct')
        if ct_id:
            queryset = queryset.filter(ct_id=ct_id)
            
        # Filtra por professor se especificado
        professor_id = self.request.query_params.get('professor')
        if professor_id:
            queryset = queryset.filter(professores__id=professor_id)
            
        # Ordena por horário e dias da semana
        queryset = queryset.order_by('horario').distinct()
        
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

        user = request.user
        is_gerente = user.is_authenticated and getattr(user, 'tipo', None) == 'gerente'
        if not turma.ativo and not is_gerente:
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

        alunos_invalidos = []
        for aluno in alunos:
            ok, motivo = _validar_aluno_turma(aluno, turma)
            if not ok:
                alunos_invalidos.append({
                    "id": aluno.id,
                    "nome": f"{aluno.first_name} {aluno.last_name}".strip(),
                    "motivo": motivo
                })

        if alunos_invalidos:
            return Response(
                {"error": "Há alunos que não podem ser adicionados à turma.", "alunos_invalidos": alunos_invalidos},
                status=status.HTTP_400_BAD_REQUEST
            )

        turma.alunos.add(*alunos)
        for aluno in alunos:
            criar_mensalidade_ao_vincular_turma(aluno, turma)
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


# Mapeamento: DiaSemana id 1=Segunda=weekday 0, 2=Terça=1, ..., 7=Domingo=6
DIASEMANA_WEEKDAY_MAP = {
    'Segunda-feira': 0, 'Terça-feira': 1, 'Quarta-feira': 2, 'Quinta-feira': 3,
    'Sexta-feira': 4, 'Sábado': 5, 'Domingo': 6,
}


class DatasAulaExperimentalAPIView(APIView):
    """Retorna datas disponíveis para aula experimental no mês atual (dias da turma, não no passado)."""
    permission_classes = [AllowAny]

    def get(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)
        hoje = date.today()
        dias_turma = turma.dias_semana.all()
        if not dias_turma.exists():
            return Response({"datas": []}, status=status.HTTP_200_OK)
        weekdays_validos = set()
        for dia in dias_turma:
            wd = DIASEMANA_WEEKDAY_MAP.get(dia.nome)
            if wd is not None:
                weekdays_validos.add(wd)
        if not weekdays_validos:
            return Response({"datas": []}, status=status.HTTP_200_OK)
        _, ultimo_dia = monthrange(hoje.year, hoje.month)
        datas = []
        for dia in range(1, ultimo_dia + 1):
            d = date(hoje.year, hoje.month, dia)
            if d.weekday() in weekdays_validos and d >= hoje:
                datas.append(d.isoformat())
        return Response({"datas": sorted(datas)}, status=status.HTTP_200_OK)