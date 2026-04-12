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

    # --- CORS ---
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Retorna instância singleton das configurações (cache após primeira chamada)."""
    return Settings()
