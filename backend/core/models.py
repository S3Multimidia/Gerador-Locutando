from django.db import models
from django.core.cache import cache

class SystemConfig(models.Model):
    """
    Singleton model for dynamic system configuration.
    Stores API keys and Instance URLs avoiding hardcode and enabling rapid rotation.
    """
    evolution_api_url = models.URLField(
        verbose_name="Evolution API Instance URL",
        help_text="Ex: https://api.evolution.com/instance/your-instance"
    )
    evolution_api_token = models.CharField(
        max_length=255,
        verbose_name="Evolution API Token",
        help_text="API Key for authentication"
    )
    
    # Singleton enforcement
    def save(self, *args, **kwargs):
        self.pk = 1
        super(SystemConfig, self).save(*args, **kwargs)
        # Invalidate cache on save
        cache.delete('system_config')

    @classmethod
    def get_solo(cls):
        """
        Returns the singleton instance, cached for performance.
        """
        config_cache = cache.get('system_config')
        if config_cache:
            return config_cache
        
        obj, created = cls.objects.get_or_create(pk=1)
        cache.set('system_config', obj, timeout=3600) # Cache for 1 hour
        return obj

    def __str__(self):
        return "System Configuration (Singleton)"

    class Meta:
        verbose_name = "System Configuration"
        verbose_name_plural = "System Configuration"

class AudioRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendente'),
        ('PROCESSING', 'Processando'),
        ('COMPLETED', 'Concluído'),
        ('FAILED', 'Falhou'),
    ]

    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='audio_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    output_file = models.CharField(max_length=500, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    
    # Store JSON input to allow re-processing if needed
    input_data = models.JSONField(default=dict)

    def __str__(self):
        return f"Request {self.id} - {self.user.username} ({self.status})"
