"""
Package: app.integrations
Camada de integração com sistemas externos do Social Agent.

Subpacotes:
    meta/    — Meta Graph API (Instagram, Facebook)
    n8n/     — n8n workflow automation (webhooks outbound)

Módulos:
    schemas.py  — I/O schemas da camada de integração
    base.py     — Classes abstratas + RetryConfig + exceções
    registry.py — Factory para obter o publisher/client certo por plataforma

Princípio de design:
    Toda integração é simulada (mock) nesta fase.
    Para ativar uma integração real, basta criar o provider concreto,
    registrá-lo no registry.py e configurar as credenciais no .env.
    Nenhum outro arquivo precisa mudar.
"""
