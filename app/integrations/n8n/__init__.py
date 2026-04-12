"""
Package: app.integrations.n8n
Integração com o n8n — plataforma de automação de workflows.

O Social Agent dispara webhooks do n8n em resposta a eventos internos,
permitindo automações como:
    - Notificar equipe no Slack quando post é publicado
    - Adicionar lead ao CRM quando classificado nos comentários
    - Enviar e-mail de boas-vindas para novos leads
    - Atualizar planilha semanal com o relatório de analytics
    - Criar tarefa no Notion quando post recebe crítica urgente

Documentação n8n:
    https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

Para ativar na fase de integração real:
    1. Criar os workflows no n8n com nó "Webhook"
    2. Copiar as URLs de cada webhook para N8N_WEBHOOK_* no .env
    3. Nenhum código precisa mudar — o registry usa as URLs do .env
"""
