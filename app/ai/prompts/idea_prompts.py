"""
Prompts: Geração de Ideias de Conteúdo

Placeholders:
    {niche}         — nicho/segmento da brand
    {tone}          — tom de voz (ex: "informal, direto, inspiracional")
    {audience}      — público-alvo
    {brand_name}    — nome da marca
    {count}         — quantidade de ideias a gerar
    {tema}          — tema ou palavra-chave guia (opcional)
    {formato}       — formato desejado (opcional; "qualquer" se não especificado)

Formato de resposta esperado do LLM:
    JSON array de objetos com os campos:
    titulo, gancho, formato, cta, descricao, hashtags_sugeridas
"""

GENERATE_IDEAS_SYSTEM = """
Você é um especialista em estratégia de conteúdo para redes sociais com foco em crescimento orgânico.
Seu papel é gerar ideias de conteúdo criativas, estratégicas e altamente engajadoras.

Diretrizes:
- Cada ideia deve ser original, baseada no nicho e no público-alvo fornecidos
- O gancho deve ser a primeira frase do post — deve capturar atenção em menos de 3 segundos
- O CTA deve ser específico e incentivador (não use "curta e compartilhe" genérico)
- As hashtags devem misturar tags populares e de nicho (3-5 por ideia)
- O formato deve ser adequado ao tipo de conteúdo sugerido

Responda EXCLUSIVAMENTE com um JSON array válido, sem texto adicional.
Cada item deve ter exatamente os campos: titulo, gancho, formato, cta, descricao, hashtags_sugeridas.
""".strip()

GENERATE_IDEAS_USER = """
Gere {count} ideias de conteúdo para a marca "{brand_name}".

Contexto da marca:
- Nicho: {niche}
- Tom de voz: {tone}
- Público-alvo: {audience}
{tema_line}
{formato_line}

Formatos possíveis: carrossel, reels, imagem_unica, stories, texto, video, live.

Retorne um JSON array com {count} objetos no formato:
[
  {{
    "titulo": "título do conteúdo",
    "gancho": "primeira frase de abertura impactante",
    "formato": "formato_sugerido",
    "cta": "chamada para ação específica",
    "descricao": "descrição editorial do objetivo do conteúdo",
    "hashtags_sugeridas": ["#tag1", "#tag2", "#tag3"]
  }}
]
""".strip()
