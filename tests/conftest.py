"""
conftest.py — Fixtures compartilhadas para todos os testes do Social Agent.

Estratégia de banco:
  - SQLite in-memory com StaticPool por test function → isolamento total
  - Sem Alembic: usa Base.metadata.create_all() diretamente
  - Sessão única compartilhada entre requests de um mesmo teste

Variáveis de ambiente de teste são injetadas NO TOPO deste arquivo,
antes de qualquer import da aplicação, para garantir que o lru_cache de
get_settings() capture os valores corretos.
"""

# ── Variáveis de ambiente antes de qualquer import da app ─────────────────────
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-minimum-32-characters-000")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("AI_PROVIDER", "mock")
os.environ.setdefault("SCHEDULER_ENABLED", "false")

# Limpa o cache de settings para garantir que os valores acima sejam lidos
from app.core.config import get_settings
get_settings.cache_clear()

# ── Imports da app (após injeção das env vars) ─────────────────────────────────
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.dependencies import get_db
from app.main import app


# ── Fixtures de banco e cliente ────────────────────────────────────────────────

@pytest.fixture(scope="function")
def client():
    """
    Cria um TestClient isolado por teste:
    - SQLite in-memory com StaticPool (todos os requests compartilham a mesma conexão)
    - Sobrescreve a dependência get_db para apontar ao banco de teste
    - Limpa completamente o esquema após o teste
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# ── Payloads reutilizáveis ─────────────────────────────────────────────────────

USER_PAYLOAD = {
    "email": "tester@example.com",
    "full_name": "Test User",
    "password": "StrongPass1",
}

USER2_PAYLOAD = {
    "email": "other@example.com",
    "full_name": "Other User",
    "password": "StrongPass1",
}


# ── Fixtures de autenticação ───────────────────────────────────────────────────

@pytest.fixture
def registered_user(client):
    resp = client.post("/api/v1/auth/register", json=USER_PAYLOAD)
    assert resp.status_code == 201, f"Register falhou: {resp.text}"
    return resp.json()


@pytest.fixture
def auth_headers(client, registered_user):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": USER_PAYLOAD["email"], "password": USER_PAYLOAD["password"]},
    )
    assert resp.status_code == 200, f"Login falhou: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_user2(client):
    """Segundo usuário para testes de isolamento/ownership."""
    client.post("/api/v1/auth/register", json=USER2_PAYLOAD)
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": USER2_PAYLOAD["email"], "password": USER2_PAYLOAD["password"]},
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def auth_token_data(client, registered_user):
    """Retorna o TokenResponse completo para verificação de schema."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": USER_PAYLOAD["email"], "password": USER_PAYLOAD["password"]},
    )
    return resp.json()


# ── Fixtures de dados ──────────────────────────────────────────────────────────

@pytest.fixture
def brand(client, auth_headers):
    resp = client.post(
        "/api/v1/brands/",
        json={"name": "Test Brand", "niche": "tecnologia"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Create brand falhou: {resp.text}"
    return resp.json()


@pytest.fixture
def idea(client, auth_headers, brand):
    resp = client.post(
        "/api/v1/ideas/",
        json={
            "brand_id": brand["id"],
            "title": "Ideia de Teste",
            "description": "Descrição da ideia de teste",
            "formato_sugerido": "carrossel",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Create idea falhou: {resp.text}"
    return resp.json()


@pytest.fixture
def post_draft(client, auth_headers, brand):
    resp = client.post(
        "/api/v1/posts/",
        json={
            "brand_id": brand["id"],
            "caption": "Post de teste para validação do checklist",
            "platform": "instagram",
            "formato": "imagem_unica",
            "prioridade": "media",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Create post falhou: {resp.text}"
    return resp.json()


@pytest.fixture
def post_approved(client, auth_headers, post_draft):
    resp = client.post(
        f"/api/v1/posts/{post_draft['id']}/approve",
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Approve post falhou: {resp.text}"
    return resp.json()
