from django.urls import path
from . import views_storefront, views_auth, views_voices, views_system

urlpatterns = [
    path('auth/login/', views_auth.dev_login, name='dev_login'),
    path('auth/google/', views_auth.google_auth, name='google_auth'),
    path('storefront/generate/', views_storefront.generate_audio, name='storefront_generate'),
    path('storefront/requests/', views_storefront.get_my_requests, name='storefront_requests'),
    path('storefront/requests/<int:request_id>/cancel/', views_storefront.cancel_request, name='storefront_cancel'),
    path('storefront/download/<str:filename>/', views_storefront.download_audio_file, name='storefront_download'),
    
    # Voices endpoints
    path('storefront/voices/', views_voices.get_voices, name='get_voices'),
    path('storefront/voices/sync/', views_voices.sync_voices, name='sync_voices'),

    # System/Global Config
    path('storefront/config/', views_system.get_global_config, name='get_global_config'),
    path('storefront/config/update/', views_system.update_global_config, name='update_global_config'),
    path('storefront/tracks/', views_system.get_tracks, name='get_tracks'),
]
