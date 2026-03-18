from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.core.mail import send_mail
from django.core.signing import Signer
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
import logging
from django.conf import settings
from typing import Optional, List
from urllib.parse import quote

logger = logging.getLogger(__name__)

SALT_REAGENDAR = "reagendar_aula_experimental"


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

        # Versão HTML profissional
        mensagem_html = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ativação de Conta - CT Supera</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 300;
                }}
                .header .subtitle {{
                    margin-top: 10px;
                    opacity: 0.9;
                    font-size: 16px;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .welcome {{
                    font-size: 18px;
                    color: #2c3e50;
                    margin-bottom: 25px;
                }}
                .description {{
                    color: #555;
                    margin-bottom: 30px;
                    font-size: 16px;
                }}
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 25px;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 20px 0;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    transition: all 0.3s ease;
                }}
                .cta-button:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                }}
                .info-box {{
                    background-color: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 0 8px 8px 0;
                }}
                .info-box h3 {{
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                    font-size: 18px;
                }}
                .info-list {{
                    margin: 0;
                    padding-left: 20px;
                }}
                .info-list li {{
                    margin-bottom: 8px;
                    color: #555;
                }}
                .footer {{
                    background-color: #f8f9fa;
                    padding: 25px 30px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }}
                .link-fallback {{
                    word-break: break-all;
                    color: #667eea;
                    text-decoration: none;
                }}
                @media only screen and (max-width: 600px) {{
                    .container {{
                        margin: 10px;
                        border-radius: 4px;
                    }}
                    .header, .content, .footer {{
                        padding: 20px;
                    }}
                    .header h1 {{
                        font-size: 24px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🏋️ CT Supera</div>
                    <h1>Bem-vindo ao Sistema!</h1>
                    <div class="subtitle">Sua conta foi criada com sucesso</div>
                </div>
                
                <div class="content">
                    <div class="welcome">
                        Olá <strong>{aluno.first_name}</strong>, seja bem-vindo ao CT Supera! 🚀
                    </div>
                    
                    <div class="description">
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
                    
                    <div style="margin-top: 30px; padding: 15px; background-color: #e8f4fd; border-radius: 8px; border-left: 4px solid #3498db;">
                        <strong>🔗 Link de Ativação:</strong><br>
                        <a href="{link_ativacao}" class="link-fallback">{link_ativacao}</a>
                    </div>
                </div>
                
                <div class="footer">
                    <div style="margin-bottom: 15px;">
                        <strong>CT Supera - Centro de Treinamento</strong><br>
                        Sistema de Gestão Completo
                    </div>
                    <div style="color: #999; font-size: 12px;">
                        Se o link não funcionar, copie e cole o endereço acima no seu navegador.<br>
                        Em caso de dúvidas, entre em contato conosco.
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

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
        send_mail(
            assunto,
            mensagem.strip(),
            settings.DEFAULT_FROM_EMAIL,
            [precadastro.email],
            fail_silently=True,
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
        send_mail(
            assunto,
            mensagem.strip(),
            settings.DEFAULT_FROM_EMAIL,
            [precadastro.email],
            fail_silently=True,
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

        # Versão HTML profissional
        mensagem_html = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperação de Senha - CT Supera</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 300;
                }}
                .header .subtitle {{
                    margin-top: 10px;
                    opacity: 0.9;
                    font-size: 16px;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .welcome {{
                    font-size: 18px;
                    color: #2c3e50;
                    margin-bottom: 25px;
                }}
                .description {{
                    color: #555;
                    margin-bottom: 30px;
                    font-size: 16px;
                }}
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 25px;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 20px 0;
                    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
                    transition: all 0.3s ease;
                }}
                .cta-button:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.6);
                }}
                .info-box {{
                    background-color: #f8f9fa;
                    border-left: 4px solid #e74c3c;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 0 8px 8px 0;
                }}
                .info-box h3 {{
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                    font-size: 18px;
                }}
                .info-list {{
                    margin: 0;
                    padding-left: 20px;
                }}
                .info-list li {{
                    margin-bottom: 8px;
                    color: #555;
                }}
                .footer {{
                    background-color: #f8f9fa;
                    padding: 25px 30px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }}
                .link-fallback {{
                    word-break: break-all;
                    color: #e74c3c;
                    text-decoration: none;
                }}
                .security-notice {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    color: #856404;
                }}
                @media only screen and (max-width: 600px) {{
                    .container {{
                        margin: 10px;
                        border-radius: 4px;
                    }}
                    .header, .content, .footer {{
                        padding: 20px;
                    }}
                    .header h1 {{
                        font-size: 24px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔐 CT Supera</div>
                    <h1>Recuperação de Senha</h1>
                    <div class="subtitle">Redefina sua senha com segurança</div>
                </div>
                
                <div class="content">
                    <div class="welcome">
                        Olá <strong>{usuario.first_name}</strong>, recebemos sua solicitação! 🔐
                    </div>
                    
                    <div class="description">
                        Para redefinir sua senha e acessar sua conta novamente, 
                        clique no botão abaixo e siga as instruções.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{link_recuperacao}" class="cta-button">
                            🔑 REDEFINIR MINHA SENHA
                        </a>
                    </div>
                    
                    <div class="security-notice">
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
                    
                    <div style="margin-top: 30px; padding: 15px; background-color: #e8f4fd; border-radius: 8px; border-left: 4px solid #3498db;">
                        <strong>🔗 Link de Recuperação:</strong><br>
                        <a href="{link_recuperacao}" class="link-fallback">{link_recuperacao}</a>
                    </div>
                </div>
                
                <div class="footer">
                    <div style="margin-bottom: 15px;">
                        <strong>CT Supera - Centro de Treinamento</strong><br>
                        Sistema de Gestão Completo
                    </div>
                    <div style="color: #999; font-size: 12px;">
                        Se o link não funcionar, copie e cole o endereço acima no seu navegador.<br>
                        Em caso de dúvidas, entre em contato conosco.
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

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
