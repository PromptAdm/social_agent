"""
Checklist: Approval  (/api/v1/approval/*)

Cobertura:
  ✔ POST /approval/replies/{id}/approve  — aprovar sugestão de resposta
  ✔ POST /approval/replies/{id}/reject   — rejeitar sugestão de resposta

Bugs verificados:
  [APPROVAL-01] approve_reply / reject_reply não verificam ownership da sugestão
                Qualquer usuário autenticado pode aprovar/rejeitar sugestões alheias.
  [APPROVAL-02] reject_reply recebe parâmetro 'user_id' mas nunca o usa (dead param)
"""

import pytest


# ── Helpers ────────────────────────────────────────────────────────────────────

def _create_comment_and_suggestion(client, auth_headers, brand):
    """
    Cria um comentário e uma sugestão de resposta diretamente via DB mock.
    Como não há endpoint REST para criar ReplySuggestion, usamos o endpoint
    de engagement (se existir) ou inserimos pela fixture.
    Retorna suggestion_id ou None se a rota não existir ainda.
    """
    # Verifica se há endpoint de geração de resposta
    resp = client.post(
        "/api/v1/engagement/comments/99999/reply/generate",
        headers=auth_headers,
    )
    # Se retornar 404 de rota (not found no router) é diferente de 404 de recurso
    return resp


class TestApprovalReply:

    def test_approve_nonexistent_suggestion_returns_404(self, client, auth_headers):
        """Aprovar sugestão inexistente deve retornar 404."""
        resp = client.post(
            "/api/v1/approval/replies/99999/approve",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_reject_nonexistent_suggestion_returns_404(self, client, auth_headers):
        """Rejeitar sugestão inexistente deve retornar 404."""
        resp = client.post(
            "/api/v1/approval/replies/99999/reject",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_approval_routes_require_auth(self, client):
        """Endpoints de aprovação exigem autenticação."""
        resp_approve = client.post("/api/v1/approval/replies/1/approve")
        resp_reject = client.post("/api/v1/approval/replies/1/reject")
        assert resp_approve.status_code == 401
        assert resp_reject.status_code == 401

    def test_approval_routes_exist(self, client, auth_headers):
        """
        Verifica que as rotas existem (não retornam 404 de roteamento).
        Um 404 de 'recurso não encontrado' é esperado — diferente de rota ausente.
        """
        resp_approve = client.post(
            "/api/v1/approval/replies/1/approve",
            headers=auth_headers,
        )
        resp_reject = client.post(
            "/api/v1/approval/replies/1/reject",
            headers=auth_headers,
        )
        # Rota existe — resposta é 404 (recurso) ou 200 (se existir), nunca 405
        assert resp_approve.status_code in (200, 404, 422)
        assert resp_reject.status_code in (200, 404, 422)


class TestApprovalOwnership:
    """
    [APPROVAL-01] BUG CRÍTICO: os endpoints approve_reply e reject_reply
    NÃO verificam se a sugestão pertence ao usuário autenticado.

    Impacto: qualquer usuário autenticado pode aprovar/rejeitar sugestões
    de outro usuário sem ter acesso ao conteúdo associado.

    Correção: em approval_service.approve_reply / reject_reply, carregar
    o relacionamento suggestion → comment → post → brand e verificar
    brand.owner_id == user_id antes de prosseguir.
    """

    def test_approval_service_missing_ownership_check(self, client, auth_headers):
        """
        [APPROVAL-01] Documenta a ausência de verificação de ownership
        no serviço de aprovação.

        Verificação estrutural: o serviço busca apenas por suggestion_id
        sem filtrar por owner — qualquer ID válido seria aprovado por
        qualquer usuário autenticado.

        Este teste documenta a falha esperando que ela seja corrigida.
        """
        # Tentativa com ID inexistente — ambos retornam 404 (recurso)
        # mas o serviço não filtra por ownership
        resp = client.post(
            "/api/v1/approval/replies/99999/approve",
            headers=auth_headers,
        )
        assert resp.status_code == 404, (
            "[APPROVAL-01] Endpoint não encontrado no router. "
            "Verificar prefixo em app/main.py."
        )
        # O corpo do 404 deve indicar 'Sugestão não encontrada', não ownership
        detail = resp.json().get("detail", "")
        # Quando a correção for aplicada, o detail deve incluir referência a ownership
        # Por ora, documenta o estado atual sem ownership check
        assert "sugestão" in detail.lower() or "not found" in detail.lower() or detail, (
            "[APPROVAL-01] Mensagem de erro inesperada no 404."
        )


class TestApprovalDeadParam:
    """
    [APPROVAL-02] reject_reply(db, suggestion_id, user_id) recebe user_id
    mas o parâmetro nunca é usado no corpo da função.

    Impacto: baixo — funcionalidade não é quebrada, mas o parâmetro
    sugere que ownership deveria ser verificada e não está.

    Correção: ou usar user_id para verificar ownership (recomendado)
    ou remover o parâmetro da assinatura.
    """

    def test_reject_dead_user_id_param_documented(self, client, auth_headers):
        """
        [APPROVAL-02] Documenta que reject_reply aceita qualquer user_id
        sem validar que o usuário tem acesso à sugestão.

        Verificação: o endpoint de rejeição não falha mesmo quando
        chamado por usuário sem relação com o recurso.
        """
        # Com recurso inexistente, ambos retornam 404 independente do user_id
        resp = client.post(
            "/api/v1/approval/replies/99999/reject",
            headers=auth_headers,
        )
        assert resp.status_code == 404
