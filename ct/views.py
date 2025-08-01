from django.shortcuts import get_object_or_404
from .models import CentroDeTreinamento
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import CentroDeTreinamentoSerializer
from rest_framework.generics import RetrieveAPIView



class ListaCTAPIView(APIView):
    """API para listar os Centros de Treinamento (apenas gerentes)."""
    permission_classes = []

    def get(self, request):
        centros = CentroDeTreinamento.objects.all()
        serializer = CentroDeTreinamentoSerializer(centros, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CriarCTAPIView(APIView):
    """API para criar um novo Centro de Treinamento (apenas gerentes)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CentroDeTreinamentoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EditarCTAPIView(APIView):
    """API para editar um Centro de Treinamento existente (apenas gerentes)."""
    permission_classes = [IsAuthenticated]

    def put(self, request, ct_id):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

        ct = get_object_or_404(CentroDeTreinamento, id=ct_id)
        serializer = CentroDeTreinamentoSerializer(ct, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExcluirCTAPIView(APIView):
    """API para excluir um Centro de Treinamento (apenas gerentes)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, ct_id):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

        ct = get_object_or_404(CentroDeTreinamento, id=ct_id)
        ct.delete()
        return Response({"message": "Centro de Treinamento excluído com sucesso!"}, status=status.HTTP_200_OK)


class DetalheCTAPIView(RetrieveAPIView):
    """API para detalhar um Centro de Treinamento."""
    queryset = CentroDeTreinamento.objects.all()
    serializer_class = CentroDeTreinamentoSerializer