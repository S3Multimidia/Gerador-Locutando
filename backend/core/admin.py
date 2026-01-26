from django.contrib import admin
from django.utils.html import format_html
from .models import GlobalConfig, AudioRequest, VoiceConfig, BackgroundTrack
from .services import NotificationService
from .providers import EvolutionApiProvider
import requests

@admin.register(BackgroundTrack)
class BackgroundTrackAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'is_active', 'order')
    list_editable = ('is_active', 'order')

@admin.register(VoiceConfig)
class VoiceConfigAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'voice_id', 'is_active', 'order')
    list_editable = ('is_active', 'order')

@admin.register(GlobalConfig)
class GlobalConfigAdmin(admin.ModelAdmin):
    list_display = ('site_title', 'view_connection_status')
    readonly_fields = ('view_qr_code',)
    
    fieldsets = (
        ('IA Configuration', {
            'fields': ('gemini_api_key', 'google_client_id', 'tts_model', 'chat_model', 'specialist_prompt')
        }),
        ('Site Visuals', {
            'fields': ('site_title', 'hero_headline', 'hero_subheadline', 'primary_color')
        }),
        ('Evolution API (Legacy/Notifications)', {
            'fields': ('evolution_api_url', 'evolution_api_token', 'view_qr_code')
        }),
    )

    def view_connection_status(self, obj):
        # Check connection only if configured
        if not obj.evolution_api_url:
            return format_html("<span style='color:gray'>Not Configured</span>")

        provider = EvolutionApiProvider()
        try:
            status = provider.get_status()
            color = "green" if status == "open" else "red"
            return format_html(f"<span style='color:{color}; font-weight:bold'>{status.upper()}</span>")
        except:
             return format_html("<span style='color:red'>Error</span>")
             
    view_connection_status.short_description = "Evolution Status"

    def view_qr_code(self, obj):
        if not obj.evolution_api_url or not obj.evolution_api_token:
            return "Configure URL e Token primeiro."

        try:
            headers = {
                "apikey": obj.evolution_api_token,
                "Content-Type": "application/json"
            }
            url = f"{obj.evolution_api_url}/instance/connect/Locutando"
            resp = requests.get(url, headers=headers, timeout=5)
            
            if resp.status_code == 200:
                data = resp.json()
                base64_img = data.get('base64')
                if base64_img:
                     return format_html(f'<img src="{base64_img}" style="max-width:300px"/>')
                elif data.get('instance', {}).get('state') == 'open':
                     return "Instância já conectada! ✅"
            
            return f"Status: {resp.status_code}"
        except Exception as e:
            return f"Erro: {str(e)}"
    
    view_qr_code.short_description = "Scan QR Code"

    # Singleton enforcement in Admin
    def has_add_permission(self, request):
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)
