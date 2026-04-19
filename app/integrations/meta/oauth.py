"""
Meta (Facebook / Instagram) OAuth 2.0 — Facebook Login flow.

Permissions requested:
    instagram_basic                 — read IG profile and media
    instagram_content_publish       — publish to IG
    instagram_manage_comments       — read/reply to IG comments
    pages_show_list                 — enumerate FB pages the user manages
    pages_manage_posts              — publish to FB pages
    pages_read_engagement           — read page engagement metrics

Token lifecycle:
    1. User authorises → short-lived user token (~1 h)
    2. Exchange for long-lived user token (60 days)
    3. From user token, fetch Page access tokens (never expire while app permissions held)

The Page access token is what we store and use for publishing to both Instagram
(via the IG Business Account linked to the page) and Facebook.
"""

import json
import urllib.error
import urllib.parse
import urllib.request

_GRAPH = "https://graph.facebook.com"
_API_VERSION = "v21.0"
_BASE = f"{_GRAPH}/{_API_VERSION}"

SCOPES = ",".join([
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "pages_show_list",
    "pages_manage_posts",
    "pages_read_engagement",
])


# ── Auth URL ──────────────────────────────────────────────────────────────────

def build_auth_url(app_id: str, redirect_uri: str, state: str) -> str:
    params = {
        "client_id":     app_id,
        "redirect_uri":  redirect_uri,
        "scope":         SCOPES,
        "response_type": "code",
        "state":         state,
    }
    return f"https://www.facebook.com/{_API_VERSION}/dialog/oauth?" + urllib.parse.urlencode(params)


# ── Token exchange helpers ────────────────────────────────────────────────────

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


def exchange_code_for_short_lived_token(
    code: str,
    app_id: str,
    app_secret: str,
    redirect_uri: str,
) -> dict:
    """Exchange authorization code for a short-lived user access token."""
    return _graph_get("oauth/access_token", {
        "client_id":     app_id,
        "client_secret": app_secret,
        "redirect_uri":  redirect_uri,
        "code":          code,
    })


def exchange_for_long_lived_token(
    short_lived_token: str,
    app_id: str,
    app_secret: str,
) -> dict:
    """Exchange a short-lived user token for a long-lived user token (60 days)."""
    return _graph_get("oauth/access_token", {
        "grant_type":        "fb_exchange_token",
        "client_id":         app_id,
        "client_secret":     app_secret,
        "fb_exchange_token": short_lived_token,
    })


# ── Account discovery ─────────────────────────────────────────────────────────

def get_user_info(user_token: str) -> dict:
    """Fetch the authenticated user's profile (id, name, picture)."""
    return _graph_get("me", {
        "access_token": user_token,
        "fields":       "id,name,picture",
    })


def get_user_pages(user_token: str) -> list[dict]:
    """
    List Facebook Pages the user manages.

    Each page dict contains:
        id, name, access_token (page-scoped, non-expiring), tasks, picture
    """
    data = _graph_get("me/accounts", {
        "access_token": user_token,
        "fields":       "id,name,access_token,tasks,picture",
    })
    return data.get("data", [])


def get_instagram_account_for_page(page_id: str, page_token: str) -> dict | None:
    """
    Return the Instagram Professional Account linked to a Facebook Page.

    Returns None if no IG account is linked.
    Response dict contains: id, name, username, profile_picture_url, followers_count
    """
    data = _graph_get(page_id, {
        "access_token": page_token,
        "fields":       "instagram_business_account{id,name,username,profile_picture_url,followers_count}",
    })
    return data.get("instagram_business_account")
