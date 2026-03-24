from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.core.mail import send_mail, EmailMultiAlternatives
from django.core.signing import Signer
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
import logging
from django.conf import settings
from typing import Optional, List
from urllib.parse import quote
import re

logger = logging.getLogger(__name__)


def normalizar_telefone_br_para_precadastro(valor) -> str:
    """
    Extrai 10 ou 11 dígitos (DDD + número) a partir de máscara, +55, zeros à esquerda.
    Não remove o prefixo 55 quando há só 11 dígitos (pode ser DDD 55 no RS).
    """
    if not valor:
        return ''
    d = re.sub(r'\D', '', str(valor))
    while len(d) > 11 and d.startswith('0'):
        d = d[1:]
    if len(d) >= 12 and d.startswith('55'):
        d = d[2:]
    while len(d) > 11 and d.startswith('0'):
        d = d[1:]
    if len(d) > 11:
        d = d[-11:]
    return d

SALT_REAGENDAR = "reagendar_aula_experimental"

# Cores e branding do CT Supera (conforme o site)
EMAIL_COR_PRIMARIA = "#1F6C86"      # Azul principal (navbar, títulos)
EMAIL_COR_DESTAQUE = "#E0CC98"     # Dourado (botões)
EMAIL_COR_FUNDO = "#f5f5f5"
EMAIL_COR_FOOTER = "#666"


def _get_logo_url():
    """Retorna a URL absoluta do logo CT Supera para uso em e-mails."""
    logo_url = getattr(settings, 'EMAIL_LOGO_URL', None)
    if logo_url:
        return logo_url
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ctsupera.com.br')
    return f"{frontend_url.rstrip('/')}/logo-supera-principal.png"


def _email_wrapper_html(content_html: str, titulo_header: str = "CT Supera", subtitulo: str = "") -> str:
    """
    Retorna o HTML completo de um e-mail com header (logo + cores), conteúdo e footer.
    content_html: HTML do corpo da mensagem
    titulo_header: título exibido no header (abaixo do logo)
    subtitulo: subtítulo opcional no header
    """
    logo_url = _get_logo_url()
    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{titulo_header} - CT Supera</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: {EMAIL_COR_FUNDO};
        }}
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .email-header {{
            background-color: {EMAIL_COR_PRIMARIA};
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .email-header img {{
            max-width: 200px;
            height: auto;
            max-height: 80px;
            display: block;
            margin: 0 auto 15px auto;
        }}
        .email-header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .email-header .subtitle {{
            margin-top: 8px;
            opacity: 0.95;
            font-size: 15px;
        }}
        .email-content {{
            padding: 35px 30px;
        }}
        .cta-button {{
            display: inline-block;
            background-color: {EMAIL_COR_DESTAQUE};
            color: {EMAIL_COR_PRIMARIA};
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            margin: 15px 0;
        }}
        .info-box {{
            background-color: #f8f9fa;
            border-left: 4px solid {EMAIL_COR_PRIMARIA};
            padding: 18px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }}
        .info-box h3 {{
            margin: 0 0 12px 0;
            color: #2c3e50;
            font-size: 16px;
        }}
        .info-list {{
            margin: 0;
            padding-left: 20px;
        }}
        .info-list li {{
            margin-bottom: 6px;
            color: #555;
        }}
        .email-footer {{
            background-color: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            color: {EMAIL_COR_FOOTER};
            font-size: 14px;
        }}
        .link-fallback {{
            word-break: break-all;
            color: {EMAIL_COR_PRIMARIA};
            text-decoration: none;
        }}
        @media only screen and (max-width: 600px) {{
            .email-container {{
                margin: 10px;
            }}
            .email-header, .email-content, .email-footer {{
                padding: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <img src="{logo_url}" alt="CT Supera - Centro de Treinamento" />
            <h1>{titulo_header}</h1>
            {f'<div class="subtitle">{subtitulo}</div>' if subtitulo else ''}
        </div>
        <div class="email-content">
            {content_html}
        </div>
        <div class="email-footer">
            <strong>CT Supera - Centro de Treinamento</strong><br>
            Sistema de Gestão Completo
        </div>
    </div>
</body>
</html>
"""


def gerar_token_reagendamento(precadastro_id: int) -> str:
    """Gera token assinado para reagendamento de aula experimental."""
    signer = Signer(salt=SALT_REAGENDAR)
    return signer.sign(precadastro_id)


def obter_precadastro_por_token(token: str):
    """Valida token e retorna o PreCadastro ou None."""
    from usuarios.models import PreCadastro
    try:
        signer = Signer(salt=SALT_REAGENDAR)
        pk = signer.unsign(token)
        return PreCadastro.objects.filter(
            pk=int(pk),
            origem='aula_experimental',
            status='pendente',
        ).select_related('turma', 'turma__ct').first()
    except Exception:
        return None


def autenticar_usuario(request, tipo_esperado: str) -> Optional[object]:
    """
    Autentica um usuário e verifica se tem o tipo esperado.
    
    Args:
        request: Objeto request do Django
        tipo_esperado: Tipo de usuário esperado ('aluno', 'professor', 'gerente')
    
    Returns:
        Usuario autenticado se válido, None caso contrário
    """
    username = request.POST.get('username')
    password = request.POST.get('password')
    user = authenticate(request, username=username, password=password)

    if user and user.tipo == tipo_esperado:
        login(request, user)
        return user
    else:
        return None

def has_role(user, roles: List[str]) -> bool:
    """
    Verifica se o usuário tem um dos papéis especificados.
    
    Args:
        user: Usuario a ser verificado
        roles: Lista de papéis permitidos
    
    Returns:
        True se o usuário tem um dos papéis, False caso contrário
    """
    return user.is_authenticated and user.tipo in roles

def is_gerente(user) -> bool:
    """Verifica se o usuário é gerente."""
    return has_role(user, ['gerente'])

def is_professor(user) -> bool:
    """Verifica se o usuário é professor."""
    return has_role(user, ['professor'])

def is_aluno(user) -> bool:
    """Verifica se o usuário é aluno."""
    return has_role(user, ['aluno'])

def is_gerente_ou_professor(user) -> bool:
    """Verifica se o usuário é gerente ou professor."""
    return has_role(user, ['gerente', 'professor'])



def enviar_convite_aluno(aluno) -> None:
    """
    Envia e-mail de ativação para um aluno com link seguro.
    
    Args:
        aluno: Instância do modelo Usuario (aluno)
    
    Raises:
        Exception: Se houver erro no envio do e-mail
        ValueError: Se o aluno não tem e-mail válido
    """
    # Validações
    if not aluno.email or aluno.email == 'pendente':
        raise ValueError(f"Aluno {aluno.username} não possui e-mail válido")
    
    if not aluno.first_name:
        raise ValueError(f"Aluno {aluno.username} não possui nome válido")
    
    try:
        uidb64 = urlsafe_base64_encode(force_bytes(aluno.pk))
        token = default_token_generator.make_token(aluno)

        # URL base do frontend - ajuste conforme sua configuração
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        link_ativacao = f"{frontend_url}/ativar-conta/{uidb64}/{token}/"

        # Versão em texto simples (fallback para clientes que não suportam HTML)
        mensagem_texto = f"""
        Olá {aluno.first_name}, seja bem-vindo ao sistema! 🚀

        Sua conta foi criada com sucesso e está aguardando ativação.

        🔗 Clique no link abaixo para ativar sua conta e definir sua senha:
        {link_ativacao}

        ⚠️ IMPORTANTE:
        - Este link é válido por 24 horas
        - Use seu CPF como usuário para fazer login
        - Defina uma senha segura (mínimo 8 caracteres)
        - Se o link expirar, solicite um novo ao administrador

        Qualquer dúvida, estamos à disposição. 🤝
        """

        # Versão HTML com logo e cores CT Supera
        content_html = f"""
                    <div style="font-size: 18px; color: #2c3e50; margin-bottom: 20px;">
                        Olá <strong>{aluno.first_name}</strong>, seja bem-vindo ao CT Supera! 🚀
                    </div>
                    
                    <div style="color: #555; margin-bottom: 25px; font-size: 16px;">
                        Sua conta foi criada com sucesso e está aguardando ativação. 
                        Para começar a usar o sistema, você precisa ativar sua conta e definir sua senha.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{link_ativacao}" class="cta-button">
                            🎯 ATIVAR MINHA CONTA
                        </a>
                    </div>
                    
                    <div class="info-box">
                        <h3>⚠️ Informações Importantes</h3>
                        <ul class="info-list">
                            <li><strong>Validade:</strong> Este link é válido por 24 horas</li>
                            <li><strong>Usuário:</strong> Use seu CPF como nome de usuário para fazer login</li>
                            <li><strong>Senha:</strong> Defina uma senha segura (mínimo 8 caracteres)</li>
                            <li><strong>Segurança:</strong> Inclua letras maiúsculas, minúsculas, números e caracteres especiais</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 25px; padding: 15px; background-color: #e8f4fd; border-radius: 8px; border-left: 4px solid {EMAIL_COR_PRIMARIA};">
                        <strong>🔗 Link de Ativação:</strong><br>
                        <a href="{link_ativacao}" class="link-fallback">{link_ativacao}</a>
                    </div>
                    <div style="color: #999; font-size: 12px; margin-top: 15px;">
                        Se o link não funcionar, copie e cole o endereço acima no seu navegador.
                    </div>
        """
        mensagem_html = _email_wrapper_html(
            content_html,
            titulo_header="Bem-vindo ao Sistema!",
            subtitulo="Sua conta foi criada com sucesso"
        )

        # Envia e-mail com versão HTML e texto simples
        send_mail(
            "Ativação da sua conta - Sistema CT Supera",
            mensagem_texto,
            settings.DEFAULT_FROM_EMAIL,
            [aluno.email],
            fail_silently=False,
            html_message=mensagem_html
        )
        logger.info(f"Convite de ativação enviado para {aluno.email}")
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar convite para {aluno.email}: {str(e)}")
        raise


def enviar_primeira_mensalidade_email(aluno, forma_pagamento, valor, data_vencimento, codigo_pix=None, digitable_line=None, pdf_content=None) -> bool:
    """
    Envia e-mail ao aluno com os dados da primeira mensalidade para pagamento.
    forma_pagamento: 'pix' ou 'boleto'
    codigo_pix: código PIX Copia e Cola (quando forma_pagamento='pix')
    digitable_line: linha digitável do boleto (quando forma_pagamento='boleto')
    pdf_content: bytes do PDF do boleto (opcional, para anexar)
    """
    if not aluno.email or aluno.email == 'pendente':
        logger.warning("Aluno sem e-mail válido, não enviando cobrança.")
        return False

    nome = f"{aluno.first_name} {aluno.last_name or ''}".strip() or "Aluno"
    valor_str = f"R$ {float(valor):.2f}".replace(".", ",")
    data_str = data_vencimento.strftime("%d/%m/%Y") if hasattr(data_vencimento, 'strftime') else str(data_vencimento)

    if forma_pagamento == 'pix' and codigo_pix:
        assunto = "Sua primeira mensalidade - Pagamento via PIX - CT Supera"
        corpo_texto = f"""
Olá {nome}!

Sua matrícula foi confirmada. Segue o pagamento da primeira mensalidade:

 Valor: {valor_str}
 Vencimento: {data_str}

PAGAMENTO VIA PIX
Copie o código abaixo e cole no app do seu banco para realizar o pagamento:

{codigo_pix}

Ou escaneie o QR Code anexo (se disponível).

Qualquer dúvida, entre em contato conosco.
"""
        content_html = f"""
                    <div style="font-size: 18px; color: #2c3e50; margin-bottom: 15px;">
                        Olá <strong>{nome}</strong>,
                    </div>
                    <p style="color: #555; margin-bottom: 20px;">Sua matrícula foi confirmada. Segue o pagamento da primeira mensalidade:</p>
                    <p><strong>Valor:</strong> {valor_str}<br><strong>Vencimento:</strong> {data_str}</p>
                    <p style="margin-top: 20px;"><strong>PIX Copia e Cola:</strong></p>
                    <pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto;border-left:4px solid {EMAIL_COR_PRIMARIA};">{codigo_pix}</pre>
                    <p style="margin-top: 15px;">Copie o código acima e cole no app do seu banco.</p>
        """
        corpo_html = _email_wrapper_html(
            content_html,
            titulo_header="Primeira mensalidade - PIX",
            subtitulo="Pagamento via PIX"
        )
        email = EmailMultiAlternatives(
            assunto,
            corpo_texto.strip(),
            settings.DEFAULT_FROM_EMAIL,
            [aluno.email],
        )
        email.attach_alternative(corpo_html, "text/html")
        email.send(fail_silently=False)
        logger.info(f"Cobrança PIX enviada por e-mail para {aluno.email}")
        return True

    elif forma_pagamento == 'boleto' and digitable_line:
        assunto = "Sua primeira mensalidade - Boleto - CT Supera"
        corpo_texto = f"""
Olá {nome}!

Sua matrícula foi confirmada. Segue o pagamento da primeira mensalidade:

 Valor: {valor_str}
 Vencimento: {data_str}

PAGAMENTO VIA BOLETO
Linha digitável (copie e cole no app do banco ou internet banking):

{digitable_line}

O boleto em PDF está anexado a este e-mail.
"""
        content_html = f"""
                    <div style="font-size: 18px; color: #2c3e50; margin-bottom: 15px;">
                        Olá <strong>{nome}</strong>,
                    </div>
                    <p style="color: #555; margin-bottom: 20px;">Sua matrícula foi confirmada. Segue o pagamento da primeira mensalidade:</p>
                    <p><strong>Valor:</strong> {valor_str}<br><strong>Vencimento:</strong> {data_str}</p>
                    <p style="margin-top: 20px;"><strong>Linha digitável:</strong></p>
                    <pre style="background:#f5f5f5;padding:12px;border-radius:4px;border-left:4px solid {EMAIL_COR_PRIMARIA};">{digitable_line}</pre>
                    <p style="margin-top: 15px;">O boleto em PDF está anexado a este e-mail.</p>
        """
        corpo_html = _email_wrapper_html(
            content_html,
            titulo_header="Primeira mensalidade - Boleto",
            subtitulo="Pagamento via Boleto"
        )
        email = EmailMultiAlternatives(
            assunto,
            corpo_texto.strip(),
            settings.DEFAULT_FROM_EMAIL,
            [aluno.email],
        )
        email.attach_alternative(corpo_html, "text/html")
        if pdf_content:
            email.attach("boleto_mensalidade.pdf", pdf_content, "application/pdf")
        email.send(fail_silently=False)
        logger.info(f"Boleto enviado por e-mail para {aluno.email}")
        return True

    logger.warning("enviar_primeira_mensalidade_email: forma_pagamento ou dados inválidos")
    return False


def reenviar_convite_aluno(aluno) -> bool:
    """
    Reenvia e-mail de ativação para um aluno.
    
    Args:
        aluno: Instância do modelo Usuario (aluno)
    
    Returns:
        True se enviado com sucesso, False caso contrário
    """
    try:
        return enviar_convite_aluno(aluno)
    except Exception as e:
        logger.error(f"Erro ao reenviar convite para {aluno.email}: {str(e)}")
        return False


def enviar_confirmacao_aula_experimental(precadastro) -> bool:
    """
    Envia e-mail de confirmação de agendamento de aula experimental.
    """
    if not precadastro.email or precadastro.email == 'pendente':
        logger.warning("Pré-cadastro sem e-mail válido, não enviando confirmação.")
        return False
    if precadastro.origem != 'aula_experimental' or not precadastro.data_aula_experimental:
        return False
    try:
        nome = f"{precadastro.first_name} {precadastro.last_name or ''}".strip() or "Visitante"
        data_str = precadastro.data_aula_experimental.strftime("%d/%m/%Y")
        turma_info = ""
        if precadastro.turma:
            ct = precadastro.turma.ct
            ct_nome = ct.nome if ct else "CT"
            horario = precadastro.turma.horario.strftime("%H:%M") if precadastro.turma.horario else ""
            dias = ", ".join(d.nome for d in precadastro.turma.dias_semana.all()) if precadastro.turma.dias_semana.exists() else ""
            turma_info = f"\n\n📍 Centro: {ct_nome}\n⏰ Horário: {horario}\n📅 Dias: {dias}"
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ctsupera.com.br')
        token = gerar_token_reagendamento(precadastro.id)
        link_reagendar = f"{frontend_url}/agendamento/reagendar?token={quote(token)}"

        assunto = "Aula experimental agendada - CT Supera"
        mensagem = f"""
Olá {nome}!

Sua aula experimental foi agendada com sucesso! 🎉

📅 Data: {data_str}{turma_info}

Para reagendar (até 24h antes), acesse: {link_reagendar}

Qualquer dúvida, entre em contato conosco.
"""
        content_html = f"""
                    <div style="font-size: 18px; color: #2c3e50; margin-bottom: 20px;">
                        Olá <strong>{nome}</strong>,
                    </div>
                    <p style="color: #555; margin-bottom: 20px;">Sua aula experimental foi agendada com sucesso! 🎉</p>
                    <div class="info-box">
                        <h3>📅 Informações do agendamento</h3>
                        <p style="margin: 0;"><strong>Data:</strong> {data_str}</p>
                        {f'<p style="margin: 10px 0 0 0;">{turma_info.replace(chr(10), "<br>")}</p>' if turma_info else ''}
                    </div>
                    <p style="margin-top: 20px;">Para reagendar (até 24h antes), acesse:</p>
                    <p><a href="{link_reagendar}" class="link-fallback">{link_reagendar}</a></p>
                    <p style="margin-top: 20px; color: #666;">Qualquer dúvida, entre em contato conosco.</p>
        """
        mensagem_html = _email_wrapper_html(
            content_html,
            titulo_header="Aula experimental agendada",
            subtitulo="Confirmação de agendamento"
        )
        send_mail(
            assunto,
            mensagem.strip(),
            settings.DEFAULT_FROM_EMAIL,
            [precadastro.email],
            fail_silently=True,
            html_message=mensagem_html,
        )
        logger.info(f"Confirmação de aula experimental enviada para {precadastro.email}")
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar confirmação para {precadastro.email}: {e}")
        return False


def enviar_lembrete_aula_experimental(precadastro) -> bool:
    """
    Envia e-mail de lembrete de aula experimental (24h antes).
    """
    if not precadastro.email or precadastro.email == 'pendente':
        return False
    if precadastro.origem != 'aula_experimental' or not precadastro.data_aula_experimental:
        return False
    try:
        nome = f"{precadastro.first_name} {precadastro.last_name or ''}".strip() or "Visitante"
        data_str = precadastro.data_aula_experimental.strftime("%d/%m/%Y")
        turma_info = ""
        if precadastro.turma:
            ct = precadastro.turma.ct
            ct_nome = ct.nome if ct else "CT"
            horario = precadastro.turma.horario.strftime("%H:%M") if precadastro.turma.horario else ""
            dias = ", ".join(d.nome for d in precadastro.turma.dias_semana.all()) if precadastro.turma.dias_semana.exists() else ""
            turma_info = f"\n\n📍 Centro: {ct_nome}\n⏰ Horário: {horario}\n📅 Dias: {dias}"
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ctsupera.com.br')
        token = gerar_token_reagendamento(precadastro.id)
        link_reagendar = f"{frontend_url}/agendamento/reagendar?token={quote(token)}"

        assunto = "Lembrete: sua aula experimental amanhã - CT Supera"
        mensagem = f"""
Olá {nome}!

Lembrete: sua aula experimental é AMANHÃ! 🎯

📅 Data: {data_str}{turma_info}

Para reagendar (até 24h antes), acesse: {link_reagendar}

Te esperamos!
"""
        content_html = f"""
                    <div style="font-size: 18px; color: #2c3e50; margin-bottom: 20px;">
                        Olá <strong>{nome}</strong>,
                    </div>
                    <p style="color: #555; margin-bottom: 20px; font-size: 17px;"><strong>Lembrete: sua aula experimental é AMANHÃ! 🎯</strong></p>
                    <div class="info-box">
                        <h3>📅 Informações</h3>
                        <p style="margin: 0;"><strong>Data:</strong> {data_str}</p>
                        {f'<p style="margin: 10px 0 0 0;">{turma_info.replace(chr(10), "<br>")}</p>' if turma_info else ''}
                    </div>
                    <p style="margin-top: 20px;">Para reagendar (até 24h antes), acesse:</p>
                    <p><a href="{link_reagendar}" class="link-fallback">{link_reagendar}</a></p>
                    <p style="margin-top: 25px; font-size: 16px;">Te esperamos! 🏋️</p>
        """
        mensagem_html = _email_wrapper_html(
            content_html,
            titulo_header="Lembrete: aula experimental amanhã",
            subtitulo="Não esqueça da sua aula!"
        )
        send_mail(
            assunto,
            mensagem.strip(),
            settings.DEFAULT_FROM_EMAIL,
            [precadastro.email],
            fail_silently=True,
            html_message=mensagem_html,
        )
        logger.info(f"Lembrete de aula experimental enviado para {precadastro.email}")
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar lembrete para {precadastro.email}: {e}")
        return False


def pode_receber_convite(aluno) -> bool:
    """
    Verifica se um aluno pode receber convite de ativação.
    
    Args:
        aluno: Instância do modelo Usuario (aluno)
    
    Returns:
        True se pode receber convite, False caso contrário
    """
    return (
        aluno.email and 
        aluno.email != 'pendente' and 
        aluno.first_name and
        not aluno.is_active
    )


def enviar_recuperacao_senha(usuario) -> None:
    """
    Envia e-mail de recuperação de senha para um usuário ativo.
    
    Args:
        usuario: Instância do modelo Usuario (usuário ativo)
    
    Raises:
        Exception: Se houver erro no envio do e-mail
        ValueError: Se o usuário não tem e-mail válido ou não está ativo
    """
    # Validações
    if not usuario.email or usuario.email == 'pendente':
        raise ValueError(f"Usuário {usuario.username} não possui e-mail válido")
    
    if not usuario.first_name:
        raise ValueError(f"Usuário {usuario.username} não possui nome válido")
    
    if not usuario.is_active:
        raise ValueError(f"Usuário {usuario.username} não está ativo")
    
    try:
        uidb64 = urlsafe_base64_encode(force_bytes(usuario.pk))
        token = default_token_generator.make_token(usuario)

        # URL base do frontend - ajuste conforme sua configuração
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        link_recuperacao = f"{frontend_url}/redefinir-senha/{uidb64}/{token}/"

        # Versão em texto simples (fallback para clientes que não suportam HTML)
        mensagem_texto = f"""
        Olá {usuario.first_name}, recebemos sua solicitação de recuperação de senha! 🔐

        Para redefinir sua senha, clique no link abaixo:
        {link_recuperacao}

        ⚠️ IMPORTANTE:
        - Este link é válido por 24 horas
        - Use seu CPF como usuário para fazer login
        - Defina uma senha segura (mínimo 8 caracteres)
        - Se não solicitou esta recuperação, ignore este e-mail

        Qualquer dúvida, estamos à disposição. 🤝
        """

        # Versão HTML com logo e cores CT Supera
        content_html = f"""
                    <div style="font-size: 18px; color: #2c3e50; margin-bottom: 20px;">
                        Olá <strong>{usuario.first_name}</strong>, recebemos sua solicitação! 🔐
                    </div>
                    
                    <div style="color: #555; margin-bottom: 25px; font-size: 16px;">
                        Para redefinir sua senha e acessar sua conta novamente, 
                        clique no botão abaixo e siga as instruções.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{link_recuperacao}" class="cta-button">
                            🔑 REDEFINIR MINHA SENHA
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404;">
                        <strong>⚠️ Aviso de Segurança:</strong><br>
                        Se você não solicitou esta recuperação de senha, 
                        ignore este e-mail. Sua conta permanece segura.
                    </div>
                    
                    <div class="info-box">
                        <h3>📋 Informações Importantes</h3>
                        <ul class="info-list">
                            <li><strong>Validade:</strong> Este link é válido por 24 horas</li>
                            <li><strong>Usuário:</strong> Use seu CPF como nome de usuário para fazer login</li>
                            <li><strong>Senha:</strong> Defina uma senha segura (mínimo 8 caracteres)</li>
                            <li><strong>Segurança:</strong> Inclua letras maiúsculas, minúsculas, números e caracteres especiais</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 25px; padding: 15px; background-color: #e8f4fd; border-radius: 8px; border-left: 4px solid {EMAIL_COR_PRIMARIA};">
                        <strong>🔗 Link de Recuperação:</strong><br>
                        <a href="{link_recuperacao}" class="link-fallback">{link_recuperacao}</a>
                    </div>
                    <div style="color: #999; font-size: 12px; margin-top: 15px;">
                        Se o link não funcionar, copie e cole o endereço acima no seu navegador.
                    </div>
        """
        mensagem_html = _email_wrapper_html(
            content_html,
            titulo_header="Recuperação de Senha",
            subtitulo="Redefina sua senha com segurança"
        )

        # Envia e-mail com versão HTML e texto simples
        send_mail(
            "Recuperação de Senha - Sistema CT Supera",
            mensagem_texto,
            settings.DEFAULT_FROM_EMAIL,
            [usuario.email],
            fail_silently=False,
            html_message=mensagem_html
        )
        logger.info(f"E-mail de recuperação de senha enviado para {usuario.email}")
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail de recuperação para {usuario.email}: {str(e)}")
        raise
