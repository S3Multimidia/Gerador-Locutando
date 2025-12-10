from django.contrib import admin
from django.utils.html import format_html
from .models import SystemConfig
from .services import NotificationService
from .providers import EvolutionApiProvider
import requests

@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ('evolution_api_url', 'view_connection_status')
    readonly_fields = ('view_qr_code',)

    def view_connection_status(self, obj):
        # Isso faz uma request síncrona, pode deixar lento o admin.
        # Idealmente carregar via AJAX, mas aqui faremos direto.
        provider = EvolutionApiProvider()
        status = provider.get_status()
        color = "green" if status == "open" else "red"
        return format_html(f"<span style='color:{color}; font-weight:bold'>{status.upper()}</span>")
    view_connection_status.short_description = "Status Conexão"

    def view_qr_code(self, obj):
        """
        Busca o QR Code na API e renderiza como imagem base64 ou link.
        Endpoint Evolution v2: /instance/connect/{instance} devolve base64.
        """
        if not obj.evolution_api_url or not obj.evolution_api_token:
            return "Configure URL e Token primeiro."

        try:
            # Tenta buscar o QR Code
            # Nota: EvolutionApiProvider não expôs 'connect' na interface,
            # então chamamos requests direto ou expandimos o provider.
            # Vamos expandir provider seria melhor, mas `get_qr_code` é específico de setup.
            
            headers = {
                "apikey": obj.evolution_api_token,
                "Content-Type": "application/json"
            }
            # Endpoint connect da Evolution
            url = f"{obj.evolution_api_url}/instance/connect/Locutando"
            resp = requests.get(url, headers=headers, timeout=5)
            
            if resp.status_code == 200:
                data = resp.json()
                # Evolution retorna { "base64": "..." } ou { "pairingCode": ... }
                base64_img = data.get('base64')
                if base64_img:
                     return format_html(f'<img src="{base64_img}" style="max-width:300px"/>')
                elif data.get('instance', {}).get('state') == 'open':
                     return "Instância já conectada! ✅"
            
            return f"Não foi possível obter QR Code. Status: {resp.status_code}"

        except Exception as e:
            return f"Erro ao carregar QR Code: {str(e)}"
    
    view_qr_code.short_description = "Scan QR Code"

    # Impede criar mais de 1 config
    def has_add_permission(self, request):
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)
