"""
Checklist: Posts  (/api/v1/posts/*)

Cobertura:
  ✔ POST   /posts/                       — criar post
  ✔ GET    /posts/brand/{id}             — listar com filtros
  ✔ GET    /posts/{id}                   — detalhar
  ✔ PATCH  /posts/{id}                   — editar rascunho
  ✔ DELETE /posts/{id}                   — remover
  ✔ POST   /posts/{id}/approve           — aprovar (rascunho → aprovado)
  ✔ POST   /posts/{id}/reject            — rejeitar (qualquer → rascunho)
  ✔ POST   /posts/{id}/schedule          — agendar (aprovado → agendado)
  ✔ POST   /posts/{id}/publish           — publicar imediatamente
  ✔ POST   /posts/{id}/duplicate         — duplicar post

Bugs verificados:
  [POST-01] PostUpdate.status permite bypass do workflow de aprovação
  [POST-02] PostOut não expõe external_post_id após publicação
  [POST-03] PostScheduleRequest não valida se scheduled_at está no futuro
  [POST-04] Dupla consulta ao banco nos endpoints de workflow (performance)
"""

from datetime import datetime, timedelta, timezone


class TestPostCRUD:

    def test_create_post_returns_201(self, client, auth_headers, brand):
        resp = client.post("/api/v1/posts/", json={
            "brand_id": brand["id"],
            "caption": "Post de teste",
            "platform": "instagram",
            "formato": "carrossel",
            "prioridade": "alta",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["caption"] == "Post de teste"
        assert data["status"] == "rascunho"
        assert data["platform"] == "instagram"
        assert data["brand_id"] == brand["id"]

    def test_create_post_requires_caption_and_platform(self, client, auth_headers, brand):
        resp = client.post("/api/v1/posts/", json={
            "brand_id": brand["id"],
            # Sem caption e platform
        }, headers=auth_headers)
        assert resp.status_code == 422

    def test_create_post_for_other_users_brand_returns_404(
        self, client, auth_headers_user2, brand
    ):
        resp = client.post("/api/v1/posts/", json={
            "brand_id": brand["id"],
            "caption": "Invasão",
            "platform": "instagram",
        }, headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_list_posts_by_brand(self, client, auth_headers, post_draft):
        resp = client.get(
            f"/api/v1/posts/brand/{post_draft['brand_id']}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        ids = [p["id"] for p in resp.json()]
        assert post_draft["id"] in ids

    def test_list_posts_filter_by_status(self, client, auth_headers, post_draft):
        resp = client.get(
            f"/api/v1/posts/brand/{post_draft['brand_id']}",
            params={"post_status": "rascunho"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert all(p["status"] == "rascunho" for p in resp.json())

    def test_get_post_by_id(self, client, auth_headers, post_draft):
        resp = client.get(f"/api/v1/posts/{post_draft['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == post_draft["id"]

    def test_get_post_of_another_user_returns_404(self, client, auth_headers_user2, post_draft):
        resp = client.get(f"/api/v1/posts/{post_draft['id']}", headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_update_draft_post(self, client, auth_headers, post_draft):
        resp = client.patch(f"/api/v1/posts/{post_draft['id']}", json={
            "caption": "Caption atualizado",
            "prioridade": "urgente",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["caption"] == "Caption atualizado"
        assert data["prioridade"] == "urgente"

    def test_update_approved_post_returns_422(self, client, auth_headers, post_approved):
        """Somente rascunhos podem ser editados via PATCH."""
        resp = client.patch(f"/api/v1/posts/{post_approved['id']}", json={
            "caption": "Tentativa de editar aprovado",
        }, headers=auth_headers)
        assert resp.status_code == 422

    def test_delete_draft_post_returns_204(self, client, auth_headers, post_draft):
        resp = client.delete(f"/api/v1/posts/{post_draft['id']}", headers=auth_headers)
        assert resp.status_code == 204
        get_resp = client.get(f"/api/v1/posts/{post_draft['id']}", headers=auth_headers)
        assert get_resp.status_code == 404


class TestPostStatusBypass:

    def test_post_update_status_bypass_workflow(self, client, auth_headers, post_draft):
        """
        [POST-01] BUG CRÍTICO: PATCH /posts/{id} aceita campo 'status' diretamente,
        permitindo bypassar o fluxo approve → schedule → publish.

        Risco: post pode ir a 'aprovado' sem approved_by_id/approved_at registrados,
        quebrando auditoria e invariantes do sistema.

        Correção: remover 'status' de PostUpdate ou bloquear sua alteração direta.
        """
        resp = client.patch(
            f"/api/v1/posts/{post_draft['id']}",
            json={"status": "aprovado"},
            headers=auth_headers,
        )

        if resp.status_code == 200:
            data = resp.json()
            assert data["status"] == "aprovado"
            # Bug confirmado: status mudou sem passar por approve_post
            assert data["approved_by_id"] is None, (
                "[POST-01] CONFIRMADO: status='aprovado' via PATCH mas approved_by_id=None. "
                "Auditoria corrompida."
            )
            assert data["approved_at"] is None
            raise AssertionError(
                "[POST-01] BUG ATIVO: campo 'status' em PostUpdate permite bypass do workflow."
            )
        # Comportamento esperado: 422 ou campo status ignorado
        assert resp.status_code in (200, 422), (
            f"Status inesperado: {resp.status_code}"
        )


class TestPostWorkflow:

    def test_approve_draft_post(self, client, auth_headers, post_draft):
        resp = client.post(f"/api/v1/posts/{post_draft['id']}/approve", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "aprovado"
        assert data["approved_by_id"] is not None, "approved_by_id deve ser registrado"
        assert data["approved_at"] is not None, "approved_at deve ser registrado"

    def test_approve_already_approved_returns_422(self, client, auth_headers, post_approved):
        resp = client.post(f"/api/v1/posts/{post_approved['id']}/approve", headers=auth_headers)
        assert resp.status_code == 422

    def test_reject_approved_post_returns_to_draft(self, client, auth_headers, post_approved):
        resp = client.post(f"/api/v1/posts/{post_approved['id']}/reject", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rascunho"
        assert data["approved_by_id"] is None
        assert data["approved_at"] is None

    def test_schedule_approved_post(self, client, auth_headers, post_approved):
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/schedule",
            json={"scheduled_at": future},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "agendado"
        assert data["scheduled_at"] is not None

    def test_schedule_draft_post_returns_422(self, client, auth_headers, post_draft):
        """Apenas posts aprovados podem ser agendados."""
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        resp = client.post(
            f"/api/v1/posts/{post_draft['id']}/schedule",
            json={"scheduled_at": future},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_schedule_rejects_past_date(self, client, auth_headers, post_approved):
        """
        [POST-03] BUG: PostScheduleRequest não valida se scheduled_at é futuro.
        Posts podem ser agendados no passado, causando publicação imediata não intencional.

        Correção: adicionar @field_validator('scheduled_at') em PostScheduleRequest.
        """
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/schedule",
            json={"scheduled_at": past},
            headers=auth_headers,
        )
        assert resp.status_code == 422, (
            f"[POST-03] BUG ATIVO: scheduled_at no passado aceito com status {resp.status_code}. "
            "Adicionar validator: 'if v <= datetime.now(tz): raise ValueError(...)'"
        )

    def test_publish_approved_post(self, client, auth_headers, post_approved):
        resp = client.post(f"/api/v1/posts/{post_approved['id']}/publish", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "publicado"
        assert data["published_at"] is not None

    def test_publish_exposes_external_post_id(self, client, auth_headers, post_approved):
        """
        [POST-02] BUG: PostOut não inclui external_post_id no schema de resposta.
        Após publicação, o cliente não consegue obter o ID externo gerado
        pela API da rede social sem fazer GET no post e inspecionar campos extras.

        Correção: adicionar external_post_id: str | None = None em PostOut.
        """
        resp = client.post(f"/api/v1/posts/{post_approved['id']}/publish", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "external_post_id" in data, (
            "[POST-02] BUG ATIVO: 'external_post_id' ausente em PostOut. "
            "Adicionar campo em app/schemas/post.py: external_post_id: str | None = None"
        )

    def test_publish_draft_returns_422(self, client, auth_headers, post_draft):
        """Posts em rascunho não podem ser publicados diretamente."""
        resp = client.post(f"/api/v1/posts/{post_draft['id']}/publish", headers=auth_headers)
        assert resp.status_code == 422

    def test_delete_published_post_returns_422(self, client, auth_headers, post_approved):
        """Posts publicados não podem ser deletados."""
        client.post(f"/api/v1/posts/{post_approved['id']}/publish", headers=auth_headers)
        resp = client.delete(f"/api/v1/posts/{post_approved['id']}", headers=auth_headers)
        assert resp.status_code == 422


class TestPostDuplicate:

    def test_duplicate_post_creates_draft(self, client, auth_headers, post_approved):
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/duplicate",
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] != post_approved["id"]
        assert data["status"] == "rascunho"
        assert data["caption"] == post_approved["caption"]
        assert data["platform"] == post_approved["platform"]
        assert data["approved_by_id"] is None
        assert data["approved_at"] is None
        assert data["scheduled_at"] is None

    def test_duplicate_preserves_content(self, client, auth_headers, post_draft):
        resp = client.post(
            f"/api/v1/posts/{post_draft['id']}/duplicate",
            headers=auth_headers,
        )
        assert resp.status_code == 201
        dup = resp.json()
        assert dup["caption"] == post_draft["caption"]
        assert dup["platform"] == post_draft["platform"]
        assert dup["formato"] == post_draft["formato"]
        assert dup["prioridade"] == post_draft["prioridade"]
