from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def dev_login(request):
    """
    Simplified login for dev/demo purposes (accepts email, returns token).
    In production, this should verify Google Token or Password.
    """
    email = request.data.get('email')
    
    if not email:
        return Response({'error': 'Email is required'}, status=400)
    
    email = email.lower().strip()
    
    # Simple logic: If user exists, return token. If not, create and return.
    # Note: This allows anyone to login as anyone if they know the email.
    # Acceptable for this specific "Porta de Loja" local tool context as requested by user.
    
    user, created = User.objects.get_or_create(username=email, defaults={'email': email})
    
    # Create or Get Token
    token, _ = Token.objects.get_or_create(user=user)
    
    return Response({
        'token': token.key,
        'user_id': user.id,
        'email': user.email,
        'role': 'admin' if 's3multimidia' in email else 'user'
    })

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def google_auth(request):
    """
    Endpoint to exchange Google Token for Backend Token.
    For this MVP, we trust the email sent by frontend (simulating token verification).
    """
    return dev_login(request)
