"""
Router: Scheduler — Módulo: Agendamento Automático
Prefixo: /api/v1/scheduler

Endpoints (requer autenticação):
    GET  /scheduler/status   — estado atual do scheduler (uptime, último tick, contadores)
    POST /scheduler/trigger  — dispara tick imediato (útil para testes e debug admin)
"""

import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.scheduler.scheduler import get_state, run_tick_sync

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


# ── Response schemas ───────────────────────────────────────────────────────────

class LastResultOut(BaseModel):
    ran_at:          datetime
    due_count:       int
    published_count: int
    failed_count:    int
    errors:          list[str]
    duration_ms:     int


class SchedulerStatusOut(BaseModel):
    enabled:          bool
    interval_seconds: int
    started_at:       Optional[datetime]
    last_run:         Optional[datetime]
    is_running:       bool
    total_ticks:      int
    total_published:  int
    total_failed:     int
    last_result:      Optional[LastResultOut]


class TriggerOut(BaseModel):
    ran_at:          datetime
    due_count:       int
    published_count: int
    failed_count:    int
    errors:          list[str]
    duration_ms:     int


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "/status",
    response_model=SchedulerStatusOut,
    summary="Status do scheduler",
    description=(
        "Retorna o estado atual do scheduler de publicação automática: "
        "intervalo configurado, último tick, contadores de sucesso/falha e "
        "detalhes do último ciclo executado."
    ),
)
def scheduler_status(
    _: User = Depends(get_current_active_user),
) -> SchedulerStatusOut:
    state = get_state()

    last_result: Optional[LastResultOut] = None
    if state.last_result:
        last_result = LastResultOut(
            ran_at=state.last_result.ran_at,
            due_count=state.last_result.due_count,
            published_count=state.last_result.published_count,
            failed_count=state.last_result.failed_count,
            errors=state.last_result.errors,
            duration_ms=state.last_result.duration_ms,
        )

    return SchedulerStatusOut(
        enabled=state.enabled,
        interval_seconds=state.interval_seconds,
        started_at=state.started_at,
        last_run=state.last_run,
        is_running=state.is_running,
        total_ticks=state.total_ticks,
        total_published=state.total_published,
        total_failed=state.total_failed,
        last_result=last_result,
    )


@router.post(
    "/trigger",
    response_model=TriggerOut,
    status_code=status.HTTP_200_OK,
    summary="Disparar tick manual",
    description=(
        "Executa imediatamente um ciclo do scheduler fora do intervalo regular. "
        "Publica todos os posts com `scheduled_at <= agora`. "
        "Retorna 200 mesmo se nenhum post estiver devido. "
        "Se um tick já estiver em execução, retorna sem aguardar."
    ),
)
async def trigger_tick(
    _: User = Depends(get_current_active_user),
) -> TriggerOut:
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, run_tick_sync)
    return TriggerOut(
        ran_at=result.ran_at,
        due_count=result.due_count,
        published_count=result.published_count,
        failed_count=result.failed_count,
        errors=result.errors,
        duration_ms=result.duration_ms,
    )
