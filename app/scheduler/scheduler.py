"""
Scheduler: publicação automática de posts agendados.

Arquitetura (inalterada):
    ┌─ FastAPI lifespan ──────────────────────────────────────────────────┐
    │  asyncio.create_task(scheduler_loop(interval))                      │
    │                                                                     │
    │  scheduler_loop()                                                   │
    │    └─ a cada <interval> segundos:                                   │
    │         run_in_executor(None, run_tick_sync)  ← thread pool        │
    │           └─ _run_tick()                                            │
    │                ├─ SessionLocal()   ← sessão DB dedicada             │
    │                ├─ adquire DB lock (previne execução duplicada)      │
    │                ├─ query posts WHERE status=agendado AND due<=now    │
    │                ├─ publish_post() para cada post (com cap de retry)  │
    │                ├─ persiste SchedulerExecution no banco              │
    │                └─ db.close()                                        │
    └─────────────────────────────────────────────────────────────────────┘

Garantias (produção):
    - Lock distribuído via DB (conditional UPDATE): evita execução duplicada
      entre múltiplos workers gunicorn — sem Redis.
    - Cap de retentativas: posts com >= MAX_POST_RETRIES falhas acumuladas
      são ignorados até intervenção manual, evitando loop infinito.
    - Execuções persistidas: SchedulerExecution gravado no DB após cada tick
      — sobrevive a restarts.
    - Re-entrância (in-process): _state.is_running impede segundo tick no
      mesmo processo enquanto o primeiro não terminar.
    - Encerramento limpo: CancelledError capturado no shutdown do app.
    - Tolerância a falhas: erro em um post não impede os demais.
    - Cada tick tem sua própria sessão DB (nunca vaza estado entre ticks).

Constantes configuráveis:
    MAX_POST_RETRIES     — falhas acumuladas por post antes de ser ignorado (padrão: 5)
    LOCK_TIMEOUT_SECONDS — expiração do lock em caso de crash do worker (padrão: 300s)
"""

import asyncio
import json
import logging
import os
import socket
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.models.post import Post, PostStatus
from app.models.scheduler_execution import SchedulerExecution, SchedulerLock, SchedulerPostAttempt

logger = logging.getLogger("scheduler")

# ── Constantes ────────────────────────────────────────────────────────────────

MAX_POST_RETRIES = 5        # falhas acumuladas por post antes de ser ignorado
LOCK_TIMEOUT_SECONDS = 300  # tempo máximo que um lock pode ficar ativo (proteção contra crash)

# Identificador único deste worker — "{hostname}:{pid}"
_WORKER_ID = f"{socket.gethostname()}:{os.getpid()}"


# ── Tipos públicos (contratos inalterados) ────────────────────────────────────

@dataclass
class TickResult:
    """Resultado de um único ciclo de execução do scheduler."""
    ran_at:          datetime
    due_count:       int        # posts encontrados com scheduled_at <= agora
    published_count: int        # publicados com sucesso
    failed_count:    int        # falharam (erro de integração ou DB)
    errors:          list[str]  # mensagens de erro por post
    duration_ms:     int        # tempo total do tick em milissegundos
    # Campos adicionados (retrocompatíveis — default seguro)
    skipped_count:   int = 0    # posts ignorados por exceder MAX_POST_RETRIES
    lock_acquired:   bool = True # False se outro worker estava executando


@dataclass
class SchedulerState:
    """Estado em memória do scheduler — lido pelo endpoint /scheduler/status."""
    enabled:          bool                 = False
    interval_seconds: int                  = 60
    started_at:       Optional[datetime]   = None
    last_run:         Optional[datetime]   = None
    last_result:      Optional[TickResult] = None
    total_published:  int                  = 0
    total_failed:     int                  = 0
    total_ticks:      int                  = 0
    is_running:       bool                 = False


# Singleton em memória — compartilhado com o router de status
_state = SchedulerState()


def get_state() -> SchedulerState:
    return _state


# ── Lock distribuído ──────────────────────────────────────────────────────────

def _init_lock(db) -> None:
    """
    Garante que a linha de lock (id=1) existe na tabela scheduler_lock.
    Chamado uma vez no startup do scheduler — seguro contra race conditions
    via IntegrityError no insert duplicado.
    """
    existing = db.get(SchedulerLock, 1)
    if existing is None:
        try:
            db.add(SchedulerLock(id=1))
            db.commit()
        except IntegrityError:
            db.rollback()  # outro worker inseriu primeiro — tudo bem


def _acquire_lock(db, worker_id: str, timeout_seconds: int = LOCK_TIMEOUT_SECONDS) -> bool:
    """
    Tenta adquirir o lock distribuído usando conditional UPDATE.

    Técnica compare-and-swap via SQL:
        UPDATE scheduler_lock
        SET locked_by=<worker>, locked_at=<now>, expires_at=<expiry>
        WHERE id=1
          AND (expires_at IS NULL OR expires_at < <now>)

    rowcount=1 → este worker adquiriu o lock
    rowcount=0 → outro worker está ativo (ou o lock expirou mas foi renovado)

    Funciona em SQLite (escrita serializada) e PostgreSQL (row-level locking).
    """
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(seconds=timeout_seconds)

    rows_updated = (
        db.query(SchedulerLock)
        .filter(
            SchedulerLock.id == 1,
            or_(
                SchedulerLock.expires_at.is_(None),
                SchedulerLock.expires_at < now,
            ),
        )
        .update(
            {"locked_by": worker_id, "locked_at": now, "expires_at": expiry},
            synchronize_session=False,
        )
    )
    db.commit()
    return rows_updated > 0


def _release_lock(db, worker_id: str) -> None:
    """
    Libera o lock — apenas se pertencer a este worker.
    Idempotente: não levanta exceção se o lock já foi expirado/liberado.
    """
    try:
        db.query(SchedulerLock).filter(
            SchedulerLock.id == 1,
            SchedulerLock.locked_by == worker_id,
        ).update(
            {"locked_by": None, "locked_at": None, "expires_at": None},
            synchronize_session=False,
        )
        db.commit()
    except Exception as exc:
        logger.warning("Scheduler: erro ao liberar lock: %s", exc)
        db.rollback()


# ── Retry tracking ────────────────────────────────────────────────────────────

def _count_post_failures(db, post_id: int) -> int:
    """Retorna o número total de tentativas com status 'failed' para este post."""
    return (
        db.query(SchedulerPostAttempt)
        .filter(
            SchedulerPostAttempt.post_id == post_id,
            SchedulerPostAttempt.status == "failed",
        )
        .count()
    )


def _record_attempt(
    db,
    post_id: int,
    status: str,
    attempt_number: int,
    error_message: str | None = None,
) -> None:
    """Persiste uma tentativa de publicação no banco."""
    db.add(SchedulerPostAttempt(
        post_id=post_id,
        status=status,
        attempt_number=attempt_number,
        error_message=error_message,
        worker_id=_WORKER_ID,
    ))
    # Não comita aqui — o commit principal do tick faz isso


# ── Tick — executa em thread pool ─────────────────────────────────────────────

def _run_tick() -> TickResult:
    """
    Lógica principal de um tick:
        1. Abre sessão DB dedicada
        2. Tenta adquirir lock distribuído → aborta se outro worker estiver ativo
        3. Busca posts devidos (SCHEDULED + scheduled_at <= agora)
        4. Ignora posts com >= MAX_POST_RETRIES falhas acumuladas
        5. Publica cada post elegível e registra a tentativa
        6. Persiste SchedulerExecution com o resumo do tick
        7. Libera o lock

    Sempre chamado via run_in_executor() — nunca bloqueia o event loop.
    """
    from app.services import publishing_service  # importação tardia evita circular

    db = SessionLocal()
    t_start = time.monotonic()
    ran_at = datetime.now(timezone.utc)
    due_count = 0
    published = 0
    failed = 0
    skipped = 0
    errors: list[str] = []
    lock_acquired = False

    try:
        # ── 1. Garantir que linha de lock existe ──────────────────────────────
        _init_lock(db)

        # ── 2. Adquirir lock distribuído ──────────────────────────────────────
        lock_acquired = _acquire_lock(db, _WORKER_ID)

        if not lock_acquired:
            logger.debug(
                "Scheduler tick ignorado — lock em uso por outro worker."
            )
            duration_ms = int((time.monotonic() - t_start) * 1000)
            # Persiste execução "bloqueada" para rastreabilidade
            _persist_execution(db, ran_at, 0, 0, 0, 0, [], duration_ms, lock_acquired=False)
            return TickResult(
                ran_at=ran_at,
                due_count=0,
                published_count=0,
                failed_count=0,
                errors=["Tick ignorado — lock em uso por outro worker."],
                duration_ms=duration_ms,
                skipped_count=0,
                lock_acquired=False,
            )

        # ── 3. Buscar posts devidos ───────────────────────────────────────────
        now = datetime.now(timezone.utc)
        due_posts: list[Post] = (
            db.query(Post)
            .filter(
                Post.status == PostStatus.SCHEDULED,
                Post.scheduled_at <= now,
            )
            .order_by(Post.scheduled_at)
            .all()
        )
        due_count = len(due_posts)

        if due_count:
            logger.info(
                "Scheduler tick: %d post(s) devidos para publicação",
                due_count,
            )

        # ── 4 + 5. Processar posts ────────────────────────────────────────────
        for attempt_num, post in enumerate(due_posts, start=1):
            # Verificar cap de retentativas
            failure_count = _count_post_failures(db, post.id)
            if failure_count >= MAX_POST_RETRIES:
                skipped += 1
                _record_attempt(db, post.id, "skipped", attempt_num)
                logger.warning(
                    "Scheduler: post id=%d ignorado após %d falhas acumuladas "
                    "(MAX_POST_RETRIES=%d). Reaprovação manual necessária.",
                    post.id,
                    failure_count,
                    MAX_POST_RETRIES,
                )
                continue

            # Tentar publicar
            try:
                publishing_service.publish_post(db, post.id, user_id=None)
                published += 1
                _record_attempt(db, post.id, "success", attempt_num)
                logger.info(
                    "Scheduler: post id=%d publicado (brand_id=%d, platform=%s, "
                    "falhas_anteriores=%d)",
                    post.id,
                    post.brand_id,
                    post.platform.value,
                    failure_count,
                )
            except Exception as exc:
                failed += 1
                msg = f"post_id={post.id} — {exc}"
                errors.append(msg)
                _record_attempt(db, post.id, "failed", attempt_num, error_message=str(exc))
                logger.error(
                    "Scheduler: falha ao publicar post_id=%d (tentativa %d/%d): %s",
                    post.id,
                    failure_count + 1,
                    MAX_POST_RETRIES,
                    exc,
                    exc_info=True,
                )

        # Commit das tentativas registradas
        try:
            db.commit()
        except Exception as exc:
            logger.error("Scheduler: erro ao gravar tentativas: %s", exc)
            db.rollback()

    except Exception as exc:
        failed += 1
        errors.append(f"db_error: {exc}")
        logger.error("Scheduler: erro de banco no tick: %s", exc, exc_info=True)

    finally:
        # ── 6. Persistir execução ─────────────────────────────────────────────
        duration_ms = int((time.monotonic() - t_start) * 1000)
        try:
            _persist_execution(
                db, ran_at, due_count, published, failed, skipped, errors,
                duration_ms, lock_acquired=lock_acquired,
            )
        except Exception as exc:
            logger.error("Scheduler: erro ao persistir execução: %s", exc)

        # ── 7. Liberar lock ────────────────────────────────────────────────────
        if lock_acquired:
            _release_lock(db, _WORKER_ID)

        db.close()

    return TickResult(
        ran_at=ran_at,
        due_count=due_count,
        published_count=published,
        failed_count=failed,
        errors=errors,
        duration_ms=duration_ms,
        skipped_count=skipped,
        lock_acquired=lock_acquired,
    )


def _persist_execution(
    db,
    ran_at: datetime,
    due_count: int,
    published_count: int,
    failed_count: int,
    skipped_count: int,
    errors: list[str],
    duration_ms: int,
    lock_acquired: bool,
) -> None:
    """Grava o resumo do tick na tabela scheduler_executions."""
    execution = SchedulerExecution(
        ran_at=ran_at,
        worker_id=_WORKER_ID,
        lock_acquired=lock_acquired,
        due_count=due_count,
        published_count=published_count,
        failed_count=failed_count,
        skipped_count=skipped_count,
        errors_json=json.dumps(errors) if errors else None,
        duration_ms=duration_ms,
    )
    db.add(execution)
    db.commit()


# ── Ponto de entrada público (contrato inalterado) ────────────────────────────

def run_tick_sync() -> TickResult:
    """
    Ponto de entrada público para disparar um tick (loop interno ou endpoint admin).

    Atualiza _state após a execução.
    Protege contra re-entrância in-process: retorna imediatamente se já houver
    um tick ativo neste worker.

    Lock distribuído (cross-process) é gerenciado internamente em _run_tick().
    """
    if _state.is_running:
        return TickResult(
            ran_at=datetime.now(timezone.utc),
            due_count=0,
            published_count=0,
            failed_count=0,
            errors=["Tick já em andamento neste worker — aguarde a conclusão."],
            duration_ms=0,
            skipped_count=0,
            lock_acquired=False,
        )

    _state.is_running = True
    try:
        result = _run_tick()
    finally:
        _state.is_running = False

    # Atualizar estado em memória (mantém compatibilidade com /scheduler/status)
    _state.last_run = result.ran_at
    _state.last_result = result
    _state.total_ticks += 1
    if result.lock_acquired:
        _state.total_published += result.published_count
        _state.total_failed += result.failed_count

    return result


# ── Loop principal — roda como asyncio.Task (contrato inalterado) ──────────────

async def scheduler_loop(interval_seconds: int) -> None:
    """
    Loop assíncrono principal do scheduler.

    Fluxo:
        1. Aguarda 10s (ou interval, se menor) para o app terminar o startup
        2. Executa run_tick_sync() em ThreadPoolExecutor a cada interval_seconds
        3. Captura CancelledError para encerramento limpo no shutdown

    O tick roda em thread (run_in_executor) — a coroutine apenas espera o
    resultado sem bloquear o event loop do FastAPI.
    """
    loop = asyncio.get_event_loop()
    _state.interval_seconds = interval_seconds
    _state.started_at = datetime.now(timezone.utc)

    logger.info(
        "Scheduler iniciado — worker=%s, intervalo=%ds, primeiro tick em ~%ds",
        _WORKER_ID,
        interval_seconds,
        min(10, interval_seconds),
    )

    # Delay inicial: deixa o app subir completamente antes do primeiro tick
    initial_delay = min(10, interval_seconds)
    try:
        await asyncio.sleep(initial_delay)
    except asyncio.CancelledError:
        logger.info("Scheduler cancelado antes do primeiro tick.")
        return

    while True:
        try:
            result = await loop.run_in_executor(None, run_tick_sync)

            if result.lock_acquired and (result.published_count > 0 or result.failed_count > 0):
                logger.info(
                    "Scheduler tick: publicados=%d falhas=%d ignorados=%d duração=%dms",
                    result.published_count,
                    result.failed_count,
                    result.skipped_count,
                    result.duration_ms,
                )

        except asyncio.CancelledError:
            logger.info("Scheduler encerrado (CancelledError no executor).")
            return
        except Exception as exc:
            logger.error("Scheduler: erro não esperado no loop: %s", exc, exc_info=True)

        # Aguarda próximo intervalo
        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("Scheduler encerrado.")
            return
