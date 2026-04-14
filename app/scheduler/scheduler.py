"""
Scheduler: publicação automática de posts agendados.

Arquitetura:
    ┌─ FastAPI lifespan ──────────────────────────────────────────────────┐
    │  asyncio.create_task(scheduler_loop(interval))                      │
    │                                                                     │
    │  scheduler_loop()                                                   │
    │    └─ a cada <interval> segundos:                                   │
    │         run_in_executor(None, run_tick_sync)  ← thread pool        │
    │           └─ _run_tick()                                            │
    │                ├─ SessionLocal()   ← sessão DB dedicada             │
    │                ├─ query posts WHERE status=agendado AND due<=now    │
    │                ├─ publish_post() para cada post                     │
    │                └─ db.close()                                        │
    └─────────────────────────────────────────────────────────────────────┘

Garantias:
    - Tolerante a falhas: erro em um post não impede os demais
    - Re-entrância: segundo tick não inicia enquanto o primeiro não terminar
    - Encerramento limpo: captura CancelledError no shutdown do app
    - Cada tick tem sua própria sessão DB (nunca vaza estado entre ticks)
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from app.core.database import SessionLocal
from app.models.post import Post, PostStatus

logger = logging.getLogger("scheduler")


# ── Tipos ──────────────────────────────────────────────────────────────────────

@dataclass
class TickResult:
    """Resultado de um único ciclo de execução do scheduler."""
    ran_at:          datetime
    due_count:       int        # posts encontrados com scheduled_at <= agora
    published_count: int        # publicados com sucesso
    failed_count:    int        # falharam (erro de integração ou DB)
    errors:          list[str]  # mensagens de erro por post
    duration_ms:     int        # tempo total do tick em milissegundos


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


# ── Tick — executa em thread pool ─────────────────────────────────────────────

def _run_tick() -> TickResult:
    """
    Lógica principal de um tick: abre sessão → busca posts devidos → publica.

    Chamado sempre via run_in_executor() para não bloquear o event loop.
    Abre e fecha sua própria sessão DB independente de qualquer request.
    """
    from app.services import publishing_service  # importação tardia evita circular

    db = SessionLocal()
    t_start = time.monotonic()
    ran_at = datetime.now(timezone.utc)
    due_count = 0
    published = 0
    failed = 0
    errors: list[str] = []

    try:
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

        for post in due_posts:
            try:
                publishing_service.publish_post(db, post.id, user_id=None)
                published += 1
                logger.info(
                    "Scheduler: post id=%d publicado (brand_id=%d, platform=%s)",
                    post.id,
                    post.brand_id,
                    post.platform.value,
                )
            except Exception as exc:
                failed += 1
                msg = f"post_id={post.id} — {exc}"
                errors.append(msg)
                logger.error(
                    "Scheduler: falha ao publicar post_id=%d: %s",
                    post.id,
                    exc,
                    exc_info=True,
                )

    except Exception as exc:
        failed += 1
        errors.append(f"db_error: {exc}")
        logger.error("Scheduler: erro de banco no tick: %s", exc, exc_info=True)

    finally:
        db.close()

    duration_ms = int((time.monotonic() - t_start) * 1000)

    return TickResult(
        ran_at=ran_at,
        due_count=due_count,
        published_count=published,
        failed_count=failed,
        errors=errors,
        duration_ms=duration_ms,
    )


def run_tick_sync() -> TickResult:
    """
    Ponto de entrada público para disparar um tick (loop interno ou endpoint admin).

    Atualiza _state após a execução.
    Protege contra re-entrância: retorna imediatamente se já houver um tick ativo.
    """
    if _state.is_running:
        return TickResult(
            ran_at=datetime.now(timezone.utc),
            due_count=0,
            published_count=0,
            failed_count=0,
            errors=["Tick já em andamento — aguarde a conclusão."],
            duration_ms=0,
        )

    _state.is_running = True
    try:
        result = _run_tick()
    finally:
        _state.is_running = False

    # Atualizar estado compartilhado
    _state.last_run = result.ran_at
    _state.last_result = result
    _state.total_ticks += 1
    _state.total_published += result.published_count
    _state.total_failed += result.failed_count

    return result


# ── Loop principal — roda como asyncio.Task ────────────────────────────────────

async def scheduler_loop(interval_seconds: int) -> None:
    """
    Loop assíncrono principal do scheduler.

    Fluxo:
        1. Aguarda 10s (ou interval, se menor) para o app terminar o startup
        2. Executa _run_tick() em ThreadPoolExecutor a cada interval_seconds
        3. Captura CancelledError para encerramento limpo no shutdown

    O tick roda em thread (run_in_executor) — a coroutine apenas espera o
    resultado sem bloquear o event loop do FastAPI.
    """
    loop = asyncio.get_event_loop()
    _state.interval_seconds = interval_seconds
    _state.started_at = datetime.now(timezone.utc)

    logger.info(
        "Scheduler iniciado — intervalo=%ds, primeiro tick em ~%ds",
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

            if result.published_count > 0 or result.failed_count > 0:
                logger.info(
                    "Scheduler tick concluído: publicados=%d falhas=%d duração=%dms",
                    result.published_count,
                    result.failed_count,
                    result.duration_ms,
                )

        except asyncio.CancelledError:
            logger.info("Scheduler encerrado (CancelledError no executor).")
            return
        except Exception as exc:
            # Erro inesperado no loop — loga mas não para o scheduler
            logger.error("Scheduler: erro não esperado no loop: %s", exc, exc_info=True)

        # Aguarda próximo intervalo
        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("Scheduler encerrado.")
            return
