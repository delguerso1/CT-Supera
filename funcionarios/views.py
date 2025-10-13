from django.shortcuts import get_object_or_404
from turmas.models import Turma
from datetime import date
from usuarios.models import Usuario, PreCadastro
from financeiro.models import Mensalidade
from .models import Presenca
from .serializers import UsuarioSerializer, PreCadastroSerializer, PresencaSerializer, TurmaSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.mail import send_mail
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class VerificarCheckinAlunosAPIView(APIView):
    """API para verificar quais alunos fizeram check-in em uma turma."""
    permission_classes = [IsAuthenticated]

    def get(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)
        hoje = date.today()

        # Busca todos os alunos da turma
        alunos = Usuario.objects.filter(tipo="aluno", ativo=True, turmas_aluno=turma)
        
        status_alunos = []
        
        for aluno in alunos:
            presenca = Presenca.objects.filter(
                usuario=aluno, 
                data=hoje, 
                turma=turma
            ).first()
            
            status_alunos.append({
                "id": aluno.id,
                "nome": f"{aluno.first_name} {aluno.last_name}",
                "username": aluno.username,
                "checkin_realizado": presenca.checkin_realizado if presenca else False,
                "presenca_confirmada": presenca.presenca_confirmada if presenca else False,
                "pode_confirmar_presenca": presenca.checkin_realizado if presenca else False
            })

        return Response({
            "turma": turma.__str__(),
            "data": hoje.isoformat(),
            "alunos": status_alunos
        }, status=status.HTTP_200_OK)


class RegistrarPresencaAPIView(APIView):
    """API para registrar presença dos alunos em uma turma."""
    permission_classes = [IsAuthenticated]

    def post(self, request, turma_id):
        turma = get_object_or_404(Turma, id=turma_id)
        hoje = date.today()

        alunos_presentes = request.data.get('presenca', [])
        alunos = Usuario.objects.filter(tipo="aluno", ativo=True, turmas_aluno=turma)

        presencas_registradas = 0
        alunos_sem_checkin = []

        for aluno in alunos:
            if str(aluno.id) in alunos_presentes:
                # Verifica se o aluno fez check-in
                presenca = Presenca.objects.filter(
                    usuario=aluno, 
                    data=hoje, 
                    turma=turma,
                    checkin_realizado=True
                ).first()
                
                if presenca:
                    # Confirma a presença
                    presenca.presenca_confirmada = True
                    presenca.save()
                    presencas_registradas += 1
                else:
                    alunos_sem_checkin.append(f"{aluno.first_name} {aluno.last_name}")

        # Retorna resultado
        if alunos_sem_checkin:
            return Response({
                "message": f"Presenças registradas: {presencas_registradas}",
                "warning": f"Alunos sem check-in: {', '.join(alunos_sem_checkin)}",
                "alunos_sem_checkin": alunos_sem_checkin
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "message": f"Presenças registradas com sucesso! ({presencas_registradas} alunos)"
            }, status=status.HTTP_200_OK)


class PainelProfessorAPIView(APIView):
    """API para exibir o painel do professor."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        professor = get_object_or_404(Usuario, id=request.user.id, tipo="professor")
        serializer = UsuarioSerializer(professor)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AtualizarDadosProfessorAPIView(APIView):
    """API para atualizar os dados do professor."""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        professor = get_object_or_404(Usuario, id=request.user.id, tipo="professor")
        serializer = UsuarioSerializer(professor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AtualizarDadosGerenteAPIView(APIView):
    """API para atualizar os dados do gerente."""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        gerente = get_object_or_404(Usuario, id=request.user.id, tipo="gerente")
        serializer = UsuarioSerializer(gerente, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PainelGerenteAPIView(APIView):
    """API para exibir o painel do gerente."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            logger.info(f"Requisição de estatísticas recebida do usuário: {request.user.username}")
            
            if request.user.tipo != "gerente":
                logger.warning(f"Tentativa de acesso não autorizado por: {request.user.username}")
                return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)

            # Estatísticas básicas
            hoje = timezone.now().date()
            primeiro_dia_mes = hoje.replace(day=1)
            
            alunos_ativos = Usuario.objects.filter(tipo="aluno", ativo=True).count()
            professores = Usuario.objects.filter(tipo="professor", ativo=True).count()
            mensalidades_pendentes = Mensalidade.objects.filter(status="pendente").count()
            mensalidades_atrasadas = Mensalidade.objects.filter(status="atrasado").count()
            mensalidades_pagas = Mensalidade.objects.filter(status="pago").count()
            precadastros = PreCadastro.objects.count()
            turmas = Turma.objects.all()

            # Atividades recentes
            atividades = []

            # Últimos alunos cadastrados
            ultimos_alunos = Usuario.objects.filter(
                tipo="aluno",
                date_joined__gte=timezone.now() - timedelta(days=7)
            ).order_by('-date_joined')[:5]

            for aluno in ultimos_alunos:
                atividades.append({
                    'id': f'aluno_{aluno.id}',
                    'type': 'aluno',
                    'description': f'Novo aluno cadastrado - {aluno.first_name}',
                    'data': aluno.date_joined.isoformat()
                })

            # Últimas mensalidades pagas
            ultimas_mensalidades = Mensalidade.objects.filter(
                status="pago",
                data_vencimento__gte=timezone.now() - timedelta(days=7)
            ).order_by('-data_vencimento')[:5]

            for mensalidade in ultimas_mensalidades:
                atividades.append({
                    'id': f'mensalidade_{mensalidade.id}',
                    'type': 'mensalidade',
                    'description': f'Mensalidade paga - {mensalidade.aluno.first_name}',
                    'data': mensalidade.data_vencimento.isoformat()
                })

            # Ordena todas as atividades por data
            atividades.sort(key=lambda x: x['data'], reverse=True)

            # Dados do gerente
            gerente = get_object_or_404(Usuario, id=request.user.id, tipo="gerente")
            gerente_data = UsuarioSerializer(gerente).data
            
            response_data = {
                'alunos_ativos': alunos_ativos,
                'professores': professores,
                'mensalidades_pendentes': mensalidades_pendentes,
                'mensalidades_atrasadas': mensalidades_atrasadas,
                'mensalidades_pagas': mensalidades_pagas,
                'precadastros': precadastros,
                'turmas': TurmaSerializer(turmas, many=True).data,
                'atividades_recentes': atividades[:5],
                # Dados do gerente
                'first_name': gerente_data.get('first_name'),
                'last_name': gerente_data.get('last_name'),
                'email': gerente_data.get('email'),
                'telefone': gerente_data.get('telefone'),
                'endereco': gerente_data.get('endereco'),
                'data_nascimento': gerente_data.get('data_nascimento'),
                'foto_perfil': gerente_data.get('foto_perfil'),
                'ativo': gerente_data.get('ativo'),
                'id': gerente_data.get('id')
            }
            
            logger.info("Dashboard do gerente gerado com sucesso")
            return Response(response_data)

        except Exception as e:
            logger.error(f"Erro ao gerar dashboard do gerente: {str(e)}", exc_info=True)
            return Response({'error': 'Erro ao carregar dashboard do gerente'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListarPrecadastrosAPIView(APIView):
    """API para listar os pré-cadastros."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        precadastros = PreCadastro.objects.all().order_by('-criado_em')
        serializer = PreCadastroSerializer(precadastros, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConverterPrecadastroAPIView(APIView):
    """API para converter um pré-cadastro em aluno e enviar convite de ativação."""
    permission_classes = [IsAuthenticated]

    def post(self, request, precadastro_id):
        precadastro = get_object_or_404(PreCadastro, id=precadastro_id)

        if precadastro.usuario:
            return Response({"error": "Este pré-cadastro já foi convertido em aluno!"}, status=status.HTTP_400_BAD_REQUEST)

        # Importa as funções necessárias
        from usuarios.utils import enviar_convite_aluno
        
        # Cria usuário inativo (será ativado via link)
        usuario = Usuario.objects.create_user(
            username=precadastro.cpf.replace(".", "").replace("-", ""),
            email=precadastro.email,
            password=None,  # Não define senha - usuário definirá via link
            tipo="aluno",
            first_name=precadastro.first_name,
            last_name=precadastro.last_name,
            telefone=precadastro.telefone,
            cpf=precadastro.cpf,
            data_nascimento=precadastro.data_nascimento,
            is_active=False  # Usuário inativo até ativar via link
        )
        usuario.set_unusable_password()  # Não define senha válida
        usuario.save()

        precadastro.usuario = usuario
        precadastro.status = "matriculado"
        precadastro.save()

        # Envia convite de ativação (NÃO envia senha por e-mail)
        if usuario.email:
            try:
                enviar_convite_aluno(usuario)
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Convite de ativação enviado para {usuario.email}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erro ao enviar convite de ativação para {usuario.email}: {e}")

        return Response({"message": "Aluno matriculado com sucesso! Um convite de ativação foi enviado para o e-mail informado."}, status=status.HTTP_201_CREATED)


class HistoricoAulasProfessorAPIView(APIView):
    """API para exibir o histórico de aulas do professor."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        professor = request.user
        turmas = Turma.objects.filter(professor=professor)

        historico = []
        for turma in turmas:
            datas = Presenca.objects.filter(turma=turma).values_list('data', flat=True).distinct().order_by('data')
            historico.append({
                "turma": TurmaSerializer(turma).data,
                "datas": datas,
            })

        return Response({"historico": historico}, status=status.HTTP_200_OK)


