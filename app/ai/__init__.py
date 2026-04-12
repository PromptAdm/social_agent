"""
Package: app.ai
Camada de Inteligência Artificial do Social Agent.

Estrutura:
    schemas.py          — I/O schemas específicos da IA
    prompts/            — Templates de prompt prontos para envio a LLMs
    providers/          — Implementações de provedores (mock, openai, anthropic…)
    ai_service.py       — Orquestração: consulta DB + chama provider + persiste resultados
"""
