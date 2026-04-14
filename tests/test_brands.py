"""
Checklist: Brands  (/api/v1/brands/*)

Cobertura:
  ✔ POST   /brands/             — criar brand
  ✔ GET    /brands/             — listar brands do usuário
  ✔ GET    /brands/{id}         — detalhar brand
  ✔ PATCH  /brands/{id}         — atualizar brand
  ✔ DELETE /brands/{id}         — remover brand
  ✔ PATCH  /brands/{id}/config  — atualizar configuração editorial

Bugs verificados:
  [BRAND-01] Nenhum bug estrutural encontrado — módulo íntegro
"""


class TestBrandCRUD:

    def test_create_brand_returns_201(self, client, auth_headers):
        resp = client.post("/api/v1/brands/", json={"name": "Minha Brand"}, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Minha Brand"
        assert "id" in data
        assert "owner_id" in data
        assert "created_at" in data

    def test_create_brand_requires_auth(self, client):
        resp = client.post("/api/v1/brands/", json={"name": "Brand sem auth"})
        assert resp.status_code == 401

    def test_create_brand_requires_name(self, client, auth_headers):
        resp = client.post("/api/v1/brands/", json={}, headers=auth_headers)
        assert resp.status_code == 422

    def test_list_brands_returns_only_own_brands(self, client, auth_headers, auth_headers_user2, brand):
        """Isolamento de ownership: user2 não deve ver brands do user1."""
        resp_user1 = client.get("/api/v1/brands/", headers=auth_headers)
        resp_user2 = client.get("/api/v1/brands/", headers=auth_headers_user2)

        assert resp_user1.status_code == 200
        assert resp_user2.status_code == 200

        ids_user1 = {b["id"] for b in resp_user1.json()}
        ids_user2 = {b["id"] for b in resp_user2.json()}

        assert brand["id"] in ids_user1
        assert brand["id"] not in ids_user2, (
            "ISOLAMENTO: brand do user1 visível para user2"
        )

    def test_get_brand_returns_correct_data(self, client, auth_headers, brand):
        resp = client.get(f"/api/v1/brands/{brand['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == brand["id"]

    def test_get_brand_of_another_user_returns_404(self, client, auth_headers_user2, brand):
        """user2 não pode ver brand do user1."""
        resp = client.get(f"/api/v1/brands/{brand['id']}", headers=auth_headers_user2)
        assert resp.status_code == 404

    def test_update_brand_partial_update(self, client, auth_headers, brand):
        resp = client.patch(
            f"/api/v1/brands/{brand['id']}",
            json={"niche": "saas", "description": "Nova descrição"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["niche"] == "saas"
        assert data["description"] == "Nova descrição"
        assert data["name"] == brand["name"]  # Nome não alterado

    def test_update_brand_of_another_user_returns_404(self, client, auth_headers_user2, brand):
        resp = client.patch(
            f"/api/v1/brands/{brand['id']}",
            json={"name": "Hacked"},
            headers=auth_headers_user2,
        )
        assert resp.status_code == 404

    def test_delete_brand_returns_204(self, client, auth_headers, brand):
        resp = client.delete(f"/api/v1/brands/{brand['id']}", headers=auth_headers)
        assert resp.status_code == 204
        # Confirmar que foi removida
        get_resp = client.get(f"/api/v1/brands/{brand['id']}", headers=auth_headers)
        assert get_resp.status_code == 404

    def test_delete_nonexistent_brand_returns_404(self, client, auth_headers):
        resp = client.delete("/api/v1/brands/99999", headers=auth_headers)
        assert resp.status_code == 404


class TestBrandConfig:

    def test_update_config_returns_brand_config_out(self, client, auth_headers, brand):
        resp = client.patch(
            f"/api/v1/brands/{brand['id']}/config",
            json={
                "niche": "fintech",
                "tone_of_voice": "profissional e direto",
                "target_audience": "empreendedores",
                "posting_frequency": "3x por semana",
                "cta_default": "Saiba mais no link da bio",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        # Schema BrandConfigOut específico
        assert "brand_id" in data
        assert "brand_name" in data
        assert data["niche"] == "fintech"
        assert data["tone_of_voice"] == "profissional e direto"
        assert data["posting_frequency"] == "3x por semana"

    def test_update_config_partial_ok(self, client, auth_headers, brand):
        """Todos os campos de config são opcionais."""
        resp = client.patch(
            f"/api/v1/brands/{brand['id']}/config",
            json={"niche": "edtech"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["niche"] == "edtech"

    def test_update_config_of_another_user_returns_404(self, client, auth_headers_user2, brand):
        resp = client.patch(
            f"/api/v1/brands/{brand['id']}/config",
            json={"niche": "hack"},
            headers=auth_headers_user2,
        )
        assert resp.status_code == 404
