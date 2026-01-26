import json
import requests
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.http import JsonResponse
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Deposit
from .services import WalletService
from core.services import NotificationService
from .admin_api import AdminAddCreditView
from .models import WalletTransaction
import hmac
import hashlib
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wallet_balance(request):
    balance = WalletService.get_balance(request.user)
    return Response({'balance': float(balance), 'currency': 'BRL'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transactions(request):
    try:
        transactions = WalletTransaction.objects.filter(wallet__user=request.user).order_by('-created_at')[:20]
        data = [{
            'id': t.id,
            'type': t.transaction_type,
            'amount': float(t.amount),
            'description': t.description,
            'created_at': t.created_at
        } for t in transactions]
        return Response(data)
    except Exception as e:
        return Response([], status=200)

class DepositViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def create_pix(self, request):
        """
        Gera um Pix Copia e Cola via Mercado Pago.
        Endpoint: /api/deposit/create_pix/
        Body: { "amount": 10.00 }
        """
        try:
            amount = Decimal(str(request.data.get('amount')))
            if amount < 5.00: # Mínimo R$ 5,00
                return Response({'error': 'Valor mínimo é R$ 5,00'}, status=status.HTTP_400_BAD_REQUEST)
        except:
             return Response({'error': 'Valor inválido'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Criar Preferência/Pagamento no Mercado Pago
        # Usando Request direta para não depender do SDK instalado agora, mas idealmente usaria SDK.
        url = "https://api.mercadopago.com/v1/payments"
        headers = {
            "Authorization": f"Bearer {settings.MERCADO_PAGO_ACCESS_TOKEN}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": f"deposit_{request.user.id}_{timezone.now().timestamp()}"
        }
        
        payload = {
            "transaction_amount": float(amount),
            "description": f"Recarga Locutando - {request.user.email}",
            "payment_method_id": "pix",
            "payer": {
                "email": request.user.email,
                "first_name": request.user.first_name or "Usuario",
                "entity_type": "individual",
                "type": "customer", 
                # "identification": { ... } # Idealmente pedir CPF
            }
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code != 201:
                return Response(
                    {'error': 'Erro no gateway de pagamento', 'details': response.json()}, 
                    status=status.HTTP_502_BAD_GATEWAY
                )
            
            mp_data = response.json()
            external_id = str(mp_data['id'])
            qr_code = mp_data['point_of_interaction']['transaction_data']['qr_code']
            qr_base64 = mp_data['point_of_interaction']['transaction_data']['qr_code_base64']
            
            # 2. Salvar intenção de depósito
            Deposit.objects.create(
                user=request.user,
                amount=amount,
                external_id=external_id,
                qr_code=qr_code,
                qr_code_base64=qr_base64,
                status='PENDING'
            )
            
            return Response({
                'external_id': external_id,
                'qr_code': qr_code,
                'qr_code_base64': qr_base64,
                'amount': amount
            })

        except requests.RequestException:
            return Response({'error': 'Timeout no gateway'}, status=status.HTTP_504_GATEWAY_TIMEOUT)


class MercadoPagoWebhookView(APIView):
    """
    Recebe notificações de pagamento.
    Endpoint: /api/webhook/mp/
    """
    
    def post(self, request):
        topic = request.query_params.get('topic') or request.data.get('type')
        payment_id = request.query_params.get('id') or request.data.get('data', {}).get('id')

        if topic == 'payment':
            # Consultar status atual no Mercado Pago para evitar fraude via payload falso
            url = f"https://api.mercadopago.com/v1/payments/{payment_id}"
            headers = {"Authorization": f"Bearer {settings.MERCADO_PAGO_ACCESS_TOKEN}"}
            
            try:
                # Segurança: Validar na fonte (MP) se está aprovado mesmo
                response = requests.get(url, headers=headers)
                if response.status_code == 200:
                    payment_data = response.json()
                    status_detail = payment_data.get('status')
                    external_id = str(payment_data.get('id'))
                    
                    if status_detail == 'approved':
                        self._process_approval(external_id)
                        
                return JsonResponse({"status": "ok"})
                
            except Exception as e:
                # Log error
                return JsonResponse({"status": "error"}, status=500)
                
        return JsonResponse({"status": "ignored"})

    def _process_approval(self, external_id):
        # Idempotência e Atomicidade
        with transaction.atomic():
            # Lock no depósito para garantir que não processe 2x
            try:
                deposit = Deposit.objects.select_for_update().get(external_id=external_id)
            except Deposit.DoesNotExist:
                # Log: Pagamento recebido mas não iniciado por aqui? Pode acontecer.
                return

            if deposit.status == 'APPROVED' and deposit.processed_at:
                # Já processado, ignorar (Idempotência)
                return

            # Atualizar Depósito
            deposit.status = 'APPROVED'
            deposit.processed_at = timezone.now()
            deposit.save()

            # Creditar Carteira
            WalletService.process_credit(
                user=deposit.user,
                amount=deposit.amount,
                related_object=deposit,
                description=f"Recarga Pix #{external_id}"
            )
            
            # Notificar Usuário (Assíncrono idealmente, mas direto por enquanto)
            try:
                # Assume-se que NotificationService trata exceções internas
                # Ideal: send_notification_task.delay(...)
                ns = NotificationService()
                # Precisamos do telefone do usuário. Assumindo user.profile.phone ou similar
                # Como não tenho User Profile definido, vou deixar comentado o hook
                # ns.send_payment_confirmation(deposit.user.username, str(deposit.amount)) 
                pass
            except:
                pass
