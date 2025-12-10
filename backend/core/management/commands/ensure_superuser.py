import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings

class Command(BaseCommand):
    help = "Garante que o superusuário padrão exista."

    def handle(self, *args, **options):
        User = get_user_model()
        email = "s3multimidia@gmail.com"
        
        if not User.objects.filter(email=email).exists():
            password = User.objects.make_random_password(length=12)
            # Adaptando para User model padrão ou custom.
            # Se for AbstractUser padrão, username é obrigatório.
            # Vamos usar o email como username se não houver campo username explícito na criação ou setar igual.
            
            try:
                # Tenta criar com username = email
                user = User.objects.create_superuser(username=email, email=email, password=password)
            except Exception:
                # Se falhar (talvez username field tenha outra regra), tenta genérico
                user = User.objects.create_superuser(username="admin_s3", email=email, password=password)
            
            self.stdout.write(self.style.SUCCESS(f'Superuser criado com sucesso!'))
            self.stdout.write(self.style.WARNING(f'Email: {email}'))
            self.stdout.write(self.style.WARNING(f'Senha: {password}'))
            self.stdout.write(self.style.WARNING(f'IMPORTANTE: Salve esta senha agora!'))
        else:
            self.stdout.write(self.style.SUCCESS('Superuser já existe.'))
