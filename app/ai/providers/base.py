"""
Classe base abstrata: AIProvider

Define o contrato que todo provedor de IA deve implementar.
Qualquer integração futura (OpenAI, Anthropic, Gemini, etc.) deve
herdar esta classe e implementar todos os métodos abstratos.

Contextos passados para cada método:
    brand_context  — dict com niche, tone_of_voice, target_audience, brand_name
    idea_context   — dict com titulo, descricao, formato_sugerido, gancho
    comment_context — dict com body, author_username, post_platform
    report_context — dict com métricas do período
"""

from abc import ABC, abstractmethod

from app.ai.schemas import (
    AICommentAnalysisOut,
    AIIdeaGenerateOut,
    AIIdeaGenerateRequest,
    AIPostFromIdeaRequest,
    AIPostOut,
    AIReplyOut,
    AIWeeklyReportOut,
)


class AIProvider(ABC):
    """Interface abstrata para provedores de IA do Social Agent."""

    @abstractmethod
    def generate_ideas(
        self,
        request: AIIdeaGenerateRequest,
        brand_context: dict,
    ) -> AIIdeaGenerateOut:
        """
        Gera ideias de conteúdo enriquecidas (título + gancho + CTA + hashtags).

        Args:
            request:       parâmetros de geração (count, tema, formato_sugerido)
            brand_context: dict com niche, tone_of_voice, target_audience, brand_name
        """
        ...

    @abstractmethod
    def idea_to_post(
        self,
        request: AIPostFromIdeaRequest,
        idea_context: dict,
        brand_context: dict,
    ) -> AIPostOut:
        """
        Transforma uma ideia em post completo (headline + legenda + slides + hashtags).

        Args:
            request:       parâmetros (platform, num_slides, extra_context)
            idea_context:  dict com titulo, descricao, formato_sugerido
            brand_context: dict com niche, tone_of_voice, target_audience, brand_name
        """
        ...

    @abstractmethod
    def analyze_comment(
        self,
        comment_context: dict,
        brand_context: dict,
    ) -> AICommentAnalysisOut:
        """
        Analisa um comentário e retorna categoria, urgência, sentimento e resposta sugerida.

        Args:
            comment_context: dict com body, author_username, platform
            brand_context:   dict com niche, tone_of_voice, brand_name
        """
        ...

    @abstractmethod
    def generate_reply(
        self,
        comment_context: dict,
        analysis: AICommentAnalysisOut,
        brand_context: dict,
    ) -> AIReplyOut:
        """
        Gera uma resposta personalizada para um comentário já analisado.

        Args:
            comment_context: dict com body, author_username
            analysis:        resultado de analyze_comment (categoria, urgencia…)
            brand_context:   dict com niche, tone_of_voice, brand_name
        """
        ...

    @abstractmethod
    def generate_weekly_report(
        self,
        report_context: dict,
        brand_context: dict,
    ) -> AIWeeklyReportOut:
        """
        Gera relatório semanal com destaques, performance e recomendações.

        Args:
            report_context: dict com métricas do período (posts, leads, comentários)
            brand_context:  dict com niche, brand_name
        """
        ...
