"""
Meta Graph API — HTTP Client

Responsabilidade única: executar requisições HTTP contra a Meta Graph API
e converter respostas/erros no vocabulário da camada de integração.

Não conhece publicação, publishers ou domínio de posts — só HTTP.

Uso:
    client = MetaApiClient(access_token="EAAx...", version="v21.0")
    data = client.post("/17841400000000001/media", {"caption": "...", "image_url": "..."})
    result = client.post("/17841400000000001/media_publish", {"creation_id": data["id"]})
    details = client.get("/123456789", {"fields": "permalink,timestamp"})

Mapeamento de erros HTTP → exceções:
    4xx permanentes (400, 401, 403, 404) → IntegrationError        (não retenta)
    429 / 5xx transitórios              → RetryableIntegrationError (retenta)
    timeout / rede                      → RetryableIntegrationError (retenta)
"""

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from app.integrations.base import IntegrationError, RetryableIntegrationError

# Códigos HTTP que justificam uma nova tentativa
_RETRYABLE_CODES = frozenset({429, 500, 502, 503, 504})

# Timeout padrão para chamadas à Graph API (segundos)
_DEFAULT_TIMEOUT = 30


class MetaApiClient:
    """
    Cliente HTTP síncrono para a Meta Graph API.

    Usa apenas urllib.request (stdlib) — sem dependências extras.
    Sempre retorna dict com a resposta JSON já parseada.

    Lança:
        RetryableIntegrationError — para erros transitórios (429, 5xx, timeout)
        IntegrationError          — para erros permanentes (4xx exceto 429)
    """

    BASE = "https://graph.facebook.com"
    INTEGRATION = "meta_api"

    def __init__(
        self,
        access_token: str,
        version: str = "v21.0",
        timeout: int = _DEFAULT_TIMEOUT,
    ) -> None:
        self._token = access_token
        self._base = f"{self.BASE}/{version}"
        self._timeout = timeout

    # ── Métodos públicos ───────────────────────────────────────────────────────

    def post(self, path: str, params: dict[str, Any]) -> dict:
        """POST /{version}{path} com params como form-encoded body."""
        payload = dict(params)
        payload["access_token"] = self._token
        encoded = urllib.parse.urlencode(payload).encode()
        req = urllib.request.Request(
            f"{self._base}{path}",
            data=encoded,
            method="POST",
        )
        return self._execute(req)

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        """GET /{version}{path}?params&access_token=..."""
        qs = dict(params or {})
        qs["access_token"] = self._token
        url = f"{self._base}{path}?{urllib.parse.urlencode(qs)}"
        req = urllib.request.Request(url, method="GET")
        return self._execute(req)

    def delete(self, path: str) -> dict:
        """DELETE /{version}{path}?access_token=..."""
        url = f"{self._base}{path}?access_token={urllib.parse.quote(self._token)}"
        req = urllib.request.Request(url, method="DELETE")
        return self._execute(req)

    # ── HTTP executor ──────────────────────────────────────────────────────────

    def _execute(self, req: urllib.request.Request) -> dict:
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                body = resp.read()
                return json.loads(body)

        except urllib.error.HTTPError as exc:
            # Ler e parsear o corpo do erro da Meta Graph API
            try:
                err_body = json.loads(exc.read())
                meta_error = err_body.get("error", {})
                code = str(meta_error.get("code", exc.code))
                msg = meta_error.get("message", str(exc))
                fbtrace = meta_error.get("fbtrace_id", "")
                detail = f"Meta API {exc.code}: {msg} (fbtrace={fbtrace})"
            except Exception:
                code = str(exc.code)
                detail = f"Meta API {exc.code}: {exc.reason}"

            if exc.code in _RETRYABLE_CODES:
                raise RetryableIntegrationError(
                    message=detail,
                    integration=self.INTEGRATION,
                    event_type="api_call",
                    error_code=code,
                ) from exc

            raise IntegrationError(
                message=detail,
                integration=self.INTEGRATION,
                event_type="api_call",
                error_code=code,
            ) from exc

        except urllib.error.URLError as exc:
            # Erro de rede / DNS / timeout
            raise RetryableIntegrationError(
                message=f"Network error calling Meta API: {exc.reason}",
                integration=self.INTEGRATION,
                event_type="api_call",
                error_code="network_error",
            ) from exc

        except TimeoutError as exc:
            raise RetryableIntegrationError(
                message=f"Timeout calling Meta API (>{self._timeout}s)",
                integration=self.INTEGRATION,
                event_type="api_call",
                error_code="timeout",
            ) from exc
