"""
Base: Camada de Integração

Define:
    - Exceções tipadas (IntegrationError, RetryableIntegrationError)
    - RetryConfig: configuração de retry com backoff exponencial
    - with_retry(): executor com retry conceitual + logging
    - SocialPublisher: classe abstrata para publishers de redes sociais
    - N8nWebhookClient: classe abstrata para clientes n8n

Princípio de Retry:
    O retry nesta fase é "conceitual" — demonstra o padrão correto
    sem implementar delays reais (que exigiriam Celery/ARQ/asyncio.sleep).
    O with_retry() executa as tentativas sem espera entre elas.
    Em produção, substituir pelo executar de tarefa assíncrona com backoff.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, TypeVar

from app.integrations.schemas import N8nTriggerResult, PublishPostData, PublishResult

T = TypeVar("T")


# ── Exceções ──────────────────────────────────────────────────────────────────

class IntegrationError(Exception):
    """
    Erro não recuperável de integração.
    Lançado quando a integração falhou definitivamente
    (credenciais inválidas, recurso não encontrado, etc.).
    """
    def __init__(
        self,
        message: str,
        integration: str = "unknown",
        event_type: str = "unknown",
        error_code: str | None = None,
        attempt: int = 1,
    ) -> None:
        super().__init__(message)
        self.integration = integration
        self.event_type = event_type
        self.error_code = error_code
        self.attempt = attempt


class RetryableIntegrationError(IntegrationError):
    """
    Erro recuperável de integração — pode ser retentado.
    Lançado para erros transitórios:
        HTTP 429 Too Many Requests
        HTTP 500/502/503/504 Server Error
        Timeout de rede
    """
    pass


# ── Retry ─────────────────────────────────────────────────────────────────────

@dataclass
class RetryConfig:
    """
    Configuração de política de retry para integrações.

    backoff_seconds: tempo de espera entre tentativas (exponencial).
        [2, 5, 15] significa: 1ª retry após 2s, 2ª após 5s, 3ª após 15s.
        Nota: em produção esses delays seriam aplicados via asyncio.sleep ou
              enfileiramento (Celery beat, ARQ, etc.).

    retryable_status_codes: códigos HTTP que justificam uma nova tentativa.
    """
    max_attempts: int = 3
    backoff_seconds: list[int] = field(default_factory=lambda: [2, 5, 15])
    retryable_status_codes: list[int] = field(
        default_factory=lambda: [429, 500, 502, 503, 504]
    )


def with_retry(
    func: Callable[[], T],
    config: RetryConfig | None = None,
    on_retry: Callable[[int, Exception], None] | None = None,
) -> tuple[T, int]:
    """
    Executa `func` com política de retry.

    Conceitual nesta fase (sem delays reais entre tentativas).
    Em produção: substituir por tarefa assíncrona com await asyncio.sleep().

    Args:
        func:       Callable sem argumentos que realiza a integração
        config:     Política de retry (usa RetryConfig padrão se None)
        on_retry:   Callback chamado a cada retentativa (attempt, exception)

    Returns:
        (resultado, número_de_tentativas)

    Raises:
        IntegrationError: após esgotar todas as tentativas
        Exception:        para erros não recuperáveis imediatamente
    """
    cfg = config or RetryConfig()
    last_exc: Exception | None = None

    for attempt in range(1, cfg.max_attempts + 1):
        try:
            result = func()
            return result, attempt
        except RetryableIntegrationError as exc:
            last_exc = exc
            if attempt < cfg.max_attempts:
                if on_retry:
                    on_retry(attempt, exc)
                # PRODUÇÃO: await asyncio.sleep(cfg.backoff_seconds[attempt - 1])
                # Aqui: continua imediatamente (mock sem delay real)
                continue
            # Esgotou tentativas — promove para IntegrationError permanente
            raise IntegrationError(
                message=f"Falha após {cfg.max_attempts} tentativas: {exc}",
                integration=exc.integration,
                event_type=exc.event_type,
                error_code=exc.error_code,
                attempt=attempt,
            ) from exc
        except IntegrationError:
            raise  # erro não recuperável — não retry

    # Nunca chega aqui, mas satisfaz o type checker
    raise IntegrationError(f"with_retry: estado inesperado após {cfg.max_attempts} tentativas")


# ── Abstract Classes ──────────────────────────────────────────────────────────

class SocialPublisher(ABC):
    """
    Contrato para publishers de redes sociais.

    Implementações disponíveis:
        MockMetaPublisher  — simulação, sem chamadas reais (fase atual)
        MetaPublisher      — Meta Graph API real (fase futura)
        LinkedInPublisher  — LinkedIn API (fase futura)
        TikTokPublisher    — TikTok API (fase futura)
    """

    INTEGRATION_NAME: str = "social_publisher"

    @abstractmethod
    def publish(self, data: PublishPostData) -> PublishResult:
        """
        Publica um post na plataforma social.

        Deve lançar RetryableIntegrationError para erros transitórios
        e IntegrationError para erros permanentes.
        """
        ...

    @abstractmethod
    def delete_post(self, external_post_id: str) -> bool:
        """Remove um post publicado via ID externo."""
        ...

    @abstractmethod
    def get_post_metrics(self, external_post_id: str) -> dict[str, Any]:
        """Retorna métricas do post (impressões, alcance, engajamento)."""
        ...


class N8nWebhookClient(ABC):
    """
    Contrato para clientes de webhook n8n.

    Responsável por disparar workflows no n8n quando eventos ocorrem
    no Social Agent (post publicado, lead criado, comentário classificado, etc.).
    """

    INTEGRATION_NAME: str = "n8n"

    @abstractmethod
    def trigger(self, event_type: str, payload: dict) -> N8nTriggerResult:
        """
        Dispara um workflow n8n via webhook.

        Args:
            event_type: identificador do evento (ex: "post.published")
            payload:    dados a enviar ao n8n

        Deve lançar RetryableIntegrationError para falhas de rede/timeout.
        """
        ...
