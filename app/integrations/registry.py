"""
Registry: Integration Registry

Ponto central de acesso a todos os providers de integração.
O router e os services obtêm publishers/clients sempre por aqui —
nunca instanciam diretamente, garantindo desacoplamento total.

Seleção automática de provider:
    Meta (Instagram + Facebook):
        - META_ACCESS_TOKEN + META_IG_USER_ID presentes no .env
          → MetaPublisher (real, Meta Graph API)
        - Credenciais ausentes
          → MockMetaPublisher (simulação local)

    n8n:
        - N8N_WEBHOOK_BASE_URL configurado (não-padrão)
          → MockN8nClient (fase atual — client real em fase futura)

Para adicionar um novo publisher (ex: LinkedIn):
    1. Criar app/integrations/linkedin/publisher.py com LinkedInPublisher(SocialPublisher)
    2. Registrar em _build_publishers() abaixo
    3. Adicionar credenciais ao .env e config.py
    4. Nenhum outro arquivo precisa mudar
"""

from app.integrations.base import N8nWebhookClient, SocialPublisher
from app.integrations.n8n.client import MockN8nClient
from app.models.post import SocialPlatform


def _build_publishers() -> dict[SocialPlatform, SocialPublisher]:
    """
    Constrói o mapa de publishers no startup da aplicação.

    Detecta automaticamente se as credenciais da Meta estão configuradas
    e usa o publisher real ou o mock de acordo.
    """
    from app.core.config import get_settings
    settings = get_settings()

    # ── Meta (Instagram + Facebook) ───────────────────────────────────────────
    if settings.META_ACCESS_TOKEN and settings.META_IG_USER_ID:
        from app.integrations.meta.publisher import MetaPublisher
        meta_publisher: SocialPublisher = MetaPublisher(
            access_token=settings.META_ACCESS_TOKEN,
            ig_user_id=settings.META_IG_USER_ID,
            fb_page_id=settings.META_FACEBOOK_PAGE_ID,
            api_version=settings.META_API_VERSION,
        )
        _provider_labels["meta_api"] = "meta_graph_api_real"
    else:
        from app.integrations.meta.publisher import MockMetaPublisher
        meta_publisher = MockMetaPublisher()
        _provider_labels["meta_api"] = "mock"

    return {
        SocialPlatform.INSTAGRAM: meta_publisher,
        SocialPlatform.FACEBOOK:  meta_publisher,
        # Fase futura:
        # SocialPlatform.LINKEDIN: _build_linkedin_publisher(settings),
        # SocialPlatform.TWITTER:  _build_twitter_publisher(settings),
        # SocialPlatform.TIKTOK:   _build_tiktok_publisher(settings),
    }


# Labels dos providers ativos — consultados pelo endpoint /integrations/status
_provider_labels: dict[str, str] = {}

_PUBLISHERS = _build_publishers()
_N8N_CLIENT: N8nWebhookClient = MockN8nClient()


# ── Accessors ──────────────────────────────────────────────────────────────────

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


def get_provider_label(integration: str) -> str:
    """Retorna o label do provider ativo ('mock' ou 'meta_graph_api_real')."""
    return _provider_labels.get(integration, "mock")


def is_real_integration(integration: str) -> bool:
    """Retorna True se o provider está usando integração real (não mock)."""
    return _provider_labels.get(integration, "mock") != "mock"
