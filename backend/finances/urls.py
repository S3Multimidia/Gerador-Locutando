from django.urls import path
from . import api

urlpatterns = [
    path('wallet/balance/', api.get_wallet_balance, name='get_wallet_balance'),
    path('wallet/transactions/', api.get_transactions, name='get_transactions'),
]
