"""
Meta OAuth 2.0 — Facebook Login + Instagram Basic.

Permissões (modo desenvolvimento — sem review obrigatório):
    public_profile, email, pages_show_list, pages_read_engagement, instagram_basic

Fluxo:
    1. Usuário autoriza → code
    2. GET /oauth/access_token → access_token (user token)
    3. GET /me/accounts → lista de Pages (com instagram_business_account se vinculado)
    4. Salvar na tabela social_connections
"""

import json
import urllib.error
import urllib.parse
import urllib.request

_GRAPH       = "https://graph.facebook.com"
_API_VERSION = "v21.0"
_BASE        = f"{_GRAPH}/{_API_VERSION}"

# Permissões básicas — compatíveis com app em modo desenvolvimento
SCOPES = "public_profile,email,pages_show_list,pages_read_engagement,instagram_basic"


# ── Auth URL ──────────────────────────────────────────────────────────────────

def build_auth_url(app_id: str, redirect_uri: str, state: str) -> str:
    """Retorna a URL do diálogo OAuth do Facebook."""
    params = {
        "client_id":     app_id,
        "redirect_uri":  redirect_uri,
        "scope":         SCOPES,
        "response_type": "code",
        "state":         state,
    }
    return (
        f"https://www.facebook.com/{_API_VERSION}/dialog/oauth?"
        + urllib.parse.urlencode(params)
    )


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _graph_get(path: str, params: dict) -> dict:
    """GET para Graph API — lança RuntimeError em caso de erro HTTP."""
    url = f"{_BASE}/{path}?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            detail = json.loads(body).get("error", {}).get("message", body.decode())
        except Exception:
            detail = body.decode()
        raise RuntimeError(f"Meta API error ({exc.code}): {detail}") from exc


def _graph_post(path: str, params: dict) -> dict:
    """POST para Graph API — lança RuntimeError em caso de erro HTTP."""
    url   = f"{_BASE}/{path}"
    data  = urllib.parse.urlencode(params).encode()
    req   = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            detail = json.loads(body).get("error", {}).get("message", body.decode())
        except Exception:
            detail = body.decode()
        raise RuntimeError(f"Meta API error ({exc.code}): {detail}") from exc


# ── Token exchange ────────────────────────────────────────────────────────────

def exchange_code_for_token(
    code: str,
    app_id: str,
    app_secret: str,
    redirect_uri: str,
) -> dict:
    """
    Troca o authorization code por um user access token.

    Retorna dict com: access_token, token_type, (opcionalmente expires_in)
    """
    return _graph_get("oauth/access_token", {
        "client_id":     app_id,
        "client_secret": app_secret,
        "redirect_uri":  redirect_uri,
        "code":          code,
    })


# ── Account discovery ─────────────────────────────────────────────────────────

def get_user_pages(user_token: str) -> list[dict]:
    """
    Lista as Facebook Pages que o usuário administra.

    Inclui o campo instagram_business_account quando a Page tiver
    uma conta Instagram Business/Creator vinculada.

    Cada item retornado: { id, name, instagram_business_account?: { id } }
    """
    data = _graph_get("me/accounts", {
        "access_token": user_token,
        "fields":       "id,name,instagram_business_account",
    })
    return data.get("data", [])


def get_user_info(user_token: str) -> dict:
    """Perfil básico do usuário autenticado (id, name)."""
    return _graph_get("me", {
        "access_token": user_token,
        "fields":       "id,name",
    })


# ── Kept for backward compat (twitter router imports nothing from here) ────────

def exchange_code_for_short_lived_token(
    code: str,
    app_id: str,
    app_secret: str,
    redirect_uri: str,
) -> dict:
    """Alias para exchange_code_for_token — mantido para compat com código legado."""
    return exchange_code_for_token(code, app_id, app_secret, redirect_uri)


def exchange_for_long_lived_token(
    short_lived_token: str,
    app_id: str,
    app_secret: str,
) -> dict:
    """Troca token de curta duração por token de longa duração (~60 dias)."""
    return _graph_get("oauth/access_token", {
        "grant_type":        "fb_exchange_token",
        "client_id":         app_id,
        "client_secret":     app_secret,
        "fb_exchange_token": short_lived_token,
    })
