from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from turmas.models import Turma
from datetime import date, timedelta
from usuarios.models import Usuario, PreCadastro
from usuarios.utils import is_professor, is_gerente
from django.http import HttpResponseForbidden
from financeiro.models import Mensalidade
from .models import Presenca
from django.core.mail import send_mail
from usuarios.utils import is_gerente_ou_professor, gerar_senha_temporaria



@login_required
@user_passes_test(lambda u: is_professor(u) or is_gerente(u))  
def registrar_presenca(request, turma_id):
    turma = get_object_or_404(Turma, id=turma_id, professor=request.user)
    hoje = date.today()

    # 🔹 Agora buscamos os alunos diretamente do modelo `Usuario`
    alunos = Usuario.objects.filter(tipo="aluno", ativo=True, turma=turma)

    if request.method == 'POST':
        alunos_presentes = request.POST.getlist('presenca')
        for aluno in alunos:
            if str(aluno.id) in alunos_presentes:
                Presenca.objects.get_or_create(
                    usuario=aluno,  # 🔹 Agora vinculamos a presença ao `Usuario`
                    data=hoje
                )
        return redirect('painel_usuario')

    return render(request, 'funcionarios/registrar_presenca.html', {
        'turma': turma,
        'alunos': alunos,  # 🔹 Agora passamos `alunos`, não `matriculas`
        'hoje': hoje,
    })

@login_required
@user_passes_test(lambda u: u.tipo == "professor")
def painel_professor(request):
    professor = get_object_or_404(Usuario, id=request.user.id, tipo="professor")

    return render(request, "funcionarios/painel_professor.html", {"professor": professor})

@login_required
def atualizar_dados_professor(request):
    professor = get_object_or_404(Usuario, id=request.user.id, tipo="professor")

    if request.method == "POST":
        professor.nome = request.POST["nome"]
        professor.email = request.POST["email"]
        professor.telefone = request.POST["telefone"]
        professor.save()
        return redirect("painel_professor")

    return render(request, "funcionarios/atualizar_dados_professor.html", {"professor": professor})

@login_required
@user_passes_test(lambda u: u.tipo == "gerente")
def painel_gerente(request):
    if request.user.tipo != "gerente":
        return HttpResponseForbidden("Acesso negado.")

    hoje = date.today()

    # 🔹 Total de alunos ativos (agora filtrado diretamente em `Usuario`)
    alunos_ativos = Usuario.objects.filter(tipo="aluno", ativo=True).count()

    # 🔹 Total de professores ativos
    professores = Usuario.objects.filter(tipo="professor", ativo=True).count()

    # 🔹 Total de mensalidades pendentes e atrasadas
    mensalidades_pendentes = Mensalidade.objects.filter(status="pendente").count()
    mensalidades_atrasadas = Mensalidade.objects.filter(status="atrasado").count()

    # 🔹 Mensalidades que vencem esta semana
    vencimento_semana = hoje + timedelta(days=7)
    mensalidades_vencendo = Mensalidade.objects.filter(data_vencimento__lte=vencimento_semana, status="pendente").count()

    return render(request, "funcionarios/painel_gerente.html", {
        "alunos_ativos": alunos_ativos,
        "professores": professores,
        "mensalidades_pendentes": mensalidades_pendentes,
        "mensalidades_atrasadas": mensalidades_atrasadas,
        "mensalidades_vencendo": mensalidades_vencendo,
    })


# === LISTAGEM E GERENCIAMENTO DE PRÉ-CADASTROS ===
@login_required
@user_passes_test(is_gerente_ou_professor)
def listar_precadastros(request):
    precadastros = PreCadastro.objects.all().order_by('-criado_em')
    return render(request, 'alunos/listar_precadastros.html', {'precadastros': precadastros})

@login_required
@user_passes_test(is_gerente_ou_professor)
def converter_precadastro(request, precadastro_id):
    """Transforma um pré-cadastro em aluno e envia senha temporária"""
    precadastro = get_object_or_404(PreCadastro, id=precadastro_id)

    if precadastro.usuario:
        messages.error(request, "⚠️ Este pré-cadastro já foi convertido em aluno!")
        return redirect("listar_precadastros")

    if request.method == "POST":
        senha_temporaria = gerar_senha_temporaria()

        usuario = Usuario.objects.create_user(
            username=precadastro.cpf.replace(".", "").replace("-", ""),
            email=precadastro.email,
            password=senha_temporaria,
            tipo="aluno",
            first_name=precadastro.nome,
            telefone=precadastro.telefone,
            is_active=True
        )

        precadastro.usuario = usuario
        precadastro.status = "matriculado"
        precadastro.save()

        mensagem = f"""
        Olá {usuario.first_name}, seja bem-vindo ao nosso sistema! 🚀

        🔑 Seus dados de acesso:
        - Usuário: {usuario.username} (CPF)
        - Senha: {senha_temporaria} (mude no primeiro acesso!)

        🔗 Acesse: https://meusistema.com/login e altere sua senha!

        Qualquer dúvida, estamos à disposição. 🤝
        """

        send_mail(
            "Seus dados de acesso ao sistema",
            mensagem,
            "sistema@meusistema.com",
            [usuario.email],
            fail_silently=False
        )

        messages.success(request, "✅ Aluno matriculado e senha enviada por e-mail!")
        return redirect("listar_precadastros")

    return render(request, "funcionarios/converter_precadastro.html", {"precadastro": precadastro})