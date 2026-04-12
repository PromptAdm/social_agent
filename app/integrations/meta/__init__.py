"""
Package: app.integrations.meta
Integração com a Meta Graph API (Instagram e Facebook).

Documentação da API real:
    https://developers.facebook.com/docs/instagram-api/
    https://developers.facebook.com/docs/graph-api/

Endpoints usados na publicação (fase real):
    POST /{ig-user-id}/media              — Cria um container de mídia
    POST /{ig-user-id}/media_publish      — Publica o container criado
    GET  /{media-id}/insights             — Métricas de engajamento
    DELETE /{media-id}                    — Remove post publicado
"""
