"""
Model: IntegrationLog
Registro auditável de cada tentativa de integração com sistemas externos.

Cobre três tipos de fluxo:
    - Saída (outbound): Social Agent → Meta API, Social Agent → n8n
    - Entrada (inbound): Meta webhook → Social Agent, n8n callback → Social Agent

Usado para:
    - Diagnóstico de falhas de integração
    - Rastreamento de retentativas (retry)
    - Auditoria de publicações e eventos
    - Dashboard de saúde das integrações
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IntegrationStatus(str, enum.Enum):
    PENDING  = "pendente"    # em fila / em execução
    SUCCESS  = "sucesso"     # concluído com êxito
    ERROR    = "erro"        # falhou permanentemente
    RETRY    = "retry"       # falhou, aguardando nova tentativa


class IntegrationLog(Base):
    __tablename__ = "integration_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Contexto da operação
    brand_id: Mapped[int | None] = mapped_column(
        ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True
    )
    post_id: Mapped[int | None] = mapped_column(
        ForeignKey("posts.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Identificação da integração
    integration: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # "meta_api" | "n8n" | "webhook_inbound"

    event_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # "publish_post" | "trigger_workflow" | "webhook_received" | "delete_post" | etc.

    # Resultado
    status: Mapped[IntegrationStatus] = mapped_column(
        Enum(IntegrationStatus, name="integrationstatus"),
        default=IntegrationStatus.PENDING,
        nullable=False,
        index=True,
    )
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Payload e resposta em JSON (texto para compatibilidade máxima)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON enviado / recebido
    response: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON da resposta

    # Detalhes de erro
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # HTTP code ou código interno

    # Referência externa (ID retornado pela API da plataforma)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
