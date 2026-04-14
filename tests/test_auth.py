"""
Checklist: Auth  (/api/v1/auth/*)

Cobertura:
  ✔ POST /auth/register        — criação de conta + validações de senha
  ✔ POST /auth/login           — retorno de tokens + schema TokenResponse
  ✔ POST /auth/token           — fluxo OAuth2 form (Swagger)
  ✔ POST /auth/refresh         — renovação de tokens
  ✔ POST /auth/logout          — encerramento de sessão
  ✔ GET  /auth/me              — perfil do usuário autenticado
  ✔ PATCH /auth/me             — atualização de perfil
  ✔ POST /auth/change-password — troca de senha

Bugs verificados:
  [AUTH-01] Token sem refresh_token_expires_in (campo obrigatório no schema)
  [AUTH-02] Login com e-mail inválido retorna 422 (não 401) — comportamento correto?
"""

import pytest


# ── Register ───────────────────────────────────────────────────────────────────

class TestRegister:

    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "novo@example.com",
            "full_name": "Novo Usuário",
            "password": "StrongPass1",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "novo@example.com"
        assert data["full_name"] == "Novo Usuário"
        assert "hashed_password" not in data, "SEGURANÇA: hashed_password exposto na resposta"
        assert "id" in data
        assert data["is_active"] is True
        assert data["role"] == "editor"

    def test_register_duplicate_email_returns_409(self, client):
        payload = {"email": "dup@example.com", "password": "StrongPass1"}
        client.post("/api/v1/auth/register", json=payload)
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 409, f"Esperado 409, recebeu {resp.status_code}"

    def test_register_weak_password_returns_422(self, client):
        cases = [
            {"email": "a@b.com", "password": "short"},           # < 8 chars
            {"email": "a@b.com", "password": "allowercase1"},    # sem maiúscula
            {"email": "a@b.com", "password": "ALLUPPERCASE1"},   # sem minúscula
            {"email": "a@b.com", "password": "NoNumbers!!"},     # sem número
        ]
        for payload in cases:
            resp = client.post("/api/v1/auth/register", json=payload)
            assert resp.status_code == 422, (
                f"Senha fraca aceita para payload {payload}: {resp.status_code}"
            )

    def test_register_invalid_email_returns_422(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "StrongPass1",
        })
        assert resp.status_code == 422

    def test_register_without_full_name_is_valid(self, client):
        """full_name é opcional."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "nofullname@example.com",
            "password": "StrongPass1",
        })
        assert resp.status_code == 201
        assert resp.json()["full_name"] is None


# ── Login ──────────────────────────────────────────────────────────────────────

class TestLogin:

    def test_login_success_returns_token_response(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": "tester@example.com",
            "password": "StrongPass1",
        })
        assert resp.status_code == 200
        data = resp.json()

        # Verifica schema completo do TokenResponse
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert isinstance(data["expires_in"], int)
        assert data["expires_in"] > 0

        # [AUTH-01] refresh_token_expires_in deve estar no response
        assert "refresh_token_expires_in" in data, (
            "[AUTH-01] BUG: 'refresh_token_expires_in' ausente no TokenResponse. "
            "Clientes não sabem quando rotacionar o refresh token sem decodificar o JWT."
        )
        assert isinstance(data["refresh_token_expires_in"], int)
        assert data["refresh_token_expires_in"] > data["expires_in"]

        # Dados do usuário embutidos
        assert "user" in data
        assert data["user"]["email"] == "tester@example.com"

    def test_login_wrong_password_returns_401(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": "tester@example.com",
            "password": "WrongPass1",
        })
        assert resp.status_code == 401
        # Mensagem unificada (anti-enumeração)
        assert "incorretos" in resp.json()["detail"].lower()

    def test_login_nonexistent_email_returns_401(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "naoexiste@example.com",
            "password": "StrongPass1",
        })
        assert resp.status_code == 401

    def test_login_same_error_for_wrong_email_and_wrong_password(self, client, registered_user):
        """Anti-enumeração: mesma mensagem para e-mail inexistente e senha errada."""
        resp_no_user = client.post("/api/v1/auth/login", json={
            "email": "naoexiste@example.com",
            "password": "StrongPass1",
        })
        resp_wrong_pw = client.post("/api/v1/auth/login", json={
            "email": "tester@example.com",
            "password": "WrongPass1",
        })
        assert resp_no_user.json()["detail"] == resp_wrong_pw.json()["detail"], (
            "Mensagens de erro diferentes para e-mail inexistente vs senha errada "
            "permite enumeração de usuários."
        )

    def test_login_oauth2_form_returns_token(self, client, registered_user):
        """POST /auth/token: compatibilidade OAuth2 com form-data."""
        resp = client.post(
            "/api/v1/auth/token",
            data={"username": "tester@example.com", "password": "StrongPass1"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


# ── Refresh ────────────────────────────────────────────────────────────────────

class TestRefresh:

    def test_refresh_returns_new_token_pair(self, client, auth_token_data):
        old_access = auth_token_data["access_token"]
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": auth_token_data["refresh_token"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # Novos tokens devem ser diferentes dos originais (jti único)
        assert data["access_token"] != old_access, (
            "access_token não rotacionou — possível reutilização de jti"
        )

    def test_refresh_with_access_token_fails(self, client, auth_token_data):
        """Usar access_token como refresh_token deve falhar (validação de 'type')."""
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": auth_token_data["access_token"],
        })
        assert resp.status_code == 401, (
            "BUG: access_token aceito como refresh_token — cross-type usage permitido"
        )

    def test_refresh_with_invalid_token_returns_401(self, client):
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid.token.here"})
        assert resp.status_code == 401


# ── Logout ─────────────────────────────────────────────────────────────────────

class TestLogout:

    def test_logout_returns_204(self, client, auth_token_data):
        resp = client.post("/api/v1/auth/logout", json={
            "refresh_token": auth_token_data["refresh_token"],
        })
        assert resp.status_code == 204

    def test_logout_without_body_returns_204(self, client):
        """LogoutRequest tem refresh_token opcional."""
        resp = client.post("/api/v1/auth/logout", json={})
        assert resp.status_code == 204


# ── /auth/me ───────────────────────────────────────────────────────────────────

class TestMe:

    def test_get_me_returns_user_profile(self, client, auth_headers, registered_user):
        resp = client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "tester@example.com"
        assert "hashed_password" not in data

    def test_get_me_without_token_returns_401(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_get_me_with_invalid_token_returns_401(self, client):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token"})
        assert resp.status_code == 401

    def test_patch_me_updates_full_name(self, client, auth_headers):
        resp = client.patch(
            "/api/v1/auth/me",
            json={"full_name": "Nome Atualizado"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Nome Atualizado"

    def test_patch_me_empty_body_is_noop(self, client, auth_headers, registered_user):
        """PATCH sem campos não deve alterar nada."""
        resp = client.patch("/api/v1/auth/me", json={}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == registered_user["email"]


# ── Change Password ────────────────────────────────────────────────────────────

class TestChangePassword:

    def test_change_password_success(self, client, auth_headers):
        resp = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "StrongPass1", "new_password": "NewPass123"},
            headers=auth_headers,
        )
        assert resp.status_code == 204

        # Verifica que a nova senha funciona
        login_resp = client.post("/api/v1/auth/login", json={
            "email": "tester@example.com",
            "password": "NewPass123",
        })
        assert login_resp.status_code == 200

    def test_change_password_wrong_current_returns_400(self, client, auth_headers):
        resp = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "WrongCurrent1", "new_password": "NewPass123"},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_change_password_weak_new_password_returns_422(self, client, auth_headers):
        resp = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "StrongPass1", "new_password": "weak"},
            headers=auth_headers,
        )
        assert resp.status_code == 422
