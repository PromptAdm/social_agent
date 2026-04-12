"""
Package: app.ai.providers
Implementações de provedores de IA.

Para trocar de provedor, basta alterar AI_PROVIDER no .env:
    AI_PROVIDER=mock        — MockAIProvider (padrão, sem custo)
    AI_PROVIDER=openai      — OpenAIProvider (futuro)
    AI_PROVIDER=anthropic   — AnthropicProvider (futuro)
"""

from app.ai.providers.base import AIProvider
from app.ai.providers.mock import MockAIProvider

__all__ = ["AIProvider", "MockAIProvider"]
