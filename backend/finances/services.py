from django.db import transaction
from decimal import Decimal
from django.core.exceptions import ValidationError
from .models import Wallet, WalletTransaction

class WalletService:
    """
    Domínio Financeiro Seguro.
    Gerencia todas as operações de saldo com locks de banco de dados (select_for_update).
    """

    @staticmethod
    @transaction.atomic
    def process_credit(user, amount: Decimal, related_object=None, ip_address: str = None, description: str = "") -> WalletTransaction:
        """
        Adiciona fundos à carteira do usuário de forma segura.
        """
        if amount <= 0:
            raise ValidationError("O valor do crédito deve ser positivo.")

        # LOCK: Bloqueia a linha da Wallet até o fim da transação
        wallet, created = Wallet.objects.select_for_update().get_or_create(user=user)
        
        # Update Balance
        wallet.balance += amount
        wallet.save()

        # Create Immutable Log
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type='CREDIT',
            amount=amount,
            related_object=related_object,
            ip_address=ip_address,
            description=description or f"Crédito de R$ {amount}"
        )
        
        return tx

    @staticmethod
    @transaction.atomic
    def process_debit(user, amount: Decimal, related_object=None, ip_address: str = None, description: str = "") -> WalletTransaction:
        """
        Debita fundos da carteira se houver saldo suficiente.
        """
        if amount <= 0:
            raise ValidationError("O valor do débito deve ser positivo.")

        # LOCK: Bloqueia a linha da Wallet
        # Usamos get() aqui assumindo que a wallet existe. Se for user novo, talvez precise tratar.
        try:
            wallet = Wallet.objects.select_for_update().get(user=user)
        except Wallet.DoesNotExist:
            raise ValidationError("Carteira não encontrada para este usuário.")

        if wallet.balance < amount:
            raise ValidationError(f"Saldo insuficiente. Disponível: R$ {wallet.balance}")

        # Update Balance
        wallet.balance -= amount
        wallet.save()

        # Create Immutable Log
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type='DEBIT',
            amount=amount,
            related_object=related_object,
            ip_address=ip_address,
            description=description or f"Débito de R$ {amount}"
        )
        
        return tx

    @staticmethod
    def get_balance(user) -> Decimal:
        """Leitura rápida do saldo (sem lock)."""
        try:
            return user.wallet.balance
        except Wallet.DoesNotExist:
            return Decimal('0.00')
