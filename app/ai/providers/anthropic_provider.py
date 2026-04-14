"""
Provedor: AnthropicProvider

Implementação real usando Claude (Anthropic) para geração de conteúdo.
Ativa com: AI_PROVIDER=anthropic + ANTHROPIC_API_KEY no .env

Métodos implementados com IA real:
    generate_ideas   — Claude gera ideias estruturadas (JSON)
    idea_to_post     — Claude transforma ideia em post completo (JSON)

Métodos que mantêm fallback para mock (fora do escopo atual):
    analyze_comment, generate_reply, generate_weekly_report
"""

import json
import re

import anthropic

from app.ai.providers.base import AIProvider
from app.ai.providers.mock import MockAIProvider
from app.ai.schemas import (
    AICommentAnalysisOut,
    AIIdeaGenerateOut,
    AIIdeaGenerateRequest,
    AIIdeaOut,
    AIPostFromIdeaRequest,
    AIPostOut,
    AICarrosselSlide,
    AIReplyOut,
    AIWeeklyReportOut,
)
from app.models.idea import IdeaFormatoSugerido


_IDEA_MODEL = "claude-haiku-4-5-20251001"   # rápido e custo-efetivo para geração de ideias
_POST_MODEL = "claude-sonnet-4-6"           # qualidade superior para posts completos


def _extract_json(text: str):
    """
    Extrai JSON da resposta do LLM, suportando code fences markdown.
    Tenta na ordem: ```json...```, ```...```, texto direto.
    """
    # Markdown code fence (json)
    m = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if m:
        return json.loads(m.group(1))
    # Markdown code fence (genérico)
    m = re.search(r"```\s*([\s\S]*?)\s*```", text)
    if m:
        return json.loads(m.group(1))
    # JSON direto (array ou objeto)
    m = re.search(r"(\[[\s\S]*\]|\{[\s\S]*\})", text)
    if m:
        return json.loads(m.group(1))
    return json.loads(text.strip())


class AnthropicProvider(AIProvider):
    """
    Provedor de IA usando a API da Anthropic (Claude).
    Gera ideias e posts via LLM com contexto completo da marca.
    """

    def __init__(self, api_key: str) -> None:
        self.client = anthropic.Anthropic(api_key=api_key)
        self._mock = MockAIProvider()   # fallback para métodos ainda não implementados

    # ── 1. Gerar Ideias ────────────────────────────────────────────────────────

    def generate_ideas(
        self,
        request: AIIdeaGenerateRequest,
        brand_context: dict,
    ) -> AIIdeaGenerateOut:
        from app.ai.prompts.idea_prompts import GENERATE_IDEAS_SYSTEM, GENERATE_IDEAS_USER

        niche     = brand_context.get("niche") or request.tema or "geral"
        tone      = brand_context.get("tone_of_voice") or "profissional e amigável"
        audience  = brand_context.get("target_audience") or "empreendedores e profissionais"
        brand_name = brand_context.get("brand_name") or "nossa marca"

        # Linhas opcionais do prompt
        tema_line    = f"- Tema principal: {request.tema}"        if request.tema          else ""
        formato_line = f"- Formato preferido: {request.formato_sugerido.value}" \
                       if request.formato_sugerido else ""
        obj_line     = f"- Objetivo: {request.objetivo}"         if request.objetivo      else ""
        plat_line    = f"- Plataforma: {request.plataforma}"     if request.plataforma    else ""
        ctx_line     = f"- Contexto adicional: {request.contexto}" if request.contexto    else ""

        extra_lines = "\n".join(
            l for l in [tema_line, obj_line, plat_line, formato_line, ctx_line] if l
        )

        user_prompt = GENERATE_IDEAS_USER.format(
            count=request.quantidade,
            brand_name=brand_name,
            niche=niche,
            tone=tone,
            audience=audience,
            tema_line=extra_lines,
            formato_line="",  # já embutido em extra_lines acima
        )

        response = self.client.messages.create(
            model=_IDEA_MODEL,
            max_tokens=4096,
            system=GENERATE_IDEAS_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw = _extract_json(response.content[0].text)
        if not isinstance(raw, list):
            raw = raw.get("ideas", [])

        ideas: list[AIIdeaOut] = []
        for item in raw[: request.quantidade]:
            formato_str = str(item.get("formato", "indefinido")).lower().strip()
            try:
                formato = IdeaFormatoSugerido(formato_str)
            except ValueError:
                formato = IdeaFormatoSugerido.INDEFINIDO

            ideas.append(
                AIIdeaOut(
                    titulo=item.get("titulo", "").strip(),
                    gancho=item.get("gancho", "").strip(),
                    formato=formato,
                    cta=item.get("cta", "").strip(),
                    descricao=item.get("descricao", "").strip(),
                    hashtags_sugeridas=[
                        h if h.startswith("#") else f"#{h}"
                        for h in item.get("hashtags_sugeridas", [])
                    ],
                )
            )

        context_summary = (
            f"Marca: {brand_name} | Nicho: {niche} | Tom: {tone} | Público: {audience}"
        )

        return AIIdeaGenerateOut(
            ideas=ideas,
            generated_count=len(ideas),
            source="claude",
            brand_context_used=context_summary,
        )

    # ── 2. Ideia → Post ────────────────────────────────────────────────────────

    def idea_to_post(
        self,
        request: AIPostFromIdeaRequest,
        idea_context: dict,
        brand_context: dict,
    ) -> AIPostOut:
        from app.ai.prompts.post_prompts import IDEA_TO_POST_SYSTEM, IDEA_TO_POST_USER

        niche      = brand_context.get("niche") or "geral"
        tone       = brand_context.get("tone_of_voice") or "profissional e amigável"
        audience   = brand_context.get("target_audience") or "público geral"
        brand_name = brand_context.get("brand_name") or "nossa marca"
        titulo     = idea_context.get("titulo", "")
        descricao  = idea_context.get("descricao", "")
        formato    = idea_context.get("formato_sugerido", "imagem_unica")
        platform   = request.platform.value

        is_carrossel = str(formato).lower() == "carrossel"
        slides_line = (
            f"- Número de slides do carrossel: {request.num_slides}"
            if is_carrossel
            else ""
        )
        extra_line = (
            f"- Instruções adicionais: {request.extra_context}"
            if request.extra_context
            else ""
        )

        user_prompt = IDEA_TO_POST_USER.format(
            brand_name=brand_name,
            titulo=titulo,
            descricao=descricao,
            niche=niche,
            tone=tone,
            audience=audience,
            platform=platform,
            formato=formato,
            slides_line=slides_line,
            extra_line=extra_line,
        )

        response = self.client.messages.create(
            model=_POST_MODEL,
            max_tokens=4096,
            system=IDEA_TO_POST_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw = _extract_json(response.content[0].text)

        # Parse carrossel slides
        slides: list[AICarrosselSlide] = []
        for s in raw.get("carrossel_slides", []):
            slides.append(
                AICarrosselSlide(
                    order=s.get("order", 1),
                    titulo=s.get("titulo", ""),
                    texto=s.get("texto", ""),
                )
            )

        hashtags = raw.get("hashtags", [])

        return AIPostOut(
            headline=raw.get("headline", titulo[:80]),
            legenda=raw.get("legenda", titulo),
            cta=raw.get("cta", ""),
            carrossel_slides=slides,
            hashtags=hashtags,
            source="claude",
        )

    # ── 3-5. Fallback para Mock ────────────────────────────────────────────────

    def analyze_comment(self, comment_context: dict, brand_context: dict) -> AICommentAnalysisOut:
        return self._mock.analyze_comment(comment_context, brand_context)

    def generate_reply(
        self,
        comment_context: dict,
        analysis: AICommentAnalysisOut,
        brand_context: dict,
    ) -> AIReplyOut:
        return self._mock.generate_reply(comment_context, analysis, brand_context)

    def generate_weekly_report(
        self,
        report_context: dict,
        brand_context: dict,
    ) -> AIWeeklyReportOut:
        return self._mock.generate_weekly_report(report_context, brand_context)
