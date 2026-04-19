"""
Provedor: MockAIProvider

Implementação de desenvolvimento/testes que não faz chamadas reais a LLMs.
Produz outputs estruturados e realistas usando templates de dados,
interpolados com o contexto da brand (niche, tone, audience).

Quando substituir por um provedor real:
    1. Criar app/ai/providers/openai_provider.py (ou anthropic_provider.py)
    2. Herdar AIProvider e implementar os 5 métodos abstratos
    3. Usar os prompts de app/ai/prompts/ para montar as mensagens
    4. Alterar AI_PROVIDER=openai no .env
    5. Nenhum outro arquivo precisa mudar
"""

import random
from datetime import datetime, timezone

from app.ai.providers.base import AIProvider
from app.ai.schemas import (
    AICarrosselSlide,
    AICommentAnalysisOut,
    AIIdeaGenerateOut,
    AIIdeaGenerateRequest,
    AIIdeaOut,
    AIPostFromIdeaRequest,
    AIPostOut,
    AIReplyOut,
    AIWeeklyReportOut,
)
from app.models.comment import CommentClassificacao, CommentSentiment
from app.models.idea import IdeaFormatoSugerido


# ── Templates de Ideias ────────────────────────────────────────────────────────
# Cada template define: titulo, gancho, cta, descricao, hashtags, formato
# Placeholders: {niche} {audience}

_IDEA_TEMPLATES: list[dict] = [
    {
        "titulo": "5 erros que todo iniciante em {niche} comete (e como evitar)",
        "gancho": "Se você está começando em {niche}, provavelmente já cometeu pelo menos um desses erros — e nem percebeu.",
        "cta": "Salve esse post para consultar sempre que tiver dúvida!",
        "descricao": "Conteúdo educativo que gera identificação e alto índice de salvamentos.",
        "hashtags": ["#{niche_tag}", "#erros", "#iniciantes", "#aprendizado", "#dicasde{niche_tag}"],
        "formato": IdeaFormatoSugerido.CARROSSEL,
    },
    {
        "titulo": "Como {audience} pode usar {niche} para transformar resultados em 30 dias",
        "gancho": "30 dias. É tudo que você precisa para ver uma transformação real com {niche}.",
        "cta": "Comenta aqui: qual resultado você quer alcançar este mês?",
        "descricao": "Post de transformação com prazo específico — alta intenção de engajamento nos comentários.",
        "hashtags": ["#{niche_tag}", "#transformacao", "#30dias", "#resultados", "#desafio"],
        "formato": IdeaFormatoSugerido.REELS,
    },
    {
        "titulo": "Bastidores: como funciona o dia a dia de quem trabalha com {niche}",
        "gancho": "Todo mundo vê o resultado — poucos sabem o que acontece nos bastidores de {niche}.",
        "cta": "Me conta nos comentários: o que você mais queria saber sobre {niche}?",
        "descricao": "Humanização da marca mostrando processo e autenticidade — excelente para fidelização.",
        "hashtags": ["#{niche_tag}", "#bastidores", "#processo", "#autenticidade", "#rotina"],
        "formato": IdeaFormatoSugerido.STORIES,
    },
    {
        "titulo": "A verdade sobre {niche} que ninguém te conta",
        "gancho": "Existe uma verdade sobre {niche} que a maioria dos profissionais prefere esconder.",
        "cta": "Compartilhe com alguém que precisa ouvir isso hoje!",
        "descricao": "Conteúdo de autoridade com alto potencial viral — a palavra 'verdade' gera curiosidade.",
        "hashtags": ["#{niche_tag}", "#verdade", "#realidade", "#transparencia", "#conscientizacao"],
        "formato": IdeaFormatoSugerido.CARROSSEL,
    },
    {
        "titulo": "Checklist: tudo que {audience} precisa saber antes de começar com {niche}",
        "gancho": "Antes de dar o primeiro passo em {niche}, verifique se você tem tudo isso preparado.",
        "cta": "Salve este checklist — você vai querer consultar depois!",
        "descricao": "Material de referência que gera salvamentos e visitas recorrentes ao perfil.",
        "hashtags": ["#{niche_tag}", "#checklist", "#guia", "#primeirospassos", "#preparacao"],
        "formato": IdeaFormatoSugerido.CARROSSEL,
    },
    {
        "titulo": "Pergunta para você: qual é o seu maior obstáculo em {niche}?",
        "gancho": "Existe uma pergunta que nunca fazem para quem está aprendendo {niche}…",
        "cta": "Responde nos comentários — cada resposta me ajuda a criar conteúdo para você!",
        "descricao": "Post de engajamento para abrir conversa e entender as dores da audiência.",
        "hashtags": ["#{niche_tag}", "#enquete", "#voce", "#comunidade", "#pergunta"],
        "formato": IdeaFormatoSugerido.TEXTO,
    },
    {
        "titulo": "Antes e depois: como {niche} muda tudo em 90 dias",
        "gancho": "Em 90 dias trabalhando com {niche}, a transformação foi além do que eu imaginava.",
        "cta": "Double tap se você também quer esse resultado! ❤️",
        "descricao": "Prova social visual com transformação — altíssimo potencial de compartilhamento.",
        "hashtags": ["#{niche_tag}", "#antesedepois", "#transformacao", "#resultado", "#motivacao"],
        "formato": IdeaFormatoSugerido.IMAGEM_UNICA,
    },
    {
        "titulo": "Tutorial relâmpago: {niche} em menos de 60 segundos",
        "gancho": "Não tem tempo? Em 60 segundos eu te ensino tudo sobre {niche} que você precisa saber agora.",
        "cta": "Segue o perfil para mais tutoriais rápidos como esse!",
        "descricao": "Conteúdo de valor condensado para Reels — ideal para atrair novos seguidores.",
        "hashtags": ["#{niche_tag}", "#tutorial", "#rapido", "#dica", "#aprenda"],
        "formato": IdeaFormatoSugerido.REELS,
    },
    {
        "titulo": "Tendências de {niche} que vão dominar os próximos 6 meses",
        "gancho": "O mercado de {niche} está mudando — e quem não se adaptar vai ficar para trás.",
        "cta": "Qual tendência te animou mais? Comenta aqui!",
        "descricao": "Conteúdo de autoridade e previsão — posiciona a marca como referência do setor.",
        "hashtags": ["#{niche_tag}", "#tendencias", "#futuro", "#inovacao", "#mercado"],
        "formato": IdeaFormatoSugerido.CARROSSEL,
    },
    {
        "titulo": "Por que {audience} escolhe {niche} para mudar de vida",
        "gancho": "Tem um motivo muito específico pelo qual {audience} está migrando para {niche}.",
        "cta": "Marca aqui quem também fez essa escolha com você!",
        "descricao": "Storytelling motivacional que conecta emocionalmente com o público-alvo.",
        "hashtags": ["#{niche_tag}", "#escolha", "#mudanca", "#vida", "#proposito"],
        "formato": IdeaFormatoSugerido.VIDEO,
    },
    {
        "titulo": "Depoimento: o que {audience} diz sobre a experiência com {niche}",
        "gancho": "Nada fala mais alto do que a experiência de quem já viveu {niche} na prática.",
        "cta": "Se você também tem uma história, conta pra gente nos comentários!",
        "descricao": "Prova social com depoimento — construção de confiança e conversão.",
        "hashtags": ["#{niche_tag}", "#depoimento", "#prova social", "#resultados", "#confianca"],
        "formato": IdeaFormatoSugerido.IMAGEM_UNICA,
    },
    {
        "titulo": "Live especial: tire suas dúvidas sobre {niche} ao vivo",
        "gancho": "Você tem dúvidas sobre {niche}? Vou responder tudo — ao vivo e sem filtro.",
        "cta": "Ativa o lembrete e manda sua pergunta nos comentários!",
        "descricao": "Interação direta que fortalece comunidade e gera conteúdo futuro de Q&A.",
        "hashtags": ["#{niche_tag}", "#live", "#aovivo", "#perguntas", "#comunidade"],
        "formato": IdeaFormatoSugerido.LIVE,
    },
]


# ── Templates de Carrossel ─────────────────────────────────────────────────────
# Estruturas de slides para diferentes tipos de conteúdo

def _build_carrossel_slides(titulo: str, descricao: str, niche: str, num_slides: int) -> list[AICarrosselSlide]:
    """Gera slides de carrossel baseados no tipo de conteúdo detectado."""
    slides = []

    # Capa (slide 1)
    slides.append(AICarrosselSlide(
        order=1,
        titulo=titulo,
        texto="Arrasta para ver →",
    ))

    # Slides de conteúdo
    if "erro" in titulo.lower() or "mito" in titulo.lower():
        content_slides = [
            (f"Erro #{i}", f"Muitos profissionais de {niche} cometem este erro sem perceber. Saiba como identificar e corrigir.")
            for i in range(1, num_slides - 1)
        ]
    elif "checklist" in titulo.lower() or "guia" in titulo.lower():
        content_slides = [
            (f"Passo {i}", f"Este é um passo fundamental em {niche} que faz toda a diferença nos resultados.")
            for i in range(1, num_slides - 1)
        ]
    elif "tendência" in titulo.lower() or "trend" in titulo.lower():
        content_slides = [
            (f"Tendência #{i}", f"Esta mudança no mercado de {niche} já está impactando os resultados de quem se antecipou.")
            for i in range(1, num_slides - 1)
        ]
    else:
        content_slides = [
            (f"Ponto {i}", f"Aspecto importante de {niche}: {descricao.split('.')[0] if descricao else 'entenda como isso se aplica na prática'}.")
            for i in range(1, num_slides - 1)
        ]

    for i, (t, txt) in enumerate(content_slides, start=2):
        slides.append(AICarrosselSlide(order=i, titulo=t, texto=txt))

    # Slide de fechamento com CTA
    slides.append(AICarrosselSlide(
        order=num_slides,
        titulo="Gostou? Salva e compartilha!",
        texto=f"Siga o perfil para mais conteúdos sobre {niche}. ❤️",
    ))

    return slides[:num_slides]


# ── Templates de Resposta a Comentários ───────────────────────────────────────

_URGENCY_MAP: dict[CommentClassificacao, str] = {
    CommentClassificacao.LEAD_POTENCIAL: "alta",
    CommentClassificacao.CRITICA: "alta",
    CommentClassificacao.DUVIDA: "media",
    CommentClassificacao.SUGESTAO: "baixa",
    CommentClassificacao.ELOGIO: "baixa",
    CommentClassificacao.SPAM: "baixa",
    CommentClassificacao.OUTRO: "baixa",
}

_REPLY_TEMPLATES: dict[CommentClassificacao, list[tuple[str, str, str]]] = {
    # (resposta, tom, comprimento)
    CommentClassificacao.ELOGIO: [
        (
            "Que alegria receber esse carinho, @{autor}! 💙 Fico muito feliz que tenha gostado. Continue acompanhando nosso conteúdo — tem muito mais vindo por aí!",
            "empático", "curta",
        ),
        (
            "Obrigado pelo carinho, @{autor}! 🙏 Comentários assim nos motivam a continuar criando conteúdo de qualidade. Você faz parte dessa jornada com a gente!",
            "empático", "curta",
        ),
        (
            "Nossa, @{autor}, que mensagem incrível! 🎉 É exatamente por pessoas como você que nos dedicamos tanto. Muito obrigado — fica ligado que tem novidades especiais chegando!",
            "animado", "media",
        ),
    ],
    CommentClassificacao.CRITICA: [
        (
            "Olá, @{autor}! Sentimos muito pela experiência que você teve. 😔 Sua opinião é muito importante para nós e queremos entender melhor o que aconteceu. Pode nos enviar uma mensagem no direct para que possamos resolver isso juntos? Prometemos dar atenção especial ao seu caso.",
            "empático", "longa",
        ),
        (
            "Oi, @{autor}, obrigado por nos contar sobre isso. Levamos todo feedback muito a sério. 🙏 Por favor, entre em contato pelo nosso direct com mais detalhes — nossa equipe está pronta para ajudar e encontrar a melhor solução para você.",
            "empático", "media",
        ),
    ],
    CommentClassificacao.DUVIDA: [
        (
            "Oi, @{autor}! Boa pergunta 😊 Essa é uma dúvida muito comum. Manda um direct pra gente que explicamos tudo em detalhes, tá? Estamos aqui para ajudar!",
            "informativo", "media",
        ),
        (
            "Olá, @{autor}! Ficou com dúvida? Ótimo sinal — significa que você está prestando atenção! 🎯 Você pode encontrar mais detalhes no link da bio, mas se preferir uma resposta personalizada, nos chame no direct!",
            "informativo", "media",
        ),
    ],
    CommentClassificacao.LEAD_POTENCIAL: [
        (
            "Oi, @{autor}! Que ótimo saber do seu interesse! 🎉 Adoramos quando as pessoas se identificam com o que fazemos. Vou te enviar um direct agora com todas as informações e condições especiais. Fique atento à sua caixa de mensagens! 💙",
            "comercial", "media",
        ),
        (
            "Olá, @{autor}! Ficamos super felizes com sua mensagem! 🚀 Passamos um direct pra você com todos os detalhes — condições, formatos e próximos passos. Pode esperar que a gente entra em contato em breve!",
            "comercial", "media",
        ),
    ],
    CommentClassificacao.SUGESTAO: [
        (
            "Que ideia incrível, @{autor}! 💡 Já anotamos aqui com atenção. Adoramos quando nossa comunidade contribui com sugestões assim — é o que nos faz crescer. Muito obrigado e fique ligado: quem sabe essa ideia não vira realidade em breve? 😉",
            "animado", "media",
        ),
        (
            "Obrigado pela sugestão, @{autor}! 🙌 Valorizamos muito esse tipo de feedback. Vamos avaliar com carinho e ver como podemos incorporar isso em nosso trabalho. Você faz a diferença!",
            "empático", "curta",
        ),
    ],
    CommentClassificacao.SPAM: [
        (
            "Olá! Agradecemos a visita, mas este espaço é dedicado a conversas sobre nosso conteúdo. Fique à vontade para comentar sobre os temas que abordamos! 😊",
            "neutro", "curta",
        ),
    ],
    CommentClassificacao.OUTRO: [
        (
            "Olá, @{autor}! Obrigado pela mensagem. 😊 Qualquer dúvida ou comentário, estamos sempre à disposição no direct!",
            "neutro", "curta",
        ),
    ],
}

_ANALYZE_RULES: list[tuple[list[str], CommentClassificacao, CommentSentiment, str]] = [
    (
        ["quero comprar", "onde compro", "tem à venda", "como adquirir", "quanto custa",
         "preço", "valor", "pagamento", "parcelado", "desconto", "promoção", "comprar"],
        CommentClassificacao.LEAD_POTENCIAL, CommentSentiment.POSITIVE,
        "Comentário demonstra intenção de compra com palavras de interesse comercial.",
    ),
    (
        ["parabéns", "amei", "adorei", "perfeito", "incrível", "excelente", "muito bom",
         "top", "maravilhoso", "sensacional", "ótimo", "show", "demais", "lindo", "incrivel"],
        CommentClassificacao.ELOGIO, CommentSentiment.POSITIVE,
        "Comentário contém expressões de aprovação e sentimento positivo.",
    ),
    (
        ["péssimo", "horrível", "decepcionante", "não presta", "ruim", "reclamação",
         "problema", "devolução", "reembolso", "insatisfeito", "vergonha", "raiva"],
        CommentClassificacao.CRITICA, CommentSentiment.NEGATIVE,
        "Comentário contém linguagem negativa e indica insatisfação com o produto/serviço.",
    ),
    (
        ["como funciona", "como fazer", "qual é", "me explica", "não entendi",
         "dúvida", "pergunta", "pode me dizer", "?", "como posso"],
        CommentClassificacao.DUVIDA, CommentSentiment.NEUTRAL,
        "Comentário formula uma pergunta ou demonstra necessidade de esclarecimento.",
    ),
    (
        ["sugestão", "sugerir", "poderiam", "seria legal", "que tal", "e se",
         "melhoraria", "faltou", "adicionar", "poderia ter"],
        CommentClassificacao.SUGESTAO, CommentSentiment.NEUTRAL,
        "Comentário propõe melhoria ou nova funcionalidade de forma construtiva.",
    ),
    (
        ["clique aqui", "acesse agora", "ganhe dinheiro", "http://", "https://",
         "follow back", "segue de volta", "promoção relâmpago", "site"],
        CommentClassificacao.SPAM, CommentSentiment.NEUTRAL,
        "Comentário contém padrões típicos de spam: links externos ou pedido de follow-back.",
    ),
]


class MockAIProvider(AIProvider):
    """
    Provedor de IA baseado em templates — não faz chamadas a APIs externas.
    Produz outputs estruturados e contextualizados com o niche/tone da brand.
    """

    def generate_ideas(
        self,
        request: AIIdeaGenerateRequest,
        brand_context: dict,
    ) -> AIIdeaGenerateOut:
        niche = brand_context.get("niche") or request.tema or "seu segmento"
        audience = brand_context.get("target_audience") or "seu público"
        niche_tag = niche.lower().replace(" ", "").replace("-", "")

        pool = _IDEA_TEMPLATES
        if request.formato_sugerido:
            filtered = [t for t in pool if t["formato"] == request.formato_sugerido]
            pool = filtered if filtered else _IDEA_TEMPLATES

        selected = random.sample(pool, min(request.quantidade, len(pool)))

        ideas = []
        for tpl in selected:
            ideas.append(AIIdeaOut(
                titulo=tpl["titulo"].format(niche=niche, audience=audience),
                gancho=tpl["gancho"].format(niche=niche, audience=audience),
                formato=tpl["formato"],
                cta=tpl["cta"].format(niche=niche, audience=audience),
                descricao=tpl["descricao"],
                hashtags_sugeridas=[
                    h.format(niche_tag=niche_tag, niche=niche_tag)
                    for h in tpl["hashtags"]
                ],
            ))

        context_summary = f"Nicho: {niche} | Público: {audience} | Tom: {brand_context.get('tone_of_voice', 'não definido')}"

        return AIIdeaGenerateOut(
            ideas=ideas,
            generated_count=len(ideas),
            source="mock",
            brand_context_used=context_summary,
        )

    def idea_to_post(
        self,
        request: AIPostFromIdeaRequest,
        idea_context: dict,
        brand_context: dict,
    ) -> AIPostOut:
        niche = brand_context.get("niche") or "seu segmento"
        titulo = idea_context.get("titulo", "Conteúdo")
        descricao = idea_context.get("descricao", "")
        formato = idea_context.get("formato_sugerido", "imagem_unica")
        platform = request.platform.value

        headline = titulo[:80] if len(titulo) <= 80 else titulo[:77] + "..."

        legenda = (
            f"{titulo}\n\n"
            f"{descricao}\n\n"
            f"Se você trabalha com {niche} ou está pensando em começar, esse conteúdo foi feito para você.\n\n"
            f"Salva esse post e compartilha com quem precisa ver isso! 👇"
        )

        cta = idea_context.get("cta") or f"Siga o perfil para mais conteúdos sobre {niche}!"

        # Gerar slides apenas para carrossel
        is_carrossel = str(formato).lower() in ("carrossel",)
        slides = []
        if is_carrossel:
            slides = _build_carrossel_slides(titulo, descricao, niche, request.num_slides)

        niche_tag = niche.lower().replace(" ", "").replace("-", "")
        hashtags = [
            f"#{niche_tag}",
            f"#{platform}",
            f"#{niche_tag}dicas",
            "#marketingdigital",
            "#conteudo",
            "#empreendedorismo",
            "#crescimento",
        ]

        if request.extra_context and "urgente" in request.extra_context.lower():
            legenda = "⚡ " + legenda

        return AIPostOut(
            headline=headline,
            legenda=legenda,
            cta=cta,
            carrossel_slides=slides,
            hashtags=hashtags,
            source="mock",
        )

    def analyze_comment(
        self,
        comment_context: dict,
        brand_context: dict,
    ) -> AICommentAnalysisOut:
        body = comment_context.get("body", "")
        autor = comment_context.get("author_username") or "você"
        body_lower = body.lower()

        # Aplicar regras em ordem de especificidade
        categoria = CommentClassificacao.OUTRO
        sentimento = CommentSentiment.UNKNOWN
        justificativa = "Comentário não se encaixou em nenhuma categoria específica."

        for keywords, cat, sent, just in _ANALYZE_RULES:
            if any(kw in body_lower for kw in keywords):
                categoria = cat
                sentimento = sent
                justificativa = just
                break

        urgencia = _URGENCY_MAP.get(categoria, "baixa")

        # Gerar resposta sugerida
        templates = _REPLY_TEMPLATES.get(categoria, _REPLY_TEMPLATES[CommentClassificacao.OUTRO])
        resposta_tpl, _, _ = random.choice(templates)
        resposta = resposta_tpl.replace("{autor}", autor)

        return AICommentAnalysisOut(
            categoria=categoria,
            sentimento=sentimento,
            urgencia=urgencia,
            resposta=resposta,
            justificativa=justificativa,
            source="mock",
        )

    def generate_reply(
        self,
        comment_context: dict,
        analysis: AICommentAnalysisOut,
        brand_context: dict,
    ) -> AIReplyOut:
        autor = comment_context.get("author_username") or "você"
        templates = _REPLY_TEMPLATES.get(analysis.categoria, _REPLY_TEMPLATES[CommentClassificacao.OUTRO])
        resposta_tpl, tom, comprimento = random.choice(templates)
        resposta = resposta_tpl.replace("{autor}", autor)

        return AIReplyOut(
            resposta=resposta,
            tom=tom,
            comprimento=comprimento,
            source="mock",
        )

    def generate_weekly_report(
        self,
        report_context: dict,
        brand_context: dict,
    ) -> AIWeeklyReportOut:
        brand_name = brand_context.get("brand_name", "sua marca")
        niche = brand_context.get("niche") or "seu segmento"
        periodo = report_context.get("periodo", "Última semana")

        published = report_context.get("published_posts", 0)
        new_leads = report_context.get("new_leads", 0)
        total_leads = report_context.get("total_leads", 0)
        draft_posts = report_context.get("draft_posts", 0)
        approved_posts = report_context.get("approved_posts", 0)
        total_posts = report_context.get("total_posts", 0)
        posts_by_status = report_context.get("posts_by_status", {})
        leads_by_status = report_context.get("leads_by_status", {})
        comment_categories = report_context.get("top_comment_categories", {})

        # Destaques
        destaques = []
        if published > 0:
            destaques.append(f"{published} post(s) publicado(s) no período — consistência é chave para o crescimento.")
        if new_leads > 0:
            destaques.append(f"{new_leads} novo(s) lead(s) captado(s) — sinal positivo de interesse no nicho de {niche}.")
        if comment_categories.get("elogio", 0) > 0:
            destaques.append(f"{comment_categories['elogio']} elogio(s) recebido(s) — sua audiência está engajando positivamente.")
        if comment_categories.get("lead_potencial", 0) > 0:
            destaques.append(f"{comment_categories['lead_potencial']} lead(s) identificado(s) nos comentários — oportunidades de conversão.")
        if draft_posts > 0:
            destaques.append(f"{draft_posts} rascunho(s) aguardando aprovação — mantenha o pipeline de conteúdo ativo.")
        if not destaques:
            destaques.append(f"Semana de construção — continue criando conteúdo consistente sobre {niche}.")

        # Recomendações
        recomendacoes = []
        if published == 0:
            recomendacoes.append(f"[URGENTE] Publique pelo menos 1 post esta semana para manter a consistência no {niche}.")
        if draft_posts > 3:
            recomendacoes.append("Revise e aprove os rascunhos acumulados para não atrasar o calendário editorial.")
        if new_leads > 0:
            recomendacoes.append(f"Entre em contato com os {new_leads} novos leads captados — respostas rápidas aumentam a taxa de conversão.")
        if comment_categories.get("duvida", 0) > 2:
            recomendacoes.append("Crie um post de FAQ respondendo as dúvidas mais frequentes identificadas nos comentários.")
        if comment_categories.get("critica", 0) > 0:
            recomendacoes.append("Responda às críticas recebidas com empatia e agilidade — cada crítica é uma oportunidade de fidelização.")
        if approved_posts > 0:
            recomendacoes.append(f"Agende os {approved_posts} post(s) aprovados para os melhores horários de engajamento do seu público.")
        if len(recomendacoes) < 3:
            recomendacoes.append(f"Explore novos formatos de conteúdo (Reels, carrossel, lives) para aumentar o alcance orgânico em {niche}.")

        # Conclusão
        conclusao = (
            f"A {brand_name} está construindo uma presença sólida no segmento de {niche}. "
            f"Com {total_posts} post(s) no portfólio e {total_leads} lead(s) acumulado(s), "
            f"o crescimento é progressivo e sustentável. "
            f"Continue focando em consistência e qualidade — os resultados se acumulam com o tempo."
        )

        return AIWeeklyReportOut(
            periodo=periodo,
            destaques=destaques,
            posts_performance={
                "publicados_no_periodo": published,
                "total_publicados": posts_by_status.get("publicado", 0),
                "aguardando_aprovacao": approved_posts,
                "rascunhos": draft_posts,
                "observacao": (
                    "Frequência de publicação adequada." if published >= 3
                    else "Frequência abaixo do recomendado — tente publicar 3-5x por semana."
                ),
            },
            leads_summary={
                "novos_no_periodo": new_leads,
                "total_acumulado": total_leads,
                "por_status": leads_by_status,
                "observacao": (
                    f"Geração de leads consistente com {new_leads} novos no período." if new_leads > 0
                    else "Nenhum lead novo no período — revise CTAs e estratégia de captação."
                ),
            },
            recomendacoes=recomendacoes[:6],
            conclusao=conclusao,
            source="mock",
        )
