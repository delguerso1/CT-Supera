from django.shortcuts import get_object_or_404
from .models import CentroDeTreinamento, SuperaNews, GaleriaFoto
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import CentroDeTreinamentoSerializer, SuperaNewsSerializer, GaleriaFotoSerializer
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import MultiPartParser, FormParser



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


# ========== SUPERA NEWS APIs ==========

class ListarSuperaNewsAPIView(APIView):
    """API para listar todas as notícias do Supera News (público)."""
    permission_classes = []

    def get(self, request):
        noticias = SuperaNews.objects.filter(ativo=True)
        serializer = SuperaNewsSerializer(noticias, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CriarSuperaNewsAPIView(APIView):
    """API para criar uma nova notícia do Supera News (apenas gerentes)."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada. Apenas gerentes podem adicionar notícias."}, 
                          status=status.HTTP_403_FORBIDDEN)

        serializer = SuperaNewsSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(autor=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EditarSuperaNewsAPIView(APIView):
    """API para editar uma notícia do Supera News (apenas gerentes)."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request, pk):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada. Apenas gerentes podem editar notícias."}, 
                          status=status.HTTP_403_FORBIDDEN)

        noticia = get_object_or_404(SuperaNews, id=pk)
        serializer = SuperaNewsSerializer(noticia, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExcluirSuperaNewsAPIView(APIView):
    """API para excluir uma notícia do Supera News (apenas gerentes)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada. Apenas gerentes podem excluir notícias."}, 
                          status=status.HTTP_403_FORBIDDEN)

        noticia = get_object_or_404(SuperaNews, id=pk)
        noticia.delete()
        return Response({"message": "Notícia excluída com sucesso!"}, status=status.HTTP_200_OK)


# ========== GALERIA DE FOTOS APIs ==========

class ListarGaleriaFotosAPIView(APIView):
    """API para listar todas as fotos da galeria (público)."""
    permission_classes = []

    def get(self, request):
        fotos = GaleriaFoto.objects.filter(ativo=True)
        serializer = GaleriaFotoSerializer(fotos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CriarGaleriaFotoAPIView(APIView):
    """API para adicionar uma nova foto na galeria (apenas gerentes)."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada. Apenas gerentes podem adicionar fotos."}, 
                          status=status.HTTP_403_FORBIDDEN)

        serializer = GaleriaFotoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(autor=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EditarGaleriaFotoAPIView(APIView):
    """API para editar uma foto da galeria (apenas gerentes)."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request, pk):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada. Apenas gerentes podem editar fotos."}, 
                          status=status.HTTP_403_FORBIDDEN)

        foto = get_object_or_404(GaleriaFoto, id=pk)
        serializer = GaleriaFotoSerializer(foto, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExcluirGaleriaFotoAPIView(APIView):
    """API para excluir uma foto da galeria (apenas gerentes)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada. Apenas gerentes podem excluir fotos."}, 
                          status=status.HTTP_403_FORBIDDEN)

        foto = get_object_or_404(GaleriaFoto, id=pk)
        foto.delete()
        return Response({"message": "Foto excluída com sucesso!"}, status=status.HTTP_200_OK)