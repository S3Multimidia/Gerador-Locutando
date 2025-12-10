import time
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from core.services import NotificationService

User = get_user_model()

@admin.action(description="[Locutando] Enviar Mensagem em Massa (Broadcast)")
def send_broadcast_message(modeladmin, request, queryset: QuerySet):
    """
    Simples Broadcast Manager.
    Envia mensagens para os usuários selecionados respeitando delay.
    """
    # Exemplo de uso: selecionar usuários na lista e clicar na action
    # O ideal seria uma página intermédia para digitar a mensagem, 
    # mas para MVP vamos usar uma mensagem fixa ou pegar de um form se implementado.
    # Como o Django Admin Actions padrão não tem input, vamos assumir uma mensagem padrão
    # OU melhor, usar uma variavel de sessão ou mensagem fixa de sistema.
    
    # Para ser "production grade", deveríamos redirecionar para uma view com form.
    # Mas o prompt pede "Action no Django Admin". Vamos fazer o básico robusto.
    
    # Mensagem hardcoded para segurança ou genérica.
    # Futuro: Implementar 'Intermediate Action Page'
    message_content = "Ola! Temos novidades no Locutando. Acesse e confira!"
    
    sent_count = 0
    service = NotificationService()
    
    for user in queryset:
        # Verifica se tem telefone/perfil
        # Assumindo que username é o telefone ou existe user.profile.phone
        # user.username é safe fallback se for telefone
        phone = getattr(user, 'username', None) 
        
        if phone:
            try:
                service.notify_user(phone, message_content)
                sent_count += 1
                
                # Rate Limiting manual (Delay)
                # Evolution API aguenta bem, mas 1s é bom senso
                time.sleep(1) 
            except Exception as e:
                # Log error mas não para o loop
                print(f"Erro ao enviar para {phone}: {e}")
                
    modeladmin.message_user(request, f"Broadcast finalizado. Enviado para {sent_count} usuários.")
