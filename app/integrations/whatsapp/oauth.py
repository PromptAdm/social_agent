"""
WhatsApp Business Cloud API — Phase 2 OAuth skeleton.

WhatsApp Cloud API uses Meta's OAuth infrastructure with additional scopes.
Unlike Instagram/Facebook (which use Page access tokens), WhatsApp requires:

    1. A Meta Business Account
    2. A WhatsApp Business Account (WABA) registered via Meta Business Manager
    3. A permanent System User token with whatsapp_business_messaging scope

Setup options:
    A. Embedded Signup (recommended for SaaS) — uses Meta's JS SDK in frontend
    B. Manual setup — admin registers WABA + System User in Business Manager

For Phase 2, this module provides:
    - Auth URL builder (Meta OAuth with WhatsApp scopes)
    - Token exchange helpers (reused from meta.oauth)
    - WABA/phone number discovery helpers

NOTE: This module is NOT wired to the OAuth router yet.
Set WHATSAPP_ENABLED=true in .env when ready to expose to users.
"""

import json
import urllib.error
import urllib.parse
import urllib.request

_GRAPH   = "https://graph.facebook.com"
_VERSION = "v21.0"
_BASE    = f"{_GRAPH}/{_VERSION}"

SCOPES = ",".join([
    "whatsapp_business_messaging",
    "whatsapp_business_management",
])


# ── Auth URL ──────────────────────────────────────────────────────────────────

def build_auth_url(app_id: str, redirect_uri: str, state: str) -> str:
    """Build a Meta OAuth URL requesting WhatsApp Business scopes."""
    params = {
        "client_id":     app_id,
        "redirect_uri":  redirect_uri,
        "scope":         SCOPES,
        "response_type": "code",
        "state":         state,
    }
    return f"https://www.facebook.com/{_VERSION}/dialog/oauth?" + urllib.parse.urlencode(params)


# ── WABA discovery ────────────────────────────────────────────────────────────

def _graph_get(path: str, params: dict) -> dict:
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


def get_waba_accounts(user_token: str) -> list[dict]:
    """
    List WhatsApp Business Accounts (WABAs) accessible with the given token.

    Returns list of dicts: id, name, currency, timezone_id, message_template_namespace
    """
    data = _graph_get("me/businesses", {
        "access_token": user_token,
        "fields":       "id,name,whatsapp_business_accounts{id,name,currency,timezone_id}",
    })
    businesses = data.get("data", [])
    accounts: list[dict] = []
    for biz in businesses:
        for waba in biz.get("whatsapp_business_accounts", {}).get("data", []):
            accounts.append({**waba, "business_id": biz["id"], "business_name": biz["name"]})
    return accounts


def get_phone_numbers(waba_id: str, user_token: str) -> list[dict]:
    """
    List phone numbers registered under a WhatsApp Business Account.

    Returns list of dicts: id, display_phone_number, verified_name, quality_rating
    """
    data = _graph_get(f"{waba_id}/phone_numbers", {
        "access_token": user_token,
        "fields":       "id,display_phone_number,verified_name,quality_rating",
    })
    return data.get("data", [])
