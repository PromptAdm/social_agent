"""
Configurações centrais do Social Agent carregadas via variáveis de ambiente.
Utiliza pydantic-settings para validação e tipagem automática.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Aplicação ---
    APP_NAME: str = "Social Agent"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # --- Banco de dados ---
    DATABASE_URL: str  # ex: postgresql+psycopg2://user:pass@localhost:5432/social_agent

    # --- JWT ---
    SECRET_KEY: str          # chave secreta longa e aleatória
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7   # duração do refresh token (dias)

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        """Garante entropia mínima na chave JWT — chaves curtas são trivialmente forjáveis."""
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY deve ter no mínimo 32 caracteres. "
                "Gere uma chave segura com: "
                "python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v

    # --- IA ---
    AI_PROVIDER: str = "mock"           # mock | anthropic
    ANTHROPIC_API_KEY: str = ""         # sk-ant-api03-...

    # --- Scheduler ---
    SCHEDULER_ENABLED: bool = True           # False para desabilitar em testes/staging
    SCHEDULER_INTERVAL_SECONDS: int = 60     # Intervalo entre ticks (padrão: 1 minuto)

    # --- Integrações Meta ---
    META_WEBHOOK_VERIFY_TOKEN: str = "social_agent_verify_token"  # token para handshake de webhook
    META_APP_ID: str = ""             # App ID (necessário para /debug_token e diagnóstico de token)
    META_APP_SECRET: str = ""         # App Secret para verificar X-Hub-Signature-256
    META_ACCESS_TOKEN: str = ""       # Page/System User Access Token com instagram_content_publish
    META_IG_USER_ID: str = ""         # ID numérico do Instagram Business Account
    META_FACEBOOK_PAGE_ID: str = ""   # ID numérico da Facebook Page
    META_API_VERSION: str = "v21.0"   # versão da Graph API (ex: "v21.0")

    # --- n8n ---
    N8N_WEBHOOK_BASE_URL: str = "https://n8n.yourdomain.com/webhook"  # base URL dos webhooks n8n

    # --- OAuth / Redirect ---
    FRONTEND_URL: str = "http://localhost:3000"   # used to build post-OAuth redirect URLs
    ENCRYPTION_KEY: str = ""                      # optional Fernet key; derived from SECRET_KEY if empty

    # --- Meta OAuth (Instagram + Facebook) ---
    # META_APP_ID and META_APP_SECRET already declared above
    META_REDIRECT_URI: str = ""  # e.g. http://localhost:8000/api/v1/integrations/meta/callback

    # --- X (Twitter) OAuth 2.0 PKCE ---
    TWITTER_CLIENT_ID: str = ""
    TWITTER_CLIENT_SECRET: str = ""
    TWITTER_REDIRECT_URI: str = ""   # e.g. http://localhost:8000/api/v1/integrations/twitter/callback

    # --- WhatsApp Business (Phase 2 — disabled by default) ---
    WHATSAPP_ENABLED: bool = False

    # --- Analytics (PostHog) ---
    POSTHOG_API_KEY: str = ""                          # phc_xxxx — obtido em app.posthog.com
    POSTHOG_HOST: str = "https://us.i.posthog.com"    # us.i.posthog.com | eu.i.posthog.com

    # --- Monitoramento (Sentry) ---
    SENTRY_DSN: str = ""  # https://xxxx@oXXXX.ingest.sentry.io/XXXX — desabilitado se vazio

    # --- Monetização / Billing ---
    MONETIZATION_ENABLED: bool = False   # False = limites não são aplicados (feature flag)

    # --- Stripe (desabilitado por padrão — sem cobrança real) ---
    STRIPE_ENABLED: bool = False         # True = ativa checkout real com Stripe
    STRIPE_SECRET_KEY: str = ""          # sk_live_... ou sk_test_...
    STRIPE_WEBHOOK_SECRET: str = ""      # whsec_... — verificação de assinatura do webhook

    # Stripe Price IDs — criar em dashboard.stripe.com → Produtos → Preços
    STRIPE_PRICE_STARTER_MONTHLY:      str = ""
    STRIPE_PRICE_STARTER_YEARLY:       str = ""
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: str = ""
    STRIPE_PRICE_PROFESSIONAL_YEARLY:  str = ""
    STRIPE_PRICE_PREMIUM_MONTHLY:      str = ""
    STRIPE_PRICE_PREMIUM_YEARLY:       str = ""

    # --- Storage (uploads e arquivos gerados) ---
    STORAGE_DIR: str = "./storage"                        # raiz local de uploads e outputs
    MAX_UPLOAD_MB: int = 500                              # limite por arquivo (MB)

    # --- Transcrição de vídeo ---
    TRANSCRIPTION_PROVIDER: str = "mock"                 # mock | openai
    OPENAI_API_KEY: str = ""                             # sk-... para Whisper API
    FFMPEG_PATH: str = ""                                # caminho explícito do ffmpeg (opcional)

    # --- Geração de imagens ---
    IMAGE_PROVIDER: str = "mock"                         # mock | openai (DALL-E 3 / GPT-Image-1)

    # --- Créditos ---
    CREDITS_INITIAL_GRANT: int = 100                     # créditos concedidos ao criar conta
    CREDITS_IMAGE_GENERATION: int = 10                   # custo por sessão de geração de imagens
    CREDITS_VIDEO_SUBTITLE: int = 20                     # custo por transcrição de vídeo

    # --- Backup ---
    BACKUP_DIR: str = "./backups"                         # diretório local para arquivos de backup
    BACKUP_RETENTION_DAYS: int = 7                        # dias para manter backups locais (0 = sem limpeza)
    BACKUP_S3_BUCKET: str = ""                            # bucket S3; vazio = apenas backup local
    BACKUP_S3_PREFIX: str = "social-agent/backups"        # prefixo/pasta dentro do bucket

    # --- CORS ---
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # variáveis de ambiente extras (ex: AWS_REGION para backup) não causam erro


@lru_cache
def get_settings() -> Settings:
    """Retorna instância singleton das configurações (cache após primeira chamada)."""
    return Settings()
