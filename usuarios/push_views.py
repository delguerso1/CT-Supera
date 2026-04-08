"""
APIs para registro de token push (Expo) e envio de avisos a alunos pelo app.
"""
import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.models import PushTokenExpo
from usuarios.push_expo import enviar_lote_expo_push, token_expo_formato_valido

logger = logging.getLogger(__name__)


class RegistrarPushTokenExpoAPIView(APIView):
    """Aluno (ou outro usuário) registra o token do dispositivo para receber push."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "tipo", None) != "aluno":
            return Response(
                {
                    "error": "Apenas contas de aluno podem registrar dispositivo para este aviso.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        token = (
            request.data.get("token") or request.data.get("expoPushToken") or ""
        ).strip()
        if not token or not token_expo_formato_valido(token):
            logger.warning(
                "push-token inválido user_id=%s amostra=%r",
                getattr(request.user, "pk", None),
                (token[:48] + "…") if len(token) > 48 else token,
            )
            return Response(
                {
                    "error": (
                        "Token Expo inválido. Use o token retornado por "
                        "Notifications.getExpoPushTokenAsync no aparelho (não strings de teste)."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Um token pertence a um aparelho; reatribui se já existir (troca de usuário no mesmo aparelho é raro)
        try:
            PushTokenExpo.objects.update_or_create(
                token=token,
                defaults={"usuario": request.user},
            )
        except Exception:
            logger.exception(
                "Falha ao salvar PushTokenExpo user_id=%s tipo=%s len_token=%s",
                request.user.pk,
                getattr(request.user, "tipo", ""),
                len(token),
            )
            return Response(
                {
                    "error": "Não foi possível salvar o token no servidor. Verifique se o deploy aplicou as migrações mais recentes.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        logger.info(
            "Push token registrado user_id=%s tipo=%s len_token=%s",
            request.user.pk,
            getattr(request.user, "tipo", ""),
            len(token),
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class NotificacaoAppEstatisticasAPIView(APIView):
    """Quantidade de alunos com token registrado (para exibir no painel do gerente)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.tipo != "gerente":
            return Response(
                {"error": "Apenas gerentes podem consultar esta estatística."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Todos os alunos com token (inclui conta Django inativa e aluno “inativo” no CT),
        # para o painel refletir o mesmo público do envio em massa.
        base = {"usuario__tipo": "aluno"}
        # Conta só tokens com formato aceito pela Expo (evita placeholders de teste no painel).
        aluno_ids_com_token_valido = set()
        n_tokens_alunos = 0
        for uid, tok in PushTokenExpo.objects.filter(**base).values_list(
            "usuario_id", "token"
        ):
            if token_expo_formato_valido(tok):
                aluno_ids_com_token_valido.add(uid)
                n_tokens_alunos += 1
        alunos_com_app = len(aluno_ids_com_token_valido)
        tokens_total = n_tokens_alunos
        dispositivos_no_servidor = sum(
            1
            for tok in PushTokenExpo.objects.values_list("token", flat=True)
            if token_expo_formato_valido(tok)
        )
        return Response(
            {
                "alunos_com_app": alunos_com_app,
                "tokens_registrados": tokens_total,
                "dispositivos_no_servidor": dispositivos_no_servidor,
            }
        )


class EnviarNotificacaoAlunosAppAPIView(APIView):
    """Gerente envia título e mensagem a todos os alunos com token Expo registrado."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            return self._post_enviar(request)
        except Exception as e:
            logger.exception("Erro ao enviar notificações pelo app")
            return Response(
                {"error": f"Erro interno ao enviar notificações: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _post_enviar(self, request):
        if request.user.tipo != "gerente":
            return Response(
                {"error": "Apenas gerentes podem enviar notificações pelo app."},
                status=status.HTTP_403_FORBIDDEN,
            )
        titulo = (request.data.get("titulo") or request.data.get("title") or "").strip()
        mensagem = (request.data.get("mensagem") or request.data.get("body") or "").strip()
        if not titulo:
            return Response(
                {"error": "Informe o título da notificação."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not mensagem:
            return Response(
                {"error": "Informe a mensagem da notificação."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = PushTokenExpo.objects.filter(usuario__tipo="aluno").values_list(
            "token", flat=True
        )
        tokens = list(dict.fromkeys(qs))  # únicos, preserva ordem
        if not tokens:
            return Response(
                {
                    "error": "Nenhum aluno com app registrado para receber notificações.",
                    "enviados": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        resultado = enviar_lote_expo_push(tokens, titulo, mensagem)
        tickets_ok = int(resultado.get("tickets_ok") or 0)
        erros_expo = resultado.get("erros") or []

        logger.info(
            "Push gerente user_id=%s titulo=%r tokens=%s tickets_ok=%s erros=%s",
            request.user.id,
            titulo,
            len(tokens),
            tickets_ok,
            erros_expo[:5],
        )

        if tickets_ok == 0:
            partes = [str(e) for e in erros_expo[:5]]
            mensagem_erro = (
                " ".join(partes)
                if partes
                else "A Expo não aceitou o envio. Verifique credenciais do app (EAS) e tokens dos dispositivos."
            )
            return Response(
                {
                    "error": mensagem_erro[:2000],
                    "destinatarios_tokens": len(tokens),
                    "detalhes": resultado,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "ok": True,
                "destinatarios_tokens": len(tokens),
                "tickets_enviados_ok": tickets_ok,
                "detalhes": resultado,
            },
            status=status.HTTP_200_OK,
        )
