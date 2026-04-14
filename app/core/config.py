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
    META_APP_SECRET: str = ""         # App Secret para verificar X-Hub-Signature-256
    META_ACCESS_TOKEN: str = ""       # Page/System User Access Token com instagram_content_publish
    META_IG_USER_ID: str = ""         # ID numérico do Instagram Business Account
    META_FACEBOOK_PAGE_ID: str = ""   # ID numérico da Facebook Page
    META_API_VERSION: str = "v21.0"   # versão da Graph API (ex: "v21.0")

    # --- n8n ---
    N8N_WEBHOOK_BASE_URL: str = "https://n8n.yourdomain.com/webhook"  # base URL dos webhooks n8n

    # --- CORS ---
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Retorna instância singleton das configurações (cache após primeira chamada)."""
    return Settings()
