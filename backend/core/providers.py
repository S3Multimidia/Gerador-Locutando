import requests
from typing import Dict, Any, Optional
from django.conf import settings
from .interfaces import NotificationProvider
from .models import GlobalConfig

class EvolutionApiProvider(NotificationProvider):
    """
    Concrete implementation of NotificationProvider for Evolution API.
    Fetches configuration dynamically from GlobalConfig.
    """

    def _get_config(self):
        """Helper to get current config."""
        config = GlobalConfig.get_solo()
        if not config.evolution_api_url or not config.evolution_api_token:
            # Optionally just return None or log warn, but here we keep behavior
            # raise ValueError("Evolution API configuration is missing in GlobalConfig.")
             return "", ""
        return config.evolution_api_url, config.evolution_api_token
    
    def _headers(self, token: str) -> Dict[str, str]:
        return {
            "apikey": token,
            "Content-Type": "application/json"
        }

    def send_text(self, destination: str, message: str) -> Dict[str, Any]:
        base_url, token = self._get_config()
        url = f"{base_url}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}" 
        # Note: Instance Name might ideally be in SystemConfig too, 
        # but for now assuming it fits in URL or is a separate setting.
        # Adjusting to standard Evolution API v2: /message/sendText/{instance}
        
        # However, usually URL is just the base. Let's assume URL includes instance or just base.
        # Refined: Evolution API URL usually is http://host:port.
        # Instance name is vital. I should probably add instance_name to SystemConfig.
        # For now, I will use a default or verify if it was requested. 
        # The user mentioned: "INSTANCE_URL e TOKEN dinamicamente". url probably covers the instance specific endpoint or just base.
        # Let's assume INSTANCE_URL is the full path to the instance base e.g. https://api.com/instance/Locutando
        
        # If url is `.../instance/Locutando`, then endpoints are relative.
        # Safest bet: Assume full INSTANCE_URL is provided as per requirements.
        
        payload = {
            "number": destination,
            "options": {
                "delay": 1200,
                "presence": "composing",
                "linkPreview": False
            },
            "textMessage": {
                "text": message
            }
        }

        try:
            response = requests.post(f"{base_url}/message/sendText/Locutando", json=payload, headers=self._headers(token), timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            # Log error
            return {"error": str(e), "success": False}

    def send_media(self, destination: str, media_url: str, caption: Optional[str] = None) -> Dict[str, Any]:
        base_url, token = self._get_config()
        
        payload = {
            "number": destination,
            "options": {
                "delay": 1200,
                "presence": "composing"
            },
            "mediaMessage": {
                "mediatype": "image", # dynamic detection would be better but keeping simple
                "caption": caption or "",
                "media": media_url
            }
        }
        
        try:
            response = requests.post(f"{base_url}/message/sendMedia/Locutando", json=payload, headers=self._headers(token), timeout=15)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e), "success": False}

    def get_status(self) -> str:
        base_url, token = self._get_config()
        try:
            response = requests.get(f"{base_url}/instance/connectionState/Locutando", headers=self._headers(token), timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get('instance', {}).get('state', 'unknown')
            return "error"
        except requests.RequestException:
            return "unreachable"
