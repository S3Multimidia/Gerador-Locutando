from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class NotificationProvider(ABC):
    """
    Abstract Base Class for Notification Providers.
    Ensures that switching providers (EvolutionAPI -> Twilio) is seamless.
    """

    @abstractmethod
    def send_text(self, destination: str, message: str) -> Dict[str, Any]:
        """
        Sends a text message to the destination (phone number).
        
        Args:
            destination (str): The recipient's phone number (ex: 5511999999999).
            message (str): The text content.
            
        Returns:
            Dict[str, Any]: Re sponse from the provider.
        """
        pass
    
    @abstractmethod
    def send_media(self, destination: str, media_url: str, caption: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends a media file (image/audio/video) to the destination.
        
        Args:
            destination (str): The recipient's phone number.
            media_url (str): Public URL of the media.
            caption (str, optional): Caption for the media.
            
        Returns:
            Dict[str, Any]: Response from the provider.
        """
        pass
        
    @abstractmethod
    def get_status(self) -> str:
        """
        Checks the connection status of the instance.
        
        Returns:
            str: 'connected', 'disconnected', 'connecting', etc.
        """
        pass
