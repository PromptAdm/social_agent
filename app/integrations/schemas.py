"""
Schemas Pydantic: Integration Layer

I/O schemas para comunicação entre o Social Agent e sistemas externos.
Usados pelos publishers, clients e pelo log service.
"""

from datetime import datetime

from pydantic import BaseModel, Field


# ── Publicação em rede social ─────────────────────────────────────────────────

class PublishPostData(BaseModel):
    """Dados enviados ao publisher de uma rede social."""
    post_id: int
    brand_id: int
    platform: str
    caption: str
    hashtags: str | None = None
    cta: str | None = None
    formato: str
    media_urls: list[str] = Field(default_factory=list)


class PublishResult(BaseModel):
    """Resultado retornado pelo publisher após publicar no social media."""
    external_post_id: str           # ID atribuído pela plataforma social
    platform: str
    post_url: str | None = None     # URL pública do post (se disponível)
    published_at: datetime
    raw_response: dict = Field(default_factory=dict)  # resposta bruta simulada da API


# ── n8n Workflow Trigger ───────────────────────────────────────────────────────

class N8nTriggerPayload(BaseModel):
    """Payload enviado ao webhook do n8n para disparar um workflow."""
    event_type: str                 # "post.published", "lead.created", etc.
    brand_id: int | None = None
    data: dict = Field(default_factory=dict)
    triggered_at: datetime


class N8nTriggerResult(BaseModel):
    """Resultado do disparo de workflow no n8n."""
    workflow_id: str
    execution_id: str
    webhook_url: str
    status: str                     # "triggered" | "failed" | "queued"
    triggered_at: datetime


# ── Webhooks Inbound ──────────────────────────────────────────────────────────

class MetaWebhookEntry(BaseModel):
    """Estrutura de uma entrada no payload de webhook do Meta."""
    id: str
    time: int


class MetaWebhookPayload(BaseModel):
    """Payload recebido pelo endpoint de webhook do Meta."""
    object: str                     # "instagram" | "page"
    entry: list[dict] = Field(default_factory=list)


class N8nCallbackPayload(BaseModel):
    """Payload de callback enviado pelo n8n após execução de workflow."""
    execution_id: str
    workflow_id: str
    status: str                     # "success" | "error"
    data: dict = Field(default_factory=dict)
    finished_at: datetime


# ── Resposta de status da integração ─────────────────────────────────────────

class IntegrationStatusOut(BaseModel):
    """Status de saúde de uma integração específica."""
    name: str
    provider: str                   # "mock" | "meta_api" | "n8n_cloud"
    is_active: bool
    last_attempt_at: datetime | None = None
    last_status: str | None = None  # "sucesso" | "erro"
    total_attempts: int = 0
    total_errors: int = 0


class IntegrationHealthOut(BaseModel):
    """Resposta do endpoint GET /integrations/status."""
    social_publishers: list[IntegrationStatusOut]
    n8n: IntegrationStatusOut
    overall_healthy: bool
    checked_at: datetime


# ── Log de integração ─────────────────────────────────────────────────────────

class IntegrationLogOut(BaseModel):
    """Registro de log de integração retornado pela API."""
    id: int
    brand_id: int | None
    post_id: int | None
    integration: str
    event_type: str
    status: str
    attempt_number: int
    duration_ms: int | None
    external_id: str | None
    error_message: str | None
    error_code: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
