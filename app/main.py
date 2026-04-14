"""
Social Agent — Ponto de entrada da aplicação FastAPI.
Registra todos os routers e configura CORS, metadados e health-check.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.routers import (
    ai,
    analytics,
    approval,
    auth,
    brands,
    content_pillars,
    engagement,
    ideas,
    integrations,
    leads,
    panel,
    posts,
    publishing,
    users,
)

settings = get_settings()

app = FastAPI(
    title="Social Agent",
    description="Backend do Social Agent — automação de conteúdo e gestão de redes sociais.\n\nMódulos: Estratégia da Marca · Ideias · Posts · Aprovação · Publicação · Engajamento · Leads · Analytics · IA",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
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
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro de banco de dados. Tente novamente em instantes."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Captura qualquer exceção não tratada e retorna 500 sem expor detalhes internos."""
    # Re-levanta HTTPException para que o handler padrão do FastAPI a trate normalmente
    from fastapi import HTTPException as _HTTPException
    if isinstance(exc, _HTTPException):
        raise exc
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor. Tente novamente em instantes."},
    )


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
app.include_router(integrations.router, prefix=API_PREFIX)


# --- Health check ---
@app.get("/health", tags=["Health"])
def health_check():
    """Verifica se a API está no ar."""
    return {"status": "ok", "version": settings.APP_VERSION}
