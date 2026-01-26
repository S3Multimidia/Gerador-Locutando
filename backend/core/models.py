from django.db import models
from django.core.cache import cache

class BackgroundTrack(models.Model):
    """
    Global background tracks available to all users.
    """
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='tracks/') # We will need to configure media serving
    category = models.CharField(max_length=100, default='Geral')
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    
    # Store standard duration to avoid decoding on list
    duration = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name

class GlobalConfig(models.Model):
    """
    Centralized configuration for the entire platform.
    Replaces/Extends SystemConfig.
    Singleton pattern.
    """
    # --- IA Configuration ---
    gemini_api_key = models.CharField(max_length=255, blank=True, help_text="Chave Global (Opcional - usuários podem ter a própria)")
    google_client_id = models.CharField(max_length=255, blank=True)
    
    tts_model = models.CharField(max_length=100, default='gemini-2.5-flash-preview-tts')
    chat_model = models.CharField(max_length=100, default='gemini-2.5-flash')
    
    specialist_prompt = models.TextField(
        default="Você é um Especialista em Copywriting...",
        help_text="Prompt do sistema para o especialista em roteiros"
    )

    # --- Site Builder / visual ---
    site_title = models.CharField(max_length=255, default='Locutando AI')
    hero_headline = models.CharField(max_length=255, default='Crie Locuções de Varejo em Segundos')
    hero_subheadline = models.TextField(default='Inteligência Artificial avançada para gerar vozes ultra-realistas.')
    
    primary_color = models.CharField(max_length=20, default='#4F46E5')

    # --- Evolution API (Legacy/Notification) ---
    evolution_api_url = models.URLField(blank=True, verbose_name="Evolution API URL")
    evolution_api_token = models.CharField(max_length=255, blank=True)
    
    # Singleton logic
    def save(self, *args, **kwargs):
        self.pk = 1
        super(GlobalConfig, self).save(*args, **kwargs)
        cache.delete('global_config')

    @classmethod
    def get_solo(cls):
        cached = cache.get('global_config')
        if cached: return cached
        obj, _ = cls.objects.get_or_create(pk=1)
        cache.set('global_config', obj, 3600)
        return obj

    class Meta:
        verbose_name = "Configuração Global (IA & Site)"
        verbose_name_plural = "Configuração Global (IA & Site)"

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

class VoiceConfig(models.Model):
    """
    Stores configuration for voices available in the system.
    Shared across all users.
    """
    voice_id = models.CharField(max_length=100, unique=True, help_text="ID Técnico (ex: iapetus)")
    name = models.CharField(max_length=100, help_text="Nome Interno")
    display_name = models.CharField(max_length=100, help_text="Nome de Exibição")
    gender = models.CharField(max_length=20, choices=[('Masculino', 'Masculino'), ('Feminino', 'Feminino')])
    language = models.CharField(max_length=10, default='pt-BR')
    description = models.TextField(blank=True)
    prompt = models.TextField(blank=True, help_text="Prompt de sistema para estilo")
    image_url = models.CharField(max_length=500, blank=True)
    demo_url = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0, help_text="Ordem de exibição")

    def __str__(self):
        return f"{self.display_name} ({self.voice_id})"

    class Meta:
        ordering = ['order', 'display_name']
