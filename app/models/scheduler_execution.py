"""
Models: Scheduler — Execução e Lock Distribuído

Três modelos complementares ao scheduler existente:

    SchedulerLock
        Linha única (id=1) usada como lock distribuído.
        Evita que múltiplos workers gunicorn executem o tick simultaneamente.
        Técnica: conditional UPDATE → apenas o worker que atualizar a linha (rowcount=1)
        "ganha" o lock. O segundo UPDATE falha silenciosamente (rowcount=0).
        O lock expira após LOCK_TIMEOUT_SECONDS para proteger contra crash de worker.

    SchedulerExecution
        Registro persistido de cada ciclo (tick) executado pelo scheduler.
        Substitui o SchedulerState em memória para o histórico — o estado em memória
        ainda existe para resposta rápida do endpoint /status.

    SchedulerPostAttempt
        Rastreia cada tentativa de publicação individual por post.
        Permite limitar o número de retentativas por post (cap via MAX_POST_RETRIES)
        sem alterar a estrutura ou os status do modelo Post.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SchedulerLock(Base):
    """
    Lock distribuído do scheduler — sempre contém exatamente uma linha (id=1).

    Fluxo de aquisição:
        UPDATE scheduler_lock
        SET locked_by=<worker>, locked_at=<now>, expires_at=<now+timeout>
        WHERE id=1
          AND (expires_at IS NULL OR expires_at < <now>)

        rowcount == 1 → lock adquirido
        rowcount == 0 → lock em uso por outro worker

    O lock é liberado explicitamente no finally do tick.
    Expiração automática protege contra crash do worker.
    """
    __tablename__ = "scheduler_lock"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # sempre 1
    locked_by: Mapped[str | None] = mapped_column(String(150), nullable=True)   # "{hostname}:{pid}"
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SchedulerExecution(Base):
    """
    Registro persistido de um ciclo de execução do scheduler.

    Criado ao final de cada tick (bem-sucedido ou não).
    Se o lock não foi adquirido, lock_acquired=False e os contadores ficam zerados.
    """
    __tablename__ = "scheduler_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    ran_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    worker_id: Mapped[str | None] = mapped_column(String(150), nullable=True)
    lock_acquired: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    due_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Lista de erros em JSON — ex: ["post_id=7 — timeout", "post_id=12 — auth error"]
    errors_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SchedulerPostAttempt(Base):
    """
    Rastreia cada tentativa de publicação de um post pelo scheduler.

    Usado para implementar o cap de retentativas:
        - Se um post acumula >= MAX_POST_RETRIES falhas, é ignorado
          nos ticks seguintes até intervenção manual (re-aprovação).
        - Quando um post é publicado com sucesso, a contagem não importa
          pois o post sai do status SCHEDULED.

    status:
        "success"  — publicado com êxito neste tick
        "failed"   — exceção capturada durante a publicação
        "skipped"  — ignorado por exceder o limite de retentativas
    """
    __tablename__ = "scheduler_post_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    post_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("posts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "success" | "failed" | "skipped"
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    worker_id: Mapped[str | None] = mapped_column(String(150), nullable=True)

    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
