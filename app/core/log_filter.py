"""
SensitiveDataFilter — filtro de logging para mascarar dados sensíveis.

Instalado no logger raiz em main.py via _init_logging().
Intercepta TODOS os registros de log antes de serem escritos em qualquer handler.

Padrões mascarados:
  - JWT   (eyJ...header.payload.signature)
  - Bearer tokens (Authorization: Bearer xxxx)
  - Pares chave=valor sensíveis (password=, token=, secret=, key=, …)
  - Strings de conexão com senha (postgresql://user:PASS@host)
  - Tokens Meta longos (dígitos ou alnum com 40+ caracteres)
"""

from __future__ import annotations

import logging
import re


# ── Padrões de redação ────────────────────────────────────────────────────────
#
# Cada entrada: (pattern compilado, substituto)
# Ordem importa: JWT e Bearer primeiro (mais específicos),
# key=value depois, URL por último.

_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # 1. Strings de conexão com senha: schema://user:SENHA@host
    #    Deve vir primeiro para mascarar a URL completa antes dos outros padrões
    (
        re.compile(
            r"((?:postgresql|postgres|mysql|redis|mongodb)://[^:@\s]+:)[^@\s]+(@)",
            re.IGNORECASE,
        ),
        r"\1***\2",
    ),
    # 2. Bearer token em cabeçalho HTTP (inclui JWTs e tokens opacos)
    #    Antes do padrão key=value para preservar o prefixo "Bearer"
    (
        re.compile(r"(?i)(Bearer\s+)\S+"),
        r"\1***",
    ),
    # 3. JWT standalone — três segmentos base64url separados por ponto
    (
        re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"),
        "***JWT***",
    ),
    # 4. Pares chave=valor ou chave: valor sensíveis
    #    Cobre: password, passwd, secret, token, api_key, access_token,
    #           auth_token, private_key, apikey
    #    NÃO inclui "authorization" — já tratado pelo padrão Bearer acima
    (
        re.compile(
            r"\b(password|passwd|secret(?:_key)?|client_secret|token|api_key|apikey"
            r"|access_token|refresh_token|auth_token|private_key"
            r"|anthropic_api_key|meta_app_secret|meta_access_token)\s*[=:]\s*\S+",
            re.IGNORECASE,
        ),
        r"\1=***",
    ),
    # 5. Logs estruturados JSON/dict: "key": "value" ou 'key': 'value'
    #    Cobre saídas de json.dumps(), repr(dict), logging com extra={}
    (
        re.compile(
            r"""(['"](password|passwd|secret(?:_key)?|client_secret|token|api_key|apikey"""
            r"""|access_token|refresh_token|auth_token|private_key"""
            r"""|anthropic_api_key|meta_app_secret|meta_access_token)['"]\s*:\s*)(['"])[^'"]+\3""",
            re.IGNORECASE,
        ),
        r'\1\3***\3',
    ),
    # 6. Tokens opacos longos (≥ 40 chars alfanuméricos) isolados por espaços/aspas
    #    Ex: Meta Page Access Tokens, Stripe keys
    (
        re.compile(r"""(?<=['"\s])[A-Za-z0-9]{40,}(?=['"\s]|$)"""),
        "***TOKEN***",
    ),
]


def _redact(text: str) -> str:
    """Aplica todos os padrões de redação em sequência."""
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text



class SensitiveDataFilter(logging.Filter):
    """
    Filtro de logging que mascara dados sensíveis em mensagens e argumentos
    ANTES de o handler formatar e gravar o registro.

    Instalação (uma vez, no logger raiz):
        logging.getLogger().addFilter(SensitiveDataFilter())

    Não altera o nível de log nem a estrutura dos registros — apenas redact.
    Compatível com uvicorn, gunicorn e qualquer handler de terceiros.
    """

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        # Obtém a mensagem completamente interpolada (msg % args) antes de redact.
        # Se modificarmos record.msg ANTES da interpolação, o logging tenta fazer
        # "msg % args" com os %s já removidos → TypeError. Por isso chamamos
        # getMessage() aqui, aplicamos redact no resultado e zeramos record.args.
        try:
            full_msg = record.getMessage()
        except Exception:
            full_msg = str(record.msg)

        record.msg = _redact(full_msg)
        record.args = None  # já interpolado; evita segundo ciclo de formatação

        return True  # sempre deixa o registro passar — apenas sanitiza


# ── Utilitário público ────────────────────────────────────────────────────────

def install(logger: logging.Logger | None = None) -> None:
    """
    Instala o SensitiveDataFilter no logger fornecido (padrão: logger raiz).

    Uso em main.py:
        from app.core.log_filter import install as install_log_filter
        install_log_filter()
    """
    target = logger or logging.getLogger()
    # Evita instalar duas vezes (ex: reload em dev)
    for f in target.filters:
        if isinstance(f, SensitiveDataFilter):
            return
    target.addFilter(SensitiveDataFilter())
