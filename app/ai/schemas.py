"""
Schemas Pydantic para a camada de IA do Social Agent.

Estes schemas são exclusivos dos endpoints /ai/* e do AIService.
São intencionalmente separados dos schemas de domínio (app/schemas/)
para que possam evoluir de forma independente conforme os modelos de IA mudam.
"""

from pydantic import BaseModel, Field

from app.models.comment import CommentClassificacao, CommentSentiment
from app.models.idea import IdeaFormatoSugerido
from app.models.post import SocialPlatform


# ── Requests ───────────────────────────────────────────────────────────────────

class AIIdeaGenerateRequest(BaseModel):
    """Parâmetros para geração de ideias enriquecidas via IA."""
    brand_id: int
    count: int = Field(default=5, ge=1, le=20, description="Quantidade de ideias a gerar")
    tema: str | None = Field(
        default=None,
        description="Tema ou palavra-chave guia (ex: 'nutrição pós-treino')",
    )
    formato_sugerido: IdeaFormatoSugerido | None = Field(
        default=None,
        description="Restringir geração a um formato específico",
    )


class AIPostFromIdeaRequest(BaseModel):
    """Parâmetros para transformar uma ideia em post completo via IA."""
    platform: SocialPlatform
    num_slides: int = Field(
        default=5,
        ge=3,
        le=10,
        description="Número de slides do carrossel (ignorado para outros formatos)",
    )
    extra_context: str | None = Field(
        default=None,
        description="Instruções ou contexto adicional para a geração (ex: 'tom mais descontraído')",
    )


class AIWeeklyReportRequest(BaseModel):
    """Parâmetros para geração do relatório semanal da brand."""
    brand_id: int
    week_reference: str | None = Field(
        default=None,
        description=(
            "Semana de referência em formato ISO 8601 (ex: '2025-W15'). "
            "Se omitido, usa os últimos 7 dias."
        ),
    )


# ── Outputs — Ideias ───────────────────────────────────────────────────────────

class AIIdeaOut(BaseModel):
    """Ideia enriquecida gerada pela IA (não persistida automaticamente)."""
    titulo: str
    gancho: str                         # frase de abertura para capturar atenção
    formato: IdeaFormatoSugerido
    cta: str                            # call-to-action sugerido
    descricao: str                      # contexto editorial
    hashtags_sugeridas: list[str] = Field(default_factory=list)


class AIIdeaGenerateOut(BaseModel):
    """Resultado da geração de ideias via IA."""
    ideas: list[AIIdeaOut]
    generated_count: int
    source: str = "mock"                # futuro: "gpt-4o", "claude-opus-4", etc.
    brand_context_used: str             # resumo do contexto usado (transparência)


# ── Outputs — Posts ────────────────────────────────────────────────────────────

class AICarrosselSlide(BaseModel):
    """Conteúdo de um slide individual de carrossel."""
    order: int
    titulo: str
    texto: str


class AIPostOut(BaseModel):
    """Post completo gerado pela IA a partir de uma Idea."""
    headline: str                       # título curto e impactante
    legenda: str                        # caption completo
    cta: str                            # chamada para ação
    carrossel_slides: list[AICarrosselSlide]  # vazio se formato != carrossel
    hashtags: list[str]
    source: str = "mock"


# ── Outputs — Comentários ──────────────────────────────────────────────────────

class AICommentAnalysisOut(BaseModel):
    """Análise inteligente de comentário com urgência e justificativa."""
    categoria: CommentClassificacao
    sentimento: CommentSentiment
    urgencia: str                       # "baixa" | "media" | "alta" | "critica"
    resposta: str                       # resposta sugerida (pronta para uso)
    justificativa: str                  # explicação da classificação
    source: str = "mock"


class AIReplyOut(BaseModel):
    """Resposta personalizada gerada pela IA considerando o contexto da brand."""
    resposta: str
    tom: str                            # "empático" | "informativo" | "comercial" | "neutro"
    comprimento: str                    # "curta" | "media" | "longa"
    source: str = "mock"


# ── Outputs — Relatório Semanal ────────────────────────────────────────────────

class AIWeeklyReportOut(BaseModel):
    """Relatório semanal consolidado gerado pela IA."""
    periodo: str                        # ex: "Semana 15 — 07 a 13 abr 2025"
    destaques: list[str]                # bullets de conquistas/métricas relevantes
    posts_performance: dict             # resumo de posts publicados
    leads_summary: dict                 # resumo de leads
    recomendacoes: list[str]            # ações recomendadas para a próxima semana
    conclusao: str                      # parágrafo de fechamento
    source: str = "mock"
