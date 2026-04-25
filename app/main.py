"""
Social Agent — Ponto de entrada da aplicação FastAPI.
Registra todos os routers e configura CORS, metadados e health-check.
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.routers import (
    admin,
    ai,
    analytics,
    approval,
    auth,
    billing,
    brands,
    content_pillars,
    credits,
    engagement,
    health,
    ideas,
    image_tree,
    integrations,
    integrations_oauth,
    leads,
    panel,
    posts,
    projects,
    publishing,
    scheduler,
    upload,
    users,
    video_subtitle,
)

logger = logging.getLogger("main")
settings = get_settings()


# ── Logging seguro ─────────────────────────────────────────────────────────────

def _init_logging() -> None:
    """
    Instala o SensitiveDataFilter no logger raiz para que nenhum handler
    (uvicorn, gunicorn, Sentry, etc.) grave tokens, senhas ou chaves em texto puro.
    Chamado antes de qualquer outro init para cobrir logs de importação/startup.
    """
    from app.core.log_filter import install as _install_filter
    _install_filter()


_init_logging()


# ── Sentry ─────────────────────────────────────────────────────────────────────

def _sentry_before_send(event, hint):
    """Descarta HTTPExceptions esperadas (4xx) — reporta apenas erros reais (5xx+)."""
    exc_info = hint.get("exc_info")
    if exc_info:
        _, exc_value, _ = exc_info
        from fastapi import HTTPException
        if isinstance(exc_value, HTTPException) and exc_value.status_code < 500:
            return None
    return event


def _init_sentry() -> None:
    """
    Inicializa Sentry se SENTRY_DSN estiver configurado.
    Chamado antes de app = FastAPI() para garantir patching ASGI.
    """
    if not settings.SENTRY_DSN:
        return
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    import logging as _logging
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=settings.APP_VERSION,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            LoggingIntegration(
                level=_logging.WARNING,
                event_level=_logging.ERROR,
            ),
        ],
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=0.0,
        send_default_pii=False,
        before_send=_sentry_before_send,
    )
    logger.info(
        "Sentry inicializado (env=%s release=%s traces=%.0f%%)",
        settings.SENTRY_ENVIRONMENT,
        settings.APP_VERSION,
        settings.SENTRY_TRACES_SAMPLE_RATE * 100,
    )


_init_sentry()


# ── Lifespan: startup / shutdown ───────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação.

    Startup:
        - Inicia o scheduler de publicação automática (se SCHEDULER_ENABLED=true)
    Shutdown:
        - Cancela a task do scheduler e aguarda encerramento limpo
    """
    _scheduler_task: asyncio.Task | None = None

    # ── Superuser bootstrap ────────────────────────────────────────────────────
    from app.core.bootstrap import run as _bootstrap
    from app.core.database import SessionLocal as _SessionLocal
    _bootstrap(_SessionLocal)

    if settings.SCHEDULER_ENABLED:
        from app.scheduler.scheduler import scheduler_loop, get_state
        get_state().enabled = True
        _scheduler_task = asyncio.create_task(
            scheduler_loop(settings.SCHEDULER_INTERVAL_SECONDS),
            name="scheduler",
        )
        logger.info(
            "Scheduler ativado (intervalo=%ds)",
            settings.SCHEDULER_INTERVAL_SECONDS,
        )
    else:
        logger.info("Scheduler desativado (SCHEDULER_ENABLED=false)")

    yield  # ← aplicação em execução

    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("Scheduler encerrado com sucesso.")


app = FastAPI(
    title="Social Agent",
    description="Backend do Social Agent — automação de conteúdo e gestão de redes sociais.\n\nMódulos: Estratégia da Marca · Ideias · Posts · Aprovação · Publicação · Engajamento · Leads · Analytics · IA",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- Exception handlers ---

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Normaliza erros de validação Pydantic (422).

    Pydantic v2 prefixa mensagens de field_validator com "Value error, ".
    Este handler remove o prefixo para que o frontend receba mensagens limpas,
    ex.: "Senha fraca — requisitos: mínimo de 8 caracteres" em vez de
         "Value error, Senha fraca — requisitos: mínimo de 8 caracteres".
    """
    _PREFIX = "Value error, "
    errors = []
    for err in exc.errors():
        msg: str = err.get("msg", "Valor inválido.")
        if msg.startswith(_PREFIX):
            msg = msg[len(_PREFIX):]
        errors.append({"field": err["loc"][-1] if err.get("loc") else None, "msg": msg})
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """Captura erros de banco de dados não tratados e retorna 500 limpo."""
    import sentry_sdk
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro de banco de dados. Tente novamente em instantes."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Captura qualquer exceção não tratada e retorna 500 sem expor detalhes internos."""
    from fastapi import HTTPException as _HTTPException
    if isinstance(exc, _HTTPException):
        raise exc
    import sentry_sdk
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor. Tente novamente em instantes."},
    )


# --- Middleware: user context for Sentry ---
@app.middleware("http")
async def _sentry_user_context(request: Request, call_next):
    """Injects user_id from JWT into the active Sentry scope (no DB round-trip)."""
    if settings.SENTRY_DSN:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            try:
                from jose import jwt as _jwt
                payload = _jwt.decode(
                    auth[7:],
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM],
                    options={"verify_exp": False},
                )
                user_id = payload.get("sub")
                if user_id and payload.get("type") == "access":
                    import sentry_sdk
                    sentry_sdk.set_user({"id": user_id})
            except Exception:
                pass
    return await call_next(request)


# --- Middleware: slow request detection ---
@app.middleware("http")
async def _slow_request_monitor(request: Request, call_next):
    """Captures a Sentry warning for requests that exceed SENTRY_SLOW_REQUEST_MS."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    if settings.SENTRY_DSN and elapsed_ms > settings.SENTRY_SLOW_REQUEST_MS:
        import sentry_sdk
        with sentry_sdk.new_scope() as scope:
            scope.set_tag("slow_request", "true")
            scope.set_extra("duration_ms", round(elapsed_ms, 2))
            scope.set_extra("path", str(request.url.path))
            scope.set_extra("method", request.method)
            scope.capture_message(
                f"Slow request: {request.method} {request.url.path} ({elapsed_ms:.0f}ms)",
                level="warning",
            )
    return response


# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
API_PREFIX = "/api/v1"

app.include_router(health.router)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(brands.router, prefix=API_PREFIX)
app.include_router(content_pillars.router, prefix=API_PREFIX)
app.include_router(ideas.router, prefix=API_PREFIX)
app.include_router(posts.router, prefix=API_PREFIX)
app.include_router(approval.router, prefix=API_PREFIX)
app.include_router(publishing.router, prefix=API_PREFIX)
app.include_router(engagement.router, prefix=API_PREFIX)
app.include_router(leads.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(panel.router, prefix=API_PREFIX)
app.include_router(integrations.router,       prefix=API_PREFIX)
app.include_router(integrations_oauth.router, prefix=API_PREFIX)
app.include_router(scheduler.router, prefix=API_PREFIX)
app.include_router(billing.router,  prefix=API_PREFIX)
app.include_router(credits.router,  prefix=API_PREFIX)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(upload.router,         prefix=API_PREFIX)
app.include_router(video_subtitle.router, prefix=API_PREFIX)
app.include_router(image_tree.router,     prefix=API_PREFIX)

# --- Static files: serve uploads and generated files ---
from fastapi.staticfiles import StaticFiles
from pathlib import Path as _Path

_storage_dir = _Path(settings.STORAGE_DIR).resolve()
_storage_dir.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(_storage_dir)), name="storage")


# --- Health check ---
@app.get("/health", tags=["Health"])
def health_check():
    """Verifica se a API está no ar."""
    return {"status": "ok", "version": settings.APP_VERSION}
