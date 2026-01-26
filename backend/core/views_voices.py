from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from .models import VoiceConfig

@api_view(['GET'])
@permission_classes([AllowAny])
def get_voices(request):
    """
    Get all active voices.
    """
    # Prefer DB voices, if none, return empty list (frontend handles fallback)
    voices = VoiceConfig.objects.filter(is_active=True).order_by('order', 'display_name')
    data = []
    for v in voices:
        # Convert to match frontend Voice interface
        item = {
            'id': v.voice_id,
            'name': v.name,
            'displayName': v.display_name,
            'gender': v.gender,
            'language': v.language,
            'description': v.description,
            'prompt': v.prompt,
            'imageUrl': v.image_url,
            'demoUrl': v.demo_url,
        }
        data.append(item)
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_voices(request):
    """
    Sync voices from admin panel.
    This replaces/updates the configuration in the database.
    """
    voices_data = request.data
    if not isinstance(voices_data, list):
        return Response({'error': 'Expected a list of voices'}, status=400)

    saved_ids = []
    
    # We update all sent voices
    for index, v_data in enumerate(voices_data):
        voice_id = v_data.get('id')
        if not voice_id:
            continue
            
        defaults = {
            'name': v_data.get('name', voice_id),
            'display_name': v_data.get('displayName', voice_id),
            'gender': v_data.get('gender', 'Masculino'),
            'language': v_data.get('language', 'pt-BR'),
            'description': v_data.get('description', ''),
            'prompt': v_data.get('prompt', ''),
            'image_url': v_data.get('imageUrl', ''),
            'demo_url': v_data.get('demoUrl', ''),
            'order': index,
            'is_active': True
        }
        
        VoiceConfig.objects.update_or_create(
            voice_id=voice_id,
            defaults=defaults
        )
        saved_ids.append(voice_id)

    return Response({'status': 'success', 'count': len(saved_ids)})
