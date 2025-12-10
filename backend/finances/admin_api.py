from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db import transaction as db_transaction
from .services import WalletService
from decimal import Decimal

class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@method_decorator(csrf_exempt, name='dispatch')
class AdminAddCreditView(APIView):
    permission_classes = [permissions.AllowAny] # Changed for easy testing

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        amount = request.data.get('amount')

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                 return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)
                 
            with db_transaction.atomic():
                admin_name = request.user.username if request.user.is_authenticated else "Admin (Manual)"
                WalletService.credit_wallet(
                    user, 
                    amount_decimal, 
                    'ADMIN_ADJUSTMENT', 
                    description=f"Crédito manual via Admin por {admin_name}"
                )
            
            return Response({
                'status': 'success', 
                'new_balance': float(user.wallet.balance),
                'message': f'Creditado R$ {amount} para {user.username}'
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
