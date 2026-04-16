"""
Router: Scheduler — Módulo: Agendamento Automático
Prefixo: /api/v1/scheduler

Endpoints (requer autenticação):
    GET  /scheduler/status          — estado atual do scheduler (uptime, último tick, contadores)
    POST /scheduler/trigger         — dispara tick imediato (útil para testes e debug admin)
    GET  /scheduler/executions      — histórico persistido de execuções (últimas N)
    GET  /scheduler/post-attempts   — histórico de tentativas por post
"""

import asyncio
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.scheduler_execution import SchedulerExecution, SchedulerPostAttempt
from app.models.user import User
from app.scheduler.scheduler import MAX_POST_RETRIES, get_state, run_tick_sync

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
    skipped_count:   int = 0
    lock_acquired:   bool = True


class ExecutionOut(BaseModel):
    id:              int
    ran_at:          datetime
    worker_id:       Optional[str]
    lock_acquired:   bool
    due_count:       int
    published_count: int
    failed_count:    int
    skipped_count:   int
    errors:          list[str]
    duration_ms:     int
    created_at:      datetime

    model_config = {"from_attributes": True}


class PostAttemptOut(BaseModel):
    id:             int
    post_id:        Optional[int]
    status:         str
    error_message:  Optional[str]
    attempt_number: int
    worker_id:      Optional[str]
    attempted_at:   datetime

    model_config = {"from_attributes": True}


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
        skipped_count=result.skipped_count,
        lock_acquired=result.lock_acquired,
    )


@router.get(
    "/executions",
    response_model=list[ExecutionOut],
    summary="Histórico de execuções do scheduler",
    description=(
        "Retorna as últimas execuções persistidas do scheduler.\n\n"
        "Cada execução representa um ciclo (tick) do scheduler, incluindo:\n"
        "- `lock_acquired`: False indica que outro worker estava ativo naquele momento\n"
        "- `skipped_count`: posts ignorados por exceder o limite de retentativas\n"
        f"- `errors`: mensagens de falha por post (máx {MAX_POST_RETRIES} tentativas antes de ignorar)\n\n"
        "Use `limit` para controlar quantas execuções retornar (padrão: 50, máx: 200)."
    ),
)
def list_executions(
    limit: int = Query(default=50, ge=1, le=200),
    only_active: bool = Query(
        default=False,
        description="Se true, retorna apenas ticks onde lock_acquired=true",
    ),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> list[ExecutionOut]:
    q = db.query(SchedulerExecution)
    if only_active:
        q = q.filter(SchedulerExecution.lock_acquired.is_(True))
    rows = q.order_by(SchedulerExecution.ran_at.desc()).limit(limit).all()

    result = []
    for row in rows:
        errors = json.loads(row.errors_json) if row.errors_json else []
        result.append(ExecutionOut(
            id=row.id,
            ran_at=row.ran_at,
            worker_id=row.worker_id,
            lock_acquired=row.lock_acquired,
            due_count=row.due_count,
            published_count=row.published_count,
            failed_count=row.failed_count,
            skipped_count=row.skipped_count,
            errors=errors,
            duration_ms=row.duration_ms,
            created_at=row.created_at,
        ))
    return result


@router.get(
    "/post-attempts",
    response_model=list[PostAttemptOut],
    summary="Histórico de tentativas por post",
    description=(
        "Retorna o histórico de tentativas de publicação feitas pelo scheduler.\n\n"
        f"Posts com `status=failed` acumulando >= {MAX_POST_RETRIES} tentativas "
        "serão automaticamente ignorados nos próximos ticks (`status=skipped`).\n\n"
        "Filtre por `post_id` para ver o histórico de um post específico.\n"
        "Filtre por `status` para listar apenas falhas ou sucessos."
    ),
)
def list_post_attempts(
    post_id: Optional[int] = Query(default=None, description="Filtrar por post"),
    attempt_status: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filtrar por status: success | failed | skipped",
    ),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> list[PostAttemptOut]:
    q = db.query(SchedulerPostAttempt)
    if post_id is not None:
        q = q.filter(SchedulerPostAttempt.post_id == post_id)
    if attempt_status is not None:
        q = q.filter(SchedulerPostAttempt.status == attempt_status)
    rows = q.order_by(SchedulerPostAttempt.attempted_at.desc()).limit(limit).all()
    return [PostAttemptOut.model_validate(row) for row in rows]
