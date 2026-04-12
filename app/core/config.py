"""
Configurações centrais do Social Agent carregadas via variáveis de ambiente.
Utiliza pydantic-settings para validação e tipagem automática.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


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

    # --- IA ---
    AI_PROVIDER: str = "mock"       # mock | openai | anthropic | gemini

    # --- Integrações ---
    META_WEBHOOK_VERIFY_TOKEN: str = "social_agent_verify_token"  # token secreto para verificação de webhook Meta
    META_APP_SECRET: str = ""        # App Secret para verificar assinatura X-Hub-Signature-256
    META_ACCESS_TOKEN: str = ""      # Page/User Access Token (fase de integração real)
    META_IG_USER_ID: str = ""        # ID do Instagram Business Account (fase real)
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
