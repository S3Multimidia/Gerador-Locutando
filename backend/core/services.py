from typing import Any, Dict
from .providers import EvolutionApiProvider
from .interfaces import NotificationProvider

class NotificationService:
    """
    Service layer for Notifications.
    Decouples the rest of the application from the concrete provider.
    """
    
    def __init__(self, provider: NotificationProvider = None):
        # Dependency Injection support
        self.provider = provider or EvolutionApiProvider()
        
    def notify_user(self, user_phone: str, message: str) -> Dict[str, Any]:
        """
        Send a standard notification to a user.
        """
        # Add basic phone sanitization here if needed
        return self.provider.send_text(user_phone, message)
    
    def send_payment_confirmation(self, user_phone: str, amount: str):
        msg = f"Ola! Recebemos seu pagamento de R$ {amount}. Seu saldo ja foi atualizado!"
        return self.notify_user(user_phone, msg)
