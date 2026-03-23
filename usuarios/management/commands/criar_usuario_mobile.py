"""
Comando para criar um usuário de acesso ao app mobile CT Supera.

Uso:
  python manage.py criar_usuario_mobile --cpf 12345678901 --senha SuaSenha123
  python manage.py criar_usuario_mobile --cpf 12345678901 --senha SuaSenha123 --tipo gerente
  python manage.py criar_usuario_mobile --cpf 12345678901 --senha SuaSenha123 --tipo aluno --nome "Seu Nome"
"""
from django.core.management.base import BaseCommand
from usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Cria um usuário para acesso ao app mobile (login com CPF e senha)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cpf',
            type=str,
            required=True,
            help='CPF do usuário (apenas números, 11 dígitos)',
        )
        parser.add_argument(
            '--senha',
            type=str,
            required=True,
            help='Senha do usuário (mínimo 8 caracteres)',
        )
        parser.add_argument(
            '--tipo',
            type=str,
            choices=['gerente', 'professor', 'aluno'],
            default='gerente',
            help='Tipo de usuário: gerente (acesso total), professor ou aluno',
        )
        parser.add_argument(
            '--nome',
            type=str,
            default='Usuário Mobile',
            help='Nome do usuário',
        )
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help='E-mail (opcional). Se não informado, usa cpf@ctsupera.local',
        )

    def handle(self, *args, **options):
        cpf = ''.join(c for c in options['cpf'] if c.isdigit())
        if len(cpf) != 11:
            self.stderr.write(self.style.ERROR('CPF deve conter exatamente 11 dígitos.'))
            return

        senha = options['senha']
        if len(senha) < 8:
            self.stderr.write(self.style.ERROR('A senha deve ter no mínimo 8 caracteres.'))
            return

        tipo = options['tipo']
        nome = options['nome'] or 'Usuário Mobile'
        email = options['email'] or f'{cpf}@ctsupera.local'

        # Evita conflito de e-mail único
        base_email = email
        counter = 0
        while Usuario.objects.filter(email=email).exists():
            counter += 1
            email = f'{cpf}{counter}@ctsupera.local'

        if Usuario.objects.filter(cpf=cpf).exists():
            user = Usuario.objects.get(cpf=cpf)
            user.set_password(senha)
            user.is_active = True
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'Usuario ja existia. Senha atualizada com sucesso!\n'
                f'  CPF (login): {cpf}\n'
                f'  Senha: {senha}\n'
                f'  Tipo: {user.tipo}'
            ))
            return

        first_name = nome.split()[0] if nome else 'Usuário'
        last_name = ' '.join(nome.split()[1:]) if len(nome.split()) > 1 else 'Mobile'

        user = Usuario.objects.create_user(
            username=cpf,
            email=email,
            password=senha,
            tipo=tipo,
            first_name=first_name,
            last_name=last_name,
            cpf=cpf,
            telefone='(11)99999-9999',
            is_active=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'\nUsuario criado com sucesso!\n\n'
            f'  Use no app mobile:\n'
            f'  CPF (login):  {cpf}\n'
            f'  Senha:        {senha}\n'
            f'  Tipo: {tipo}'
        ))
