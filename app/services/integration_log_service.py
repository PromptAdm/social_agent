"""
Service: Integration Log

Leitura e escrita de logs de integração.
Usado por publishing_service e pelo router de integrações.
"""

import json
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.integration_log import IntegrationLog, IntegrationStatus


def write_log(
    db: Session,
    *,
    integration: str,
    event_type: str,
    status: IntegrationStatus,
    brand_id: int | None = None,
    post_id: int | None = None,
    payload: dict | None = None,
    response: dict | None = None,
    error_message: str | None = None,
    error_code: str | None = None,
    external_id: str | None = None,
    attempt_number: int = 1,
    duration_ms: int | None = None,
) -> IntegrationLog:
    """Persiste um registro de integração no banco."""
    log = IntegrationLog(
        brand_id=brand_id,
        post_id=post_id,
        integration=integration,
        event_type=event_type,
        status=status,
        attempt_number=attempt_number,
        duration_ms=duration_ms,
        payload=json.dumps(payload, default=str) if payload else None,
        response=json.dumps(response, default=str) if response else None,
        error_message=error_message,
        error_code=error_code,
        external_id=external_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def list_logs(
    db: Session,
    brand_id: int,
    *,
    integration: str | None = None,
    status: IntegrationStatus | None = None,
    limit: int = 50,
) -> list[IntegrationLog]:
    """Lista logs de integração de uma brand, do mais recente ao mais antigo."""
    query = db.query(IntegrationLog).filter(IntegrationLog.brand_id == brand_id)
    if integration:
        query = query.filter(IntegrationLog.integration == integration)
    if status:
        query = query.filter(IntegrationLog.status == status)
    return query.order_by(IntegrationLog.created_at.desc()).limit(limit).all()


def get_integration_stats(db: Session, brand_id: int) -> dict:
    """
    Retorna estatísticas agregadas de integração para uma brand.
    Usado pelo endpoint de health check.
    """
    rows = (
        db.query(
            IntegrationLog.integration,
            IntegrationLog.status,
            func.count(IntegrationLog.id).label("total"),
            func.max(IntegrationLog.created_at).label("last_attempt"),
        )
        .filter(IntegrationLog.brand_id == brand_id)
        .group_by(IntegrationLog.integration, IntegrationLog.status)
        .all()
    )

    stats: dict[str, dict] = {}
    for row in rows:
        key = row.integration
        if key not in stats:
            stats[key] = {
                "total_attempts": 0,
                "total_errors": 0,
                "last_attempt_at": None,
                "last_status": None,
            }
        stats[key]["total_attempts"] += row.total
        if row.status in (IntegrationStatus.ERROR, IntegrationStatus.RETRY):
            stats[key]["total_errors"] += row.total
        if stats[key]["last_attempt_at"] is None or row.last_attempt > stats[key]["last_attempt_at"]:
            stats[key]["last_attempt_at"] = row.last_attempt
            stats[key]["last_status"] = row.status.value

    return stats
