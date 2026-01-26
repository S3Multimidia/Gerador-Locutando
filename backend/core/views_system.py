from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from .models import GlobalConfig, BackgroundTrack

@api_view(['GET'])
@permission_classes([AllowAny])
def get_global_config(request):
    """
    Returns global configuration for the frontend app.
    Including visual settings and AI keys/models.
    """
    config = GlobalConfig.get_solo()
    return Response({
        'siteTitle': config.site_title,
        'heroHeadline': config.hero_headline,
        'heroSubheadline': config.hero_subheadline,
        'primaryColor': config.primary_color,
        'googleClientId': config.google_client_id,
        'apiKey': config.gemini_api_key, 
        'ttsModel': config.tts_model,
        'chatModel': config.chat_model,
        'specialistPrompt': config.specialist_prompt,
        'supabaseUrl': config.supabase_url,
        'supabaseKey': config.supabase_key,
        'supabaseBucket': config.supabase_bucket
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Should be IsAdminUser in prod
def update_global_config(request):
    config = GlobalConfig.get_solo()
    data = request.data
    
    # Update fields if present
    if 'siteTitle' in data: config.site_title = data['siteTitle']
    if 'heroHeadline' in data: config.hero_headline = data['heroHeadline']
    if 'heroSubheadline' in data: config.hero_subheadline = data['heroSubheadline']
    if 'primaryColor' in data: config.primary_color = data['primaryColor']
    
    if 'apiKey' in data: config.gemini_api_key = data['apiKey']
    if 'googleClientId' in data: config.google_client_id = data['googleClientId']
    if 'ttsModel' in data: config.tts_model = data['ttsModel']
    if 'chatModel' in data: config.chat_model = data['chatModel']
    if 'specialistPrompt' in data: config.specialist_prompt = data['specialistPrompt']
    
    if 'supabaseUrl' in data: config.supabase_url = data['supabaseUrl']
    if 'supabaseKey' in data: config.supabase_key = data['supabaseKey']
    if 'supabaseBucket' in data: config.supabase_bucket = data['supabaseBucket']
    
    config.save()
    return Response({'status': 'updated'})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_tracks(request):
    """
    Get all active background tracks.
    """
    tracks = BackgroundTrack.objects.filter(is_active=True).order_by('order', 'name')
    data = []
    for t in tracks:
        if t.file:
            data.append({
                'name': t.name,
                'url': request.build_absolute_uri(t.file.url),
                'category': t.category
            })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_tracks(request):
    """
    Receive a list of tracks metadata. 
    NOTE: Actual file upload is complex to sync purely via JSON list. 
    Usually we upload one by one. 
    For now, this endpoint might just update metadata or order.
    """
    # Todo: Implement full sync if needed. 
    # Validating/Uploading files via "Sync" button is tricker.
    # Usually Admin Panel uploads files individually.
    return Response({'status': 'not_implemented_yet_use_admin_upload'}, status=501)
