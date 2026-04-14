"""
Checklist: Ideas  (/api/v1/ideas/*)

Cobertura:
  ✔ POST  /ideas/                      — criar ideia manual
  ✔ GET   /ideas/brand/{id}            — listar com filtros
  ✔ GET   /ideas/{id}                  — detalhar
  ✔ PATCH /ideas/{id}                  — editar
  ✔ DELETE /ideas/{id}                 — remover
  ✔ POST  /ideas/generate              — gerar via IA (mock)
  ✔ POST  /ideas/{id}/to-post          — converter em post

Bugs verificados:
  [IDEA-01] to-post sem body: payload: PostCreateFromIdea = None (falta | None no tipo)
  [IDEA-02] idea_service.generate_ideas: brand_context construído mas nunca passado à IA
  [IDEA-03] idea_service.idea_to_post: brand_context e idea_context mortos (dead code)
"""

from datetime import datetime


class TestIdeaCRUD:

    def test_create_idea_returns_201(self, client, auth_headers, brand):
        resp = client.post("/api/v1/ideas/", json={
            "brand_id": brand["id"],
            "title": "Nova Ideia",
            "description": "Descrição detalhada",
            "formato_sugerido": "carrossel",
            "prioridade": "alta",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Nova Ideia"
        assert data["brand_id"] == brand["id"]
        assert data["status"] == "ideia"
        assert "id" in data
        assert "created_at" in data

    def test_create_idea_wrong_brand_returns_404(self, client, auth_headers):
        resp = client.post("/api/v1/ideas/", json={
            "brand_id": 99999,
            "title": "Ideia Órfã",
        }, headers=auth_headers)
        assert resp.status_code == 404

    def test_create_idea_for_other_users_brand_returns_404(
        self, client, auth_headers_user2, brand
    ):
        resp = client.post("/api/v1/ideas/", json={
            "brand_id": brand["id"],
            "title": "Tentativa de invasão",
        }, headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_list_ideas_by_brand(self, client, auth_headers, idea):
        resp = client.get(
            f"/api/v1/ideas/brand/{idea['brand_id']}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        ids = [i["id"] for i in resp.json()]
        assert idea["id"] in ids

    def test_list_ideas_filter_by_status(self, client, auth_headers, idea):
        resp = client.get(
            f"/api/v1/ideas/brand/{idea['brand_id']}",
            params={"idea_status": "ideia"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert all(i["status"] == "ideia" for i in resp.json())

    def test_list_ideas_pagination(self, client, auth_headers, brand):
        # Criar 3 ideias
        for i in range(3):
            client.post("/api/v1/ideas/", json={
                "brand_id": brand["id"],
                "title": f"Ideia {i}",
            }, headers=auth_headers)

        resp_p1 = client.get(
            f"/api/v1/ideas/brand/{brand['id']}",
            params={"limit": 2, "offset": 0},
            headers=auth_headers,
        )
        resp_p2 = client.get(
            f"/api/v1/ideas/brand/{brand['id']}",
            params={"limit": 2, "offset": 2},
            headers=auth_headers,
        )
        assert resp_p1.status_code == 200
        assert resp_p2.status_code == 200
        assert len(resp_p1.json()) == 2
        assert len(resp_p2.json()) == 1

    def test_get_idea_by_id(self, client, auth_headers, idea):
        resp = client.get(f"/api/v1/ideas/{idea['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == idea["id"]

    def test_get_idea_of_another_user_returns_404(self, client, auth_headers_user2, idea):
        resp = client.get(f"/api/v1/ideas/{idea['id']}", headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_update_idea_partial(self, client, auth_headers, idea):
        resp = client.patch(f"/api/v1/ideas/{idea['id']}", json={
            "title": "Título Atualizado",
            "status": "rascunho",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Título Atualizado"
        assert data["status"] == "rascunho"
        assert data["description"] == idea["description"]  # inalterado

    def test_delete_idea_returns_204(self, client, auth_headers, idea):
        resp = client.delete(f"/api/v1/ideas/{idea['id']}", headers=auth_headers)
        assert resp.status_code == 204
        get_resp = client.get(f"/api/v1/ideas/{idea['id']}", headers=auth_headers)
        assert get_resp.status_code == 404


class TestIdeaGenerate:

    def test_generate_ideas_returns_list(self, client, auth_headers, brand):
        resp = client.post("/api/v1/ideas/generate", json={
            "brand_id": brand["id"],
            "quantidade": 3,
            "tema": "produtividade",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "ideas" in data
        assert "generated_count" in data
        assert "source" in data
        assert data["generated_count"] == len(data["ideas"])
        assert len(data["ideas"]) > 0

    def test_generate_ideas_are_persisted(self, client, auth_headers, brand):
        """
        [IDEA-02] As ideias geradas devem ser persistidas no banco.
        O brand_context era construído mas nunca passado à IA — verificar se
        o resultado ainda é salvo corretamente.
        """
        resp = client.post("/api/v1/ideas/generate", json={
            "brand_id": brand["id"],
            "quantidade": 2,
        }, headers=auth_headers)
        assert resp.status_code == 200
        ideas = resp.json()["ideas"]

        # Verificar que têm IDs reais (foram persistidas)
        for idea_data in ideas:
            assert "id" in idea_data
            assert isinstance(idea_data["id"], int)
            assert idea_data["id"] > 0

            # Buscar pelo ID confirma persistência
            get_resp = client.get(f"/api/v1/ideas/{idea_data['id']}", headers=auth_headers)
            assert get_resp.status_code == 200, (
                f"[IDEA-02] Ideia gerada com id={idea_data['id']} não encontrada no banco"
            )

    def test_generate_ideas_wrong_brand_returns_404(self, client, auth_headers):
        resp = client.post("/api/v1/ideas/generate", json={
            "brand_id": 99999,
            "quantidade": 3,
        }, headers=auth_headers)
        assert resp.status_code == 404


class TestIdeaToPost:

    def test_idea_to_post_with_body(self, client, auth_headers, idea):
        resp = client.post(
            f"/api/v1/ideas/{idea['id']}/to-post",
            json={"platform": "instagram", "prioridade": "alta"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "rascunho"
        assert data["brand_id"] == idea["brand_id"]
        assert data["idea_id"] == idea["id"]

    def test_idea_to_post_without_body(self, client, auth_headers, idea):
        """
        [IDEA-01] O endpoint aceita POST sem body (frontend envia vazio).
        Bug: payload: PostCreateFromIdea = None — falta '| None' no tipo.
        FastAPI 0.115+ aceita a omissão, mas o tipo é impreciso.
        """
        resp = client.post(
            f"/api/v1/ideas/{idea['id']}/to-post",
            headers=auth_headers,
            # Sem body
        )
        assert resp.status_code == 201, (
            f"[IDEA-01] POST sem body falhou com {resp.status_code}: {resp.text}. "
            "Corrigir: payload: PostCreateFromIdea | None = None"
        )
        assert resp.json()["status"] == "rascunho"

    def test_idea_to_post_creates_draft_with_correct_fields(self, client, auth_headers, idea):
        resp = client.post(
            f"/api/v1/ideas/{idea['id']}/to-post",
            json={"platform": "linkedin"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["platform"] == "linkedin"
        assert data["status"] == "rascunho"
        assert data["caption"] is not None and len(data["caption"]) > 0, (
            "Caption gerado pela IA não deve ser vazio"
        )

    def test_idea_to_post_nonexistent_idea_returns_404(self, client, auth_headers):
        resp = client.post(
            "/api/v1/ideas/99999/to-post",
            json={},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_idea_to_post_for_other_users_idea_returns_404(
        self, client, auth_headers_user2, idea
    ):
        resp = client.post(
            f"/api/v1/ideas/{idea['id']}/to-post",
            headers=auth_headers_user2,
        )
        assert resp.status_code == 404
