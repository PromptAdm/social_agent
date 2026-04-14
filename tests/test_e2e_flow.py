"""
Checklist: End-to-End Flow

Fluxo completo: register → login → create brand → create idea → generate →
                convert to post → approve → schedule → publish

Também cobre:
  - Isolamento de dados entre usuários
  - Integridade do workflow de status dos posts
  - Persistência de auditoria (approved_by_id, approved_at, published_at)
"""

from datetime import datetime, timedelta, timezone


class TestFullContentFlow:
    """
    Fluxo principal: criação de conteúdo do zero até publicação.
    """

    def test_register_to_publish_flow(self, client):
        """
        Fluxo completo end-to-end:
        1. Registrar novo usuário
        2. Fazer login e obter token
        3. Criar brand
        4. Criar ideia manual
        5. Converter ideia em post rascunho
        6. Aprovar post
        7. Publicar imediatamente

        Verifica que cada etapa transiciona o estado corretamente.
        """
        # ── 1. Register ──────────────────────────────────────────────────────────
        reg_resp = client.post("/api/v1/auth/register", json={
            "email": "e2e@example.com",
            "full_name": "E2E User",
            "password": "StrongPass1",
        })
        assert reg_resp.status_code == 201, f"Register falhou: {reg_resp.text}"
        user = reg_resp.json()
        assert user["email"] == "e2e@example.com"
        assert user["role"] == "editor"

        # ── 2. Login ─────────────────────────────────────────────────────────────
        login_resp = client.post("/api/v1/auth/login", json={
            "email": "e2e@example.com",
            "password": "StrongPass1",
        })
        assert login_resp.status_code == 200, f"Login falhou: {login_resp.text}"
        tokens = login_resp.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        # ── 3. Create Brand ──────────────────────────────────────────────────────
        brand_resp = client.post("/api/v1/brands/", json={
            "name": "E2E Brand",
            "niche": "tecnologia",
        }, headers=headers)
        assert brand_resp.status_code == 201, f"Create brand falhou: {brand_resp.text}"
        brand = brand_resp.json()
        assert brand["name"] == "E2E Brand"
        brand_id = brand["id"]

        # ── 4. Create Idea ───────────────────────────────────────────────────────
        idea_resp = client.post("/api/v1/ideas/", json={
            "brand_id": brand_id,
            "title": "Como usar IA no dia a dia",
            "description": "Dicas práticas para usar IA em tarefas cotidianas",
            "formato_sugerido": "carrossel",
            "prioridade": "alta",
        }, headers=headers)
        assert idea_resp.status_code == 201, f"Create idea falhou: {idea_resp.text}"
        idea = idea_resp.json()
        assert idea["status"] == "ideia"
        assert idea["brand_id"] == brand_id
        idea_id = idea["id"]

        # ── 5. Convert Idea to Post ──────────────────────────────────────────────
        to_post_resp = client.post(
            f"/api/v1/ideas/{idea_id}/to-post",
            json={"platform": "instagram", "prioridade": "alta"},
            headers=headers,
        )
        assert to_post_resp.status_code == 201, f"to-post falhou: {to_post_resp.text}"
        post = to_post_resp.json()
        assert post["status"] == "rascunho"
        assert post["brand_id"] == brand_id
        assert post["idea_id"] == idea_id
        assert post["caption"] is not None
        post_id = post["id"]

        # ── 6. Approve Post ──────────────────────────────────────────────────────
        approve_resp = client.post(
            f"/api/v1/posts/{post_id}/approve",
            headers=headers,
        )
        assert approve_resp.status_code == 200, f"Approve falhou: {approve_resp.text}"
        approved = approve_resp.json()
        assert approved["status"] == "aprovado"
        assert approved["approved_by_id"] is not None, "approved_by_id deve ser registrado"
        assert approved["approved_at"] is not None, "approved_at deve ser registrado"

        # ── 7. Publish Post ──────────────────────────────────────────────────────
        publish_resp = client.post(
            f"/api/v1/posts/{post_id}/publish",
            headers=headers,
        )
        assert publish_resp.status_code == 200, f"Publish falhou: {publish_resp.text}"
        published = publish_resp.json()
        assert published["status"] == "publicado"
        assert published["published_at"] is not None, "published_at deve ser registrado"

        # ── Verificação final via GET ────────────────────────────────────────────
        final_resp = client.get(f"/api/v1/posts/{post_id}", headers=headers)
        assert final_resp.status_code == 200
        final = final_resp.json()
        assert final["status"] == "publicado"
        assert final["published_at"] is not None

    def test_register_to_schedule_flow(self, client):
        """
        Fluxo com agendamento:
        register → login → brand → post rascunho → approve → schedule → (tick)
        """
        # Register + Login
        client.post("/api/v1/auth/register", json={
            "email": "scheduler@example.com",
            "full_name": "Scheduler User",
            "password": "StrongPass1",
        })
        login_resp = client.post("/api/v1/auth/login", json={
            "email": "scheduler@example.com",
            "password": "StrongPass1",
        })
        headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

        # Brand
        brand_resp = client.post("/api/v1/brands/", json={"name": "Scheduler Brand"},
                                  headers=headers)
        brand_id = brand_resp.json()["id"]

        # Post
        post_resp = client.post("/api/v1/posts/", json={
            "brand_id": brand_id,
            "caption": "Post para agendar",
            "platform": "instagram",
        }, headers=headers)
        post_id = post_resp.json()["id"]

        # Approve
        client.post(f"/api/v1/posts/{post_id}/approve", headers=headers)

        # Schedule para amanhã
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        schedule_resp = client.post(
            f"/api/v1/posts/{post_id}/schedule",
            json={"scheduled_at": future},
            headers=headers,
        )
        assert schedule_resp.status_code == 200
        scheduled = schedule_resp.json()
        assert scheduled["status"] == "agendado"
        assert scheduled["scheduled_at"] is not None

        # Trigger do scheduler (post não deve ser publicado pois está no futuro)
        trigger_resp = client.post("/api/v1/scheduler/trigger", headers=headers)
        assert trigger_resp.status_code == 200
        result = trigger_resp.json()
        assert result["published_count"] == 0, (
            "Post agendado para o futuro não deve ser publicado pelo tick"
        )

        # Verificar que post ainda está agendado
        get_resp = client.get(f"/api/v1/posts/{post_id}", headers=headers)
        assert get_resp.json()["status"] == "agendado"


class TestWorkflowIntegrity:
    """
    Testes de integridade do workflow: transições inválidas devem ser bloqueadas.
    """

    def test_cannot_skip_approve_to_publish(self, client, auth_headers, post_draft):
        """Rascunho não pode ser publicado diretamente (precisa de aprovação)."""
        resp = client.post(
            f"/api/v1/posts/{post_draft['id']}/publish",
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_cannot_schedule_without_approve(self, client, auth_headers, post_draft):
        """Rascunho não pode ser agendado sem aprovação."""
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        resp = client.post(
            f"/api/v1/posts/{post_draft['id']}/schedule",
            json={"scheduled_at": future},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_approved_post_cannot_be_approved_again(self, client, auth_headers, post_approved):
        """Post já aprovado não pode ser aprovado novamente."""
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/approve",
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_reject_resets_approval_metadata(self, client, auth_headers, post_approved):
        """Ao rejeitar, approved_by_id e approved_at devem ser limpos."""
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/reject",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rascunho"
        assert data["approved_by_id"] is None, "approved_by_id deve ser None após rejeição"
        assert data["approved_at"] is None, "approved_at deve ser None após rejeição"

    def test_published_post_cannot_be_deleted(self, client, auth_headers, post_approved):
        """Post publicado não pode ser deletado."""
        # Publicar
        client.post(f"/api/v1/posts/{post_approved['id']}/publish", headers=auth_headers)
        # Tentar deletar
        resp = client.delete(f"/api/v1/posts/{post_approved['id']}", headers=auth_headers)
        assert resp.status_code == 422

    def test_approve_then_reject_then_reapprove(self, client, auth_headers, post_draft):
        """Ciclo completo: approve → reject → re-approve → publish."""
        post_id = post_draft["id"]

        # Aprovar
        r = client.post(f"/api/v1/posts/{post_id}/approve", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "aprovado"

        # Rejeitar
        r = client.post(f"/api/v1/posts/{post_id}/reject", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "rascunho"

        # Re-aprovar
        r = client.post(f"/api/v1/posts/{post_id}/approve", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "aprovado"

        # Publicar
        r = client.post(f"/api/v1/posts/{post_id}/publish", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "publicado"


class TestDataIsolation:
    """
    Garante que usuários não podem acessar dados de outros usuários
    em nenhuma etapa do fluxo.
    """

    def test_user2_cannot_see_user1_brand(self, client, auth_headers, auth_headers_user2, brand):
        resp = client.get(f"/api/v1/brands/{brand['id']}", headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_user2_cannot_see_user1_post(self, client, auth_headers_user2, post_draft):
        resp = client.get(f"/api/v1/posts/{post_draft['id']}", headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_user2_cannot_approve_user1_post(self, client, auth_headers_user2, post_draft):
        resp = client.post(
            f"/api/v1/posts/{post_draft['id']}/approve",
            headers=auth_headers_user2,
        )
        assert resp.status_code == 404

    def test_user2_cannot_publish_user1_post(self, client, auth_headers_user2, post_approved):
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/publish",
            headers=auth_headers_user2,
        )
        assert resp.status_code == 404

    def test_user2_cannot_see_user1_ideas(self, client, auth_headers_user2, idea):
        resp = client.get(f"/api/v1/ideas/{idea['id']}", headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_list_brands_isolates_per_user(
        self, client, auth_headers, auth_headers_user2, brand
    ):
        """Lista de brands por usuário não deve vazar dados."""
        user1_brands = client.get("/api/v1/brands/", headers=auth_headers).json()
        user2_brands = client.get("/api/v1/brands/", headers=auth_headers_user2).json()

        user1_ids = {b["id"] for b in user1_brands}
        user2_ids = {b["id"] for b in user2_brands}

        assert brand["id"] in user1_ids
        assert brand["id"] not in user2_ids


class TestAuditTrail:
    """
    Verifica que campos de auditoria são preenchidos corretamente
    em cada transição de estado.
    """

    def test_approve_sets_audit_fields(self, client, auth_headers, post_draft):
        resp = client.post(
            f"/api/v1/posts/{post_draft['id']}/approve",
            headers=auth_headers,
        )
        data = resp.json()
        assert data["approved_by_id"] is not None
        assert data["approved_at"] is not None

        # Verificar que approved_at é um timestamp válido
        from datetime import datetime
        dt = datetime.fromisoformat(data["approved_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        assert (now - dt).total_seconds() < 60, "approved_at deve ser recente"

    def test_publish_sets_published_at(self, client, auth_headers, post_approved):
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/publish",
            headers=auth_headers,
        )
        data = resp.json()
        assert data["published_at"] is not None

        from datetime import datetime
        dt = datetime.fromisoformat(data["published_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        assert (now - dt).total_seconds() < 60, "published_at deve ser recente"

    def test_duplicate_resets_all_audit_fields(self, client, auth_headers, post_approved):
        """Duplicar post aprovado cria rascunho limpo sem dados de auditoria."""
        resp = client.post(
            f"/api/v1/posts/{post_approved['id']}/duplicate",
            headers=auth_headers,
        )
        assert resp.status_code == 201
        dup = resp.json()
        assert dup["status"] == "rascunho"
        assert dup["approved_by_id"] is None
        assert dup["approved_at"] is None
        assert dup["scheduled_at"] is None
        assert dup["published_at"] is None
