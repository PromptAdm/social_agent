#!/usr/bin/env python3
"""
Better Stack Uptime Monitoring — Setup Script
Provisions all monitors, heartbeat, and status page via the Better Stack API.
Config defined in: scripts/betterstack_monitors.yaml

Usage:
    export BETTERSTACK_API_TOKEN=your_token_here
    export BACKEND_URL=https://social-agent-api.onrender.com   # optional override
    export FRONTEND_URL=https://nezora.vercel.app              # optional override
    python scripts/setup_betterstack.py

Get your API token at: https://betterstack.com/users/api-tokens
"""

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any

# ── Config ────────────────────────────────────────────────────────────────────

API_BASE     = "https://uptime.betterstack.com/api/v2"
TOKEN        = os.environ.get("BETTERSTACK_API_TOKEN", "")
BACKEND_URL  = os.environ.get("BACKEND_URL",  "https://social-agent-api.onrender.com").rstrip("/")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://nezora.vercel.app").rstrip("/")


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _request(method: str, path: str, data: dict | None = None) -> dict:
    url     = f"{API_BASE}{path}"
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    body    = json.dumps(data).encode() if data is not None else None
    req     = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        print(f"    HTTP {exc.code} — {detail}")
        raise


def _get_all(path: str) -> list[dict]:
    """Fetch all pages for a paginated endpoint."""
    results, page = [], 1
    while True:
        resp  = _request("GET", f"{path}?per_page=50&page={page}")
        items = resp.get("data", [])
        results.extend(items)
        if len(items) < 50:
            break
        page += 1
    return results


# ── Monitor helpers ───────────────────────────────────────────────────────────

def _existing_monitors() -> dict[str, dict]:
    """Returns {pronounceable_name: monitor_object}."""
    return {m["attributes"]["pronounceable_name"]: m for m in _get_all("/monitors")}


def _upsert_monitor(payload: dict, existing: dict) -> dict:
    name = payload["pronounceable_name"]
    if name in existing:
        print(f"  ✓  {name}")
        return existing[name]
    print(f"  +  {name}")
    return _request("POST", "/monitors", payload)["data"]


# ── Monitor definitions ───────────────────────────────────────────────────────

def _http_monitor(
    name: str,
    url: str,
    *,
    method: str = "GET",
    frequency: int = 180,
    timeout: int = 30,
    status_codes: list[int] | None = None,
    keyword: str = "",
    body: str = "",
    headers: list[dict] | None = None,
    regions: list[str] | None = None,
    ssl: bool = True,
    ssl_days: int = 30,
    recovery: int = 180,
) -> dict:
    payload: dict[str, Any] = {
        "pronounceable_name":  name,
        "url":                 url,
        "monitor_type":        "status",
        "http_method":         method,
        "check_frequency":     frequency,
        "request_timeout":     timeout,
        "expected_status_codes": status_codes or [200],
        "recovery_period":     recovery,
        "regions":             regions or ["us", "eu", "as"],
        "verify_ssl":          ssl,
        "ssl_expiration":      ssl_days,
        "follow_redirects":    True,
        "paused":              False,
    }
    if keyword:
        payload["required_keyword"] = keyword
    if body:
        payload["request_body"] = body
    if headers:
        payload["request_headers"] = headers
    return payload


def _heartbeat_monitor(name: str, period: int = 3, grace: int = 2) -> dict:
    return {
        "pronounceable_name": name,
        "monitor_type":       "heartbeat",
        "period":             period,
        "grace":              grace,
        "paused":             False,
    }


# ── Status page helpers ───────────────────────────────────────────────────────

def _upsert_status_page(subdomain: str, company: str, website: str) -> str:
    """Returns the status page id."""
    pages     = {p["attributes"]["subdomain"]: p for p in _get_all("/status-pages")}
    if subdomain in pages:
        page_id = pages[subdomain]["id"]
        print(f"  ✓  Status page: https://{subdomain}.betteruptime.com")
    else:
        print(f"  +  Status page: https://{subdomain}.betteruptime.com")
        resp    = _request("POST", "/status-pages", {
            "subdomain":      subdomain,
            "company_name":   company,
            "company_website": website,
            "timezone":       "UTC",
        })
        page_id = resp["data"]["id"]
    return page_id


def _add_monitors_to_page(page_id: str, monitor_ids: list[str]) -> None:
    existing_resources = _get_all(f"/status-pages/{page_id}/resources")
    existing_ids = {
        r["relationships"]["monitor"]["data"]["id"]
        for r in existing_resources
        if r.get("relationships", {}).get("monitor", {}).get("data")
    }
    for mid in monitor_ids:
        if mid in existing_ids:
            continue
        _request("POST", f"/status-pages/{page_id}/resources", {"monitor_id": mid})


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    if not TOKEN:
        print("Error: BETTERSTACK_API_TOKEN is not set.")
        print("  Get your token: https://betterstack.com/users/api-tokens")
        print("  Then: export BETTERSTACK_API_TOKEN=your_token")
        sys.exit(1)

    print(f"\nBetter Stack Setup — Nezora / Social Agent")
    print(f"  Backend:  {BACKEND_URL}")
    print(f"  Frontend: {FRONTEND_URL}\n")

    existing   = _existing_monitors()
    monitor_ids: list[str] = []

    # ── HTTP monitors ─────────────────────────────────────────────────────────

    print("HTTP monitors:")
    http_monitors = [
        _http_monitor(
            "Frontend — Nezora",
            FRONTEND_URL,
            frequency=180,
            regions=["us", "eu", "as"],
        ),
        _http_monitor(
            "Backend — Health",
            f"{BACKEND_URL}/health",
            frequency=60,
            keyword='"status":"ok"',
            regions=["us", "eu", "as"],
            recovery=60,
        ),
        _http_monitor(
            "Backend — Deep Health (DB)",
            f"{BACKEND_URL}/health/deep",
            frequency=300,
            keyword='"db":"ok"',
            regions=["us", "eu"],
            recovery=180,
        ),
        _http_monitor(
            "API — Auth Login",
            f"{BACKEND_URL}/api/v1/auth/login",
            method="POST",
            headers=[{"name": "Content-Type", "value": "application/json"}],
            body='{"email":"uptime-probe@internal.dev","password":"probe"}',
            frequency=300,
            status_codes=[401, 422],   # auth error = server is UP
            regions=["us", "eu"],
            ssl_days=30,
        ),
        _http_monitor(
            "API — Publishing Scheduled",
            f"{BACKEND_URL}/api/v1/publishing/scheduled",
            frequency=300,
            status_codes=[401, 403],   # auth required = server is UP
            regions=["us", "eu"],
        ),
    ]

    for payload in http_monitors:
        monitor = _upsert_monitor(payload, existing)
        monitor_ids.append(monitor["id"])

    # ── Heartbeat monitor ─────────────────────────────────────────────────────

    print("\nHeartbeat monitor:")
    hb_payload = _heartbeat_monitor("Scheduler — Heartbeat", period=3, grace=2)
    hb_monitor = _upsert_monitor(hb_payload, existing)
    hb_id      = hb_monitor["id"]
    hb_url     = hb_monitor.get("attributes", {}).get("url", "")
    monitor_ids.append(hb_id)

    # ── Status page ───────────────────────────────────────────────────────────

    print("\nStatus page:")
    page_id = _upsert_status_page("nezora-status", "Nezora", FRONTEND_URL)
    _add_monitors_to_page(page_id, monitor_ids)

    # ── Summary ───────────────────────────────────────────────────────────────

    print("\n" + "─" * 60)
    print("✅  Setup complete!\n")

    if hb_url:
        print(f"IMPORTANT — set this in your backend environment:")
        print(f"  BETTERSTACK_HEARTBEAT_URL={hb_url}\n")
        print("  Railway:  Project → Variables → add BETTERSTACK_HEARTBEAT_URL")
        print("  Render:   Dashboard → Environment → add BETTERSTACK_HEARTBEAT_URL\n")

    print("Next steps:")
    print("  1. Set BETTERSTACK_HEARTBEAT_URL in the backend (see above)")
    print("  2. Configure alert recipients:")
    print("     https://betterstack.com/team/on-call")
    print("  3. Set up email / Slack / webhook alerts:")
    print("     https://betterstack.com/team/alerts")
    print(f"  4. View status page:")
    print(f"     https://nezora-status.betteruptime.com")
    print(f"  5. View monitoring dashboard:")
    print(f"     https://betterstack.com/uptime")


if __name__ == "__main__":
    main()
