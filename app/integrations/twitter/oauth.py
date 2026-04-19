"""
X (Twitter) OAuth 2.0 with PKCE (Proof Key for Code Exchange).

Scopes: tweet.read  tweet.write  users.read  offline.access

PKCE eliminates the need to expose the client_secret on public clients and
is required by the X API v2 OAuth 2.0 flow regardless.

Token storage:
    access_token  — expires in ~2 h (x-access-token-expires-in seconds)
    refresh_token — long-lived; use to obtain a new access token
"""

import base64
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request

AUTH_URL  = "https://twitter.com/i/oauth2/authorize"
TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
USER_URL  = "https://api.twitter.com/2/users/me"

SCOPES = "tweet.read tweet.write users.read offline.access"


# ── PKCE ──────────────────────────────────────────────────────────────────────

def generate_pkce_pair() -> tuple[str, str]:
    """
    Generate a (code_verifier, code_challenge) pair for PKCE.

    code_verifier  : 43–128 char random base64url string
    code_challenge : BASE64URL(SHA256(code_verifier)), method=S256
    """
    raw = os.urandom(64)
    code_verifier  = base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
    digest         = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


# ── Auth URL ──────────────────────────────────────────────────────────────────

def build_auth_url(
    client_id:      str,
    redirect_uri:   str,
    state:          str,
    code_challenge: str,
) -> str:
    params = {
        "response_type":         "code",
        "client_id":             client_id,
        "redirect_uri":          redirect_uri,
        "scope":                 SCOPES,
        "state":                 state,
        "code_challenge":        code_challenge,
        "code_challenge_method": "S256",
    }
    return AUTH_URL + "?" + urllib.parse.urlencode(params)


# ── Token exchange ────────────────────────────────────────────────────────────

def _basic_auth(client_id: str, client_secret: str) -> str:
    credentials = f"{client_id}:{client_secret}"
    return "Basic " + base64.b64encode(credentials.encode()).decode()


def _post_token(body: dict, client_id: str, client_secret: str) -> dict:
    encoded = urllib.parse.urlencode(body).encode()
    req = urllib.request.Request(
        TOKEN_URL,
        data=encoded,
        headers={
            "Content-Type":  "application/x-www-form-urlencoded",
            "Authorization": _basic_auth(client_id, client_secret),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body_bytes = exc.read()
        try:
            detail = json.loads(body_bytes).get("error_description", body_bytes.decode())
        except Exception:
            detail = body_bytes.decode()
        raise RuntimeError(f"Twitter token error ({exc.code}): {detail}") from exc


def exchange_code_for_token(
    code:          str,
    code_verifier: str,
    client_id:     str,
    client_secret: str,
    redirect_uri:  str,
) -> dict:
    """Exchange authorisation code + PKCE verifier for access/refresh tokens."""
    return _post_token({
        "grant_type":    "authorization_code",
        "code":          code,
        "redirect_uri":  redirect_uri,
        "code_verifier": code_verifier,
        "client_id":     client_id,
    }, client_id, client_secret)


def refresh_access_token(
    refresh_token: str,
    client_id:     str,
    client_secret: str,
) -> dict:
    """Obtain a new access token using a valid refresh token."""
    return _post_token({
        "grant_type":    "refresh_token",
        "refresh_token": refresh_token,
        "client_id":     client_id,
    }, client_id, client_secret)


# ── User info ─────────────────────────────────────────────────────────────────

def get_user_info(access_token: str) -> dict:
    """Fetch the authenticated user's profile (id, name, username, profile_image_url)."""
    params = {"user.fields": "id,name,username,profile_image_url"}
    req = urllib.request.Request(
        USER_URL + "?" + urllib.parse.urlencode(params),
        headers={"Authorization": f"Bearer {access_token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        return data.get("data", {})
    except urllib.error.HTTPError as exc:
        body_bytes = exc.read()
        try:
            detail = json.loads(body_bytes).get("detail", body_bytes.decode())
        except Exception:
            detail = body_bytes.decode()
        raise RuntimeError(f"Twitter user info error ({exc.code}): {detail}") from exc
