"""
Registry: Integration Registry

Ponto central de acesso a todos os providers de integração.
O router e os services obtêm publishers/clients sempre por aqui —
nunca instanciam diretamente, garantindo desacoplamento total.

Para ativar um provider real:
    1. Criar a classe concreta (ex: MetaPublisher)
    2. Substituir MockMetaPublisher por MetaPublisher no dict _PUBLISHERS
    3. Nenhum outro arquivo precisa mudar
"""

from app.integrations.base import N8nWebhookClient, SocialPublisher
from app.integrations.meta.publisher import MockMetaPublisher
from app.integrations.n8n.client import MockN8nClient
from app.models.post import SocialPlatform


# ── Publishers de redes sociais ───────────────────────────────────────────────
# Mapeamento SocialPlatform → instância do publisher.
# Plataformas sem publisher explícito não suportam publicação automática ainda.

_PUBLISHERS: dict[SocialPlatform, SocialPublisher] = {
    SocialPlatform.INSTAGRAM: MockMetaPublisher(),
    SocialPlatform.FACEBOOK:  MockMetaPublisher(),
    # Fase futura:
    # SocialPlatform.LINKEDIN: MockLinkedInPublisher(),
    # SocialPlatform.TWITTER:  MockTwitterPublisher(),
    # SocialPlatform.TIKTOK:   MockTikTokPublisher(),
}

# ── n8n Client ────────────────────────────────────────────────────────────────

_N8N_CLIENT: N8nWebhookClient = MockN8nClient()


# ── Accessors ─────────────────────────────────────────────────────────────────

def get_publisher(platform: SocialPlatform) -> SocialPublisher | None:
    """
    Retorna o publisher para a plataforma informada.

    Retorna None se não houver publisher registrado para a plataforma,
    permitindo que o caller decida se isso é um erro ou degradação graciosa.
    """
    return _PUBLISHERS.get(platform)


def get_n8n_client() -> N8nWebhookClient:
    """Retorna o cliente n8n configurado."""
    return _N8N_CLIENT


def list_registered_platforms() -> list[str]:
    """Lista as plataformas com publisher registrado."""
    return [p.value for p in _PUBLISHERS]
