from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal

class Wallet(models.Model):
    """
    The Single Source of Truth for User Balance.
    Uses DecimalField to prevent floating point errors.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='wallet'
    )
    balance = models.DecimalField(
        max_digits=14, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Saldo Atual"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Carteira de {self.user} - R$ {self.balance}"

    class Meta:
        verbose_name = "Carteira"
        verbose_name_plural = "Carteiras"


class WalletTransaction(models.Model):
    """
    Immutable Log of all financial movements.
    Append-only: Never edit or delete a record here.
    """
    TRANSACTION_TYPES = (
        ('CREDIT', 'Crédito'),
        ('DEBIT', 'Débito'),
    )

    wallet = models.ForeignKey(
        Wallet, 
        on_delete=models.PROTECT, 
        related_name='transactions'
    )
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    
    # Audit trail
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True)

    # Generic Relation to link source (Pix Deposit, Voice Generation, etc)
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object = GenericForeignKey('content_type', 'object_id')

    def save(self, *args, **kwargs):
        if self.pk:
            raise Exception("WalletTransaction é imutável! Não é permitido editar logs financeiros.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_transaction_type_display()} - R$ {self.amount} ({self.timestamp})"


class Deposit(models.Model):
    """
    Rastreia intenções de recarga via Pix.
    Linka o ID do Mercado Pago com o usuário local.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pendente'),
        ('APPROVED', 'Aprovado'),
        ('REJECTED', 'Rejeitado'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    external_id = models.CharField(max_length=100, unique=True, verbose_name="ID Mercado Pago")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    qr_code = models.TextField(blank=True, null=True) # Pix Copy Paste
    qr_code_base64 = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Campo para garantir idempotência do processamento na carteira
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Depósito {self.external_id} - {self.user} - R$ {self.amount} ({self.status})"
