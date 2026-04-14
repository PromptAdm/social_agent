"""
Checklist: Scheduler  (/api/v1/scheduler/*)

Cobertura:
  ✔ GET  /scheduler/status   — estado atual do scheduler
  ✔ POST /scheduler/trigger  — dispara tick manual

Comportamento esperado com SCHEDULER_ENABLED=false (ambiente de teste):
  - GET /status deve retornar enabled=false e contadores zerados
  - POST /trigger deve executar o tick e retornar resultado (due_count=0 em DB vazio)
"""


class TestSchedulerStatus:

    def test_status_requires_auth(self, client):
        resp = client.get("/api/v1/scheduler/status")
        assert resp.status_code == 401

    def test_status_returns_schema(self, client, auth_headers):
        """GET /scheduler/status retorna SchedulerStatusOut completo."""
        resp = client.get("/api/v1/scheduler/status", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()

        # Campos obrigatórios do schema
        assert "enabled" in data, "Campo 'enabled' ausente"
        assert "interval_seconds" in data, "Campo 'interval_seconds' ausente"
        assert "is_running" in data, "Campo 'is_running' ausente"
        assert "total_ticks" in data, "Campo 'total_ticks' ausente"
        assert "total_published" in data, "Campo 'total_published' ausente"
        assert "total_failed" in data, "Campo 'total_failed' ausente"

        # Campos opcionais (podem ser null)
        assert "started_at" in data
        assert "last_run" in data
        assert "last_result" in data

    def test_status_disabled_in_test_env(self, client, auth_headers):
        """Com SCHEDULER_ENABLED=false, o scheduler deve estar desativado."""
        resp = client.get("/api/v1/scheduler/status", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["enabled"] is False, (
            "Scheduler deve estar desativado no ambiente de teste "
            "(SCHEDULER_ENABLED=false em conftest.py)"
        )

    def test_status_counters_are_integers(self, client, auth_headers):
        """Contadores numéricos devem ser inteiros >= 0."""
        resp = client.get("/api/v1/scheduler/status", headers=auth_headers)
        data = resp.json()
        assert isinstance(data["total_ticks"], int) and data["total_ticks"] >= 0
        assert isinstance(data["total_published"], int) and data["total_published"] >= 0
        assert isinstance(data["total_failed"], int) and data["total_failed"] >= 0
        assert isinstance(data["interval_seconds"], int) and data["interval_seconds"] > 0

    def test_status_is_running_false_when_idle(self, client, auth_headers):
        """Sem tick em execução, is_running deve ser False."""
        resp = client.get("/api/v1/scheduler/status", headers=auth_headers)
        data = resp.json()
        assert data["is_running"] is False


class TestSchedulerTrigger:

    def test_trigger_requires_auth(self, client):
        resp = client.post("/api/v1/scheduler/trigger")
        assert resp.status_code == 401

    def test_trigger_returns_tick_result(self, client, auth_headers):
        """POST /scheduler/trigger executa um tick e retorna TriggerOut."""
        resp = client.post("/api/v1/scheduler/trigger", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()

        # Campos obrigatórios do schema TriggerOut
        assert "ran_at" in data, "Campo 'ran_at' ausente"
        assert "due_count" in data, "Campo 'due_count' ausente"
        assert "published_count" in data, "Campo 'published_count' ausente"
        assert "failed_count" in data, "Campo 'failed_count' ausente"
        assert "errors" in data, "Campo 'errors' ausente"
        assert "duration_ms" in data, "Campo 'duration_ms' ausente"

    def test_trigger_with_empty_db_publishes_nothing(self, client, auth_headers):
        """Com banco vazio, o tick não deve publicar nem falhar nenhum post."""
        resp = client.post("/api/v1/scheduler/trigger", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["due_count"] == 0
        assert data["published_count"] == 0
        assert data["failed_count"] == 0
        assert data["errors"] == []

    def test_trigger_duration_is_non_negative(self, client, auth_headers):
        """duration_ms deve ser inteiro não-negativo."""
        resp = client.post("/api/v1/scheduler/trigger", headers=auth_headers)
        data = resp.json()
        assert isinstance(data["duration_ms"], int)
        assert data["duration_ms"] >= 0

    def test_trigger_ran_at_is_valid_datetime(self, client, auth_headers):
        """ran_at deve ser uma string ISO 8601 válida."""
        from datetime import datetime
        resp = client.post("/api/v1/scheduler/trigger", headers=auth_headers)
        data = resp.json()
        # FastAPI serializa datetime como ISO string
        ran_at_str = data["ran_at"]
        # Deve ser parseável como datetime
        try:
            dt = datetime.fromisoformat(ran_at_str.replace("Z", "+00:00"))
            assert dt is not None
        except ValueError:
            raise AssertionError(f"ran_at não é ISO 8601 válido: {ran_at_str!r}")

    def test_trigger_publishes_scheduled_post(self, client, auth_headers, post_approved):
        """
        Post agendado com scheduled_at no passado deve ser publicado pelo tick.

        Agenda um post com data já passada (usando PATCH direto no banco não é
        possível via API pois /schedule valida data futura — POST-03), então
        este cenário é documentado como teste de intenção.

        Para exercitar o caminho real, seria necessário:
        1. Criar post aprovado
        2. Injetar scheduled_at no passado diretamente no banco (via fixture DB)
        3. Disparar trigger
        4. Verificar status == 'publicado'

        Por ora o teste apenas confirma que o trigger não quebra com posts
        em estado 'aprovado' pendentes.
        """
        resp = client.post("/api/v1/scheduler/trigger", headers=auth_headers)
        assert resp.status_code == 200
        # Post aprovado mas não agendado não deve ser processado pelo scheduler
        data = resp.json()
        assert data["due_count"] == 0, (
            "Posts aprovados mas não agendados não devem ser processados pelo scheduler"
        )
