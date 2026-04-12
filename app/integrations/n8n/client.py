"""
Client: MockN8nClient

Simula o disparo de webhooks para workflows do n8n.
Cada evento do Social Agent mapeado a uma URL de webhook específica.

Como substituir pelo client real:
    1. Criar N8nClient(N8nWebhookClient) neste mesmo arquivo
    2. Usar httpx.post(webhook_url, json=payload, timeout=10)
    3. Tratar HTTP 200 como sucesso; outros como RetryableIntegrationError
    4. Registrar no registry.py no lugar do MockN8nClient

Credenciais necessárias para fase real (.env):
    N8N_WEBHOOK_POST_PUBLISHED       — URL do webhook para post publicado
    N8N_WEBHOOK_LEAD_CREATED         — URL para novo lead
    N8N_WEBHOOK_LEAD_COMMENT         — URL para lead detectado em comentário
    N8N_WEBHOOK_COMMENT_CRITICAL     — URL para crítica urgente
    N8N_WEBHOOK_WEEKLY_REPORT        — URL para relatório semanal pronto
    N8N_WEBHOOK_DEFAULT              — URL fallback para eventos sem mapeamento
"""

import uuid
from datetime import datetime, timezone

from app.integrations.base import N8nWebhookClient, RetryableIntegrationError
from app.integrations.schemas import N8nTriggerResult


# ── Mapeamento de eventos → IDs de workflow (simulados) ───────────────────────

_WORKFLOW_REGISTRY: dict[str, str] = {
    "post.published":        "wf_post_published",
    "post.scheduled":        "wf_post_scheduled",
    "lead.created":          "wf_lead_created",
    "lead.qualified":        "wf_lead_qualified",
    "comment.lead_detected": "wf_lead_from_comment",
    "comment.critical":      "wf_critical_comment_alert",
    "weekly.report_ready":   "wf_weekly_report",
}

# URLs de webhook mock (fase de integração real: viriam do .env)
_MOCK_WEBHOOK_URLS: dict[str, str] = {
    wf_id: f"https://n8n.yourdomain.com/webhook/{wf_id.replace('wf_', '')}"
    for wf_id in _WORKFLOW_REGISTRY.values()
}
_MOCK_WEBHOOK_URLS["default"] = "https://n8n.yourdomain.com/webhook/generic-event"


# ── Definições de eventos disparados automaticamente ────────────────────────

# Eventos que o Social Agent dispara, com o payload esperado por cada workflow n8n.
# Documentação para a equipe que configurar os workflows no n8n.
N8N_EVENT_DOCS: dict[str, dict] = {
    "post.published": {
        "description": "Disparado quando um post é publicado com sucesso",
        "payload_fields": ["brand_id", "brand_name", "post_id", "platform",
                           "external_post_id", "post_url", "caption_excerpt"],
        "suggested_automations": [
            "Notificar canal #publicacoes no Slack",
            "Atualizar status na planilha de conteúdo",
            "Enviar para ferramenta de scheduling de stories",
        ],
    },
    "lead.created": {
        "description": "Disparado quando um novo lead é criado",
        "payload_fields": ["brand_id", "lead_id", "username", "source",
                           "status", "comment_body"],
        "suggested_automations": [
            "Adicionar ao CRM (HubSpot, Pipedrive, Notion)",
            "Enviar e-mail de boas-vindas",
            "Criar tarefa de follow-up no Notion/Asana",
        ],
    },
    "comment.lead_detected": {
        "description": "Comentário classificado como lead potencial",
        "payload_fields": ["brand_id", "comment_id", "post_id", "author_username",
                           "comment_body", "urgencia"],
        "suggested_automations": [
            "Notificar vendas no WhatsApp",
            "Criar lead no CRM automaticamente",
            "Agendar resposta prioritária no Social Agent",
        ],
    },
    "comment.critical": {
        "description": "Comentário classificado como crítica urgente",
        "payload_fields": ["brand_id", "comment_id", "post_id", "author_username",
                           "comment_body"],
        "suggested_automations": [
            "Alertar gerente no Slack",
            "Criar ticket de atendimento",
            "Enviar e-mail para equipe de CS",
        ],
    },
    "weekly.report_ready": {
        "description": "Relatório semanal gerado",
        "payload_fields": ["brand_id", "brand_name", "periodo", "total_posts",
                           "new_leads", "published_posts"],
        "suggested_automations": [
            "Enviar relatório por e-mail para stakeholders",
            "Atualizar dashboard no Google Data Studio",
            "Postar resumo no canal do time",
        ],
    },
}


# ── Mock Client ───────────────────────────────────────────────────────────────

class MockN8nClient(N8nWebhookClient):
    """
    Implementação mock do cliente de webhook n8n.

    Simula o envio de eventos via HTTP POST para URLs de webhook.
    Gera execution_id único para rastreamento de cada disparo.

    Para ativar modo de falha (testes de retry):
        Instancie com MockN8nClient(fail_event_types=["post.published"])
        para simular falha no primeiro disparo desse evento.
    """

    INTEGRATION_NAME = "n8n"

    def __init__(self, fail_event_types: list[str] | None = None) -> None:
        self._fail_events = set(fail_event_types or [])
        self._fired_events: set[str] = set()

    def trigger(self, event_type: str, payload: dict) -> N8nTriggerResult:
        """
        Dispara um workflow n8n via webhook (simulado).

        Fluxo real:
            1. Montar payload JSON com event_type + data
            2. POST webhook_url com Content-Type: application/json
            3. Verificar resposta HTTP 200
            4. Extrair execution_id da resposta se disponível
            5. Retornar N8nTriggerResult

        Args:
            event_type: identificador do evento (ver N8N_EVENT_DOCS para lista)
            payload:    dados a enviar ao workflow n8n

        Returns:
            N8nTriggerResult com execution_id para rastreamento

        Raises:
            RetryableIntegrationError: para HTTP 429/5xx ou timeout
        """
        # Simular falha se configurado
        if event_type in self._fail_events and event_type not in self._fired_events:
            self._fired_events.add(event_type)
            raise RetryableIntegrationError(
                message=f"[Simulado] n8n webhook timeout para evento '{event_type}'",
                integration=self.INTEGRATION_NAME,
                event_type=event_type,
                error_code="TIMEOUT",
            )

        workflow_id = _WORKFLOW_REGISTRY.get(event_type, "wf_generic")
        webhook_url = _MOCK_WEBHOOK_URLS.get(workflow_id, _MOCK_WEBHOOK_URLS["default"])
        execution_id = f"n8n_exec_{uuid.uuid4().hex[:12]}"

        return N8nTriggerResult(
            workflow_id=workflow_id,
            execution_id=execution_id,
            webhook_url=webhook_url,
            status="triggered",
            triggered_at=datetime.now(timezone.utc),
        )

    def get_event_docs(self) -> dict[str, dict]:
        """Retorna documentação de todos os eventos suportados."""
        return N8N_EVENT_DOCS
