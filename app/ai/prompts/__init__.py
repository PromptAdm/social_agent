"""
Package: app.ai.prompts
Templates de prompt para cada função da IA.

Cada módulo exporta constantes de string com placeholders {chave}.
O provider real preenche os placeholders antes de enviar ao LLM.
O MockAIProvider ignora as strings e usa templates de dados próprios,
mas a estrutura é idêntica para facilitar a troca de provedor.
"""

from app.ai.prompts.idea_prompts import (
    GENERATE_IDEAS_SYSTEM,
    GENERATE_IDEAS_USER,
)
from app.ai.prompts.post_prompts import (
    IDEA_TO_POST_SYSTEM,
    IDEA_TO_POST_USER,
)
from app.ai.prompts.comment_prompts import (
    ANALYZE_COMMENT_SYSTEM,
    ANALYZE_COMMENT_USER,
    GENERATE_REPLY_SYSTEM,
    GENERATE_REPLY_USER,
)
from app.ai.prompts.report_prompts import (
    WEEKLY_REPORT_SYSTEM,
    WEEKLY_REPORT_USER,
)

__all__ = [
    "GENERATE_IDEAS_SYSTEM",
    "GENERATE_IDEAS_USER",
    "IDEA_TO_POST_SYSTEM",
    "IDEA_TO_POST_USER",
    "ANALYZE_COMMENT_SYSTEM",
    "ANALYZE_COMMENT_USER",
    "GENERATE_REPLY_SYSTEM",
    "GENERATE_REPLY_USER",
    "WEEKLY_REPORT_SYSTEM",
    "WEEKLY_REPORT_USER",
]
