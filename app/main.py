"""
Social Agent — Ponto de entrada da aplicação FastAPI.
Registra todos os routers e configura CORS, metadados e health-check.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import (
    analytics,
    approval,
    auth,
    brands,
    content_pillars,
    engagement,
    ideas,
    leads,
    posts,
    publishing,
    users,
)

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Backend do Social Agent — automação de conteúdo e gestão de redes sociais.\n\n"
        "Módulos: Estratégia da Marca · Ideias · Posts · Aprovação · "
        "Publicação · Engajamento · Leads · Analytics"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
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


# --- Health check ---
@app.get("/health", tags=["Health"])
def health_check():
    """Verifica se a API está no ar."""
    return {"status": "ok", "version": settings.APP_VERSION}
