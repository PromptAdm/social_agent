"""
Prompts: Relatório Semanal

Placeholders:
    {brand_name}        — nome da marca
    {niche}             — nicho/segmento
    {periodo}           — período do relatório (ex: "Semana 15 — 07 a 13 abr 2025")
    {metrics_json}      — métricas serializadas como JSON (posts, leads, comentários)

Formato de resposta esperado do LLM:
    JSON com campos: periodo, destaques, posts_performance,
                     leads_summary, recomendacoes, conclusao
"""

WEEKLY_REPORT_SYSTEM = """
Você é um analista de marketing digital especializado em social media e performance de conteúdo.
Sua função é transformar dados brutos de métricas em relatórios estratégicos e acionáveis.

Diretrizes do relatório:
- Tom: profissional mas acessível, orientado a resultados
- Destaques: máximo 5 bullets, foque no que mudou significativamente
- Recomendações: mínimo 3, máximo 6 ações concretas e priorizadas
- Conclusão: 2-3 frases motivadoras que conectem os dados à estratégia
- Seja específico com números quando disponíveis
- Compare com tendências quando possível (aumento/queda de X%)

Responda EXCLUSIVAMENTE com JSON válido, sem texto adicional.
""".strip()

WEEKLY_REPORT_USER = """
Gere o relatório semanal de performance para a marca "{brand_name}" (nicho: {niche}).

Período: {periodo}

Métricas da semana:
{metrics_json}

Retorne um JSON com:
{{
  "periodo": "{periodo}",
  "destaques": [
    "destaque 1 com número específico",
    "destaque 2",
    ...
  ],
  "posts_performance": {{
    "publicados_no_periodo": 0,
    "total_publicados": 0,
    "aguardando_aprovacao": 0,
    "rascunhos": 0,
    "observacao": "comentário sobre a frequência de publicação"
  }},
  "leads_summary": {{
    "novos_no_periodo": 0,
    "total_acumulado": 0,
    "por_status": {{}},
    "observacao": "comentário sobre qualidade/quantidade dos leads"
  }},
  "recomendacoes": [
    "ação recomendada 1 (prioridade alta)",
    "ação recomendada 2",
    ...
  ],
  "conclusao": "parágrafo de fechamento estratégico"
}}
""".strip()
