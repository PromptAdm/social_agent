"""
Catálogo de pacotes de créditos avulsos.

Créditos são consumidos quando o usuário esgota o limite mensal do seu plano
ou para operações de IA (geração de imagens, transcrição de vídeo).

Packages:
    credits_100  — 100 créditos  — R$19
    credits_500  — 500 créditos  — R$79
    credits_1000 — 1000 créditos — R$129
"""

from __future__ import annotations

CREDIT_PACKAGES: dict[str, dict] = {
    "credits_100": {
        "amount":         100,
        "price_brl_cents": 1900,
        "label":          "100 créditos",
        "badge":          None,
    },
    "credits_500": {
        "amount":         500,
        "price_brl_cents": 7900,
        "label":          "500 créditos",
        "badge":          "Mais popular",
    },
    "credits_1000": {
        "amount":         1000,
        "price_brl_cents": 12900,
        "label":          "1.000 créditos",
        "badge":          "Melhor valor",
    },
}


def get_package(code: str) -> dict:
    """Returns the package dict or raises KeyError."""
    pkg = CREDIT_PACKAGES.get(code)
    if pkg is None:
        raise KeyError(f"Credit package not found: {code!r}")
    return pkg


def list_packages() -> list[dict]:
    return [{"code": code, **pkg} for code, pkg in CREDIT_PACKAGES.items()]
