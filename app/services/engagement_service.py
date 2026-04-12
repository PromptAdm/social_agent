"""
Service: Engagement — Módulo 6: Gestão de Engajamento

Funções:
    create_comment          — registra comentário
    list_comments           — lista com filtros (classificacao, sentiment, is_replied)
    get_comment             — busca por id
    update_comment          — atualiza campos
    classify_comment        — reclassifica sentiment e/ou classificacao
    auto_classify_comment   — classifica automaticamente por palavras-chave (mock)
    generate_reply          — gera sugestão de resposta baseada na classificacao (mock)
    create_reply_suggestion — cria sugestão manual
    list_reply_suggestions  — lista sugestões de um comentário
"""

import re
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.comment import Comment, CommentClassificacao, CommentSentiment
from app.models.reply_suggestion import ReplySuggestion, SuggestionStatus
from app.schemas.comment import CommentClassifyRequest, CommentCreate, CommentUpdate
from app.schemas.reply_suggestion import GenerateReplyOut, ReplySuggestionCreate, ReplySuggestionOut


# ── Comentários — CRUD ─────────────────────────────────────────────────────────

def create_comment(db: Session, payload: CommentCreate) -> Comment:
    comment = Comment(**payload.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def list_comments(
    db: Session,
    post_id: int,
    *,
    classificacao: CommentClassificacao | None = None,
    sentiment: CommentSentiment | None = None,
    is_replied: bool | None = None,
) -> list[Comment]:
    query = db.query(Comment).filter(Comment.post_id == post_id)
    if classificacao is not None:
        query = query.filter(Comment.classificacao == classificacao)
    if sentiment is not None:
        query = query.filter(Comment.sentiment == sentiment)
    if is_replied is not None:
        query = query.filter(Comment.is_replied == is_replied)
    return query.order_by(Comment.created_at.desc()).all()


def get_comment(db: Session, comment_id: int) -> Comment:
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")
    return comment


def update_comment(db: Session, comment_id: int, payload: CommentUpdate) -> Comment:
    comment = get_comment(db, comment_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(comment, field, value)
    db.commit()
    db.refresh(comment)
    return comment


# ── Classificação ──────────────────────────────────────────────────────────────

# Palavras-chave para classificação automática (mock)
# Ordem importa: mais específico primeiro
_CLASSIFY_RULES: list[tuple[list[str], CommentClassificacao, CommentSentiment]] = [
    # Leads potenciais
    (
        ["quero comprar", "onde compro", "tem à venda", "como adquirir", "quanto custa",
         "preço", "valor", "pagamento", "parcelado", "desconto", "promoção"],
        CommentClassificacao.LEAD_POTENCIAL,
        CommentSentiment.POSITIVE,
    ),
    # Elogios
    (
        ["parabéns", "amei", "adorei", "perfeito", "incrível", "excelente", "muito bom",
         "top", "maravilhoso", "sensacional", "ótimo", "show", "demais"],
        CommentClassificacao.ELOGIO,
        CommentSentiment.POSITIVE,
    ),
    # Críticas / reclamações
    (
        ["péssimo", "horrível", "decepcionante", "não presta", "ruim", "reclamação",
         "problema", "devolução", "reembolso", "insatisfeito", "vergonha"],
        CommentClassificacao.CRITICA,
        CommentSentiment.NEGATIVE,
    ),
    # Dúvidas
    (
        ["como funciona", "como fazer", "qual é", "me explica", "não entendi",
         "dúvida", "pergunta", "pode me dizer", "?"],
        CommentClassificacao.DUVIDA,
        CommentSentiment.NEUTRAL,
    ),
    # Sugestões
    (
        ["sugestão", "sugerir", "poderiam", "seria legal", "que tal", "e se",
         "melhoraria", "faltou", "adicionar"],
        CommentClassificacao.SUGESTAO,
        CommentSentiment.NEUTRAL,
    ),
    # Spam
    (
        ["clique aqui", "acesse agora", "ganhe dinheiro", "http://", "https://",
         "follow back", "segue de volta", "promoção relâmpago"],
        CommentClassificacao.SPAM,
        CommentSentiment.NEUTRAL,
    ),
]


def auto_classify_comment(db: Session, comment_id: int) -> Comment:
    """
    Classifica automaticamente um comentário usando regras de palavras-chave (mock).
    Futuramente: substituir por chamada a modelo de NLP/LLM.
    """
    comment = get_comment(db, comment_id)
    body_lower = comment.body.lower()

    matched_classificacao = CommentClassificacao.OUTRO
    matched_sentiment = CommentSentiment.UNKNOWN

    for keywords, classificacao, sentiment in _CLASSIFY_RULES:
        if any(kw in body_lower for kw in keywords):
            matched_classificacao = classificacao
            matched_sentiment = sentiment
            break

    comment.classificacao = matched_classificacao
    comment.sentiment = matched_sentiment
    db.commit()
    db.refresh(comment)
    return comment


def classify_comment(
    db: Session,
    comment_id: int,
    payload: CommentClassifyRequest,
) -> Comment:
    """
    Reclassifica manualmente sentiment e/ou classificacao de um comentário.
    Campos omitidos são preservados.
    """
    comment = get_comment(db, comment_id)
    if payload.sentiment is not None:
        comment.sentiment = payload.sentiment
    if payload.classificacao is not None:
        comment.classificacao = payload.classificacao
    db.commit()
    db.refresh(comment)
    return comment


# ── Geração de Resposta (mock) ─────────────────────────────────────────────────

# Templates de resposta por classificacao.
# {autor} = author_username ou "você"
_REPLY_TEMPLATES: dict[CommentClassificacao, list[str]] = {
    CommentClassificacao.ELOGIO: [
        "Que alegria receber esse carinho, {autor}! 💙 Fico muito feliz que tenha gostado. Continue acompanhando nosso conteúdo!",
        "Obrigado pelo elogio, {autor}! Sua mensagem nos motiva a continuar entregando o melhor. 🙏",
        "Muito obrigado, {autor}! É para isso que trabalhamos todos os dias. Conte sempre conosco! 💪",
    ],
    CommentClassificacao.CRITICA: [
        "Olá, {autor}! Sentimos muito pela experiência negativa. Que tal nos contatar pelo direct para resolvermos isso juntos? 📩",
        "Obrigado pelo feedback, {autor}. Levamos sua opinião a sério e estamos trabalhando para melhorar. Pode nos enviar mais detalhes?",
        "{autor}, lamentamos o ocorrido. Nossa equipe está aqui para ajudar — entre em contato pelo direct ou pelo nosso email de suporte.",
    ],
    CommentClassificacao.DUVIDA: [
        "Oi, {autor}! Boa pergunta 😊 Pode nos enviar um direct que explicamos tudo em detalhes, ok?",
        "Olá, {autor}! Ficou com dúvida? Estamos aqui para ajudar. Pode perguntar à vontade no direct!",
        "{autor}, obrigado por perguntar! A resposta está no nosso link da bio, mas se preferir, nos chame no direct. 👋",
    ],
    CommentClassificacao.LEAD_POTENCIAL: [
        "Oi, {autor}! Que ótimo saber do seu interesse 🎉 Te mandamos um direct agora com todas as informações. Fique atento!",
        "Olá, {autor}! Ficamos super felizes com seu interesse. Passa no nosso direct que a gente te conta tudo! 💙",
        "{autor}, adorei sua mensagem! Vamos te enviar um direct com os detalhes e condições especiais. 🚀",
    ],
    CommentClassificacao.SUGESTAO: [
        "Que ótima sugestão, {autor}! Já anotamos aqui e vamos avaliar. Obrigado por contribuir com a gente! 🙌",
        "Adoramos o feedback, {autor}! Esse tipo de sugestão nos ajuda muito a melhorar. Muito obrigado! 💡",
        "{autor}, obrigado pela ideia! Estamos sempre em busca de melhorias e vamos considerar sua sugestão com carinho. 🙏",
    ],
    CommentClassificacao.SPAM: [
        "Olá! Notamos que este comentário não se relaciona ao nosso conteúdo. Por favor, mantenha a conversa relevante. Obrigado! 😊",
    ],
    CommentClassificacao.OUTRO: [
        "Olá, {autor}! Obrigado pelo seu comentário. Qualquer dúvida, estamos à disposição! 😊",
        "Obrigado pela mensagem, {autor}! Fique à vontade para entrar em contato pelo direct se precisar de algo. 👋",
    ],
}


def generate_reply(db: Session, comment_id: int) -> "GenerateReplyOut":
    """
    Gera uma sugestão de resposta automática baseada na classificacao do comentário (mock).
    A sugestão é salva como ReplySuggestion com status PENDENTE.
    Futuramente: integrar com LLM para respostas personalizadas.
    """
    import random

    comment = get_comment(db, comment_id)
    autor = comment.author_username or "você"

    templates = _REPLY_TEMPLATES.get(comment.classificacao, _REPLY_TEMPLATES[CommentClassificacao.OUTRO])
    body = random.choice(templates).replace("{autor}", autor)

    suggestion = ReplySuggestion(
        comment_id=comment_id,
        body=body,
        generated_by="mock_generator",
        is_ai_generated=True,
        status=SuggestionStatus.PENDING,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)

    return GenerateReplyOut(
        suggestion=ReplySuggestionOut.model_validate(suggestion),
        source="mock",
    )


# ── Sugestões de Resposta — CRUD ───────────────────────────────────────────────

def create_reply_suggestion(db: Session, payload: ReplySuggestionCreate) -> ReplySuggestion:
    suggestion = ReplySuggestion(**payload.model_dump())
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


def list_reply_suggestions(db: Session, comment_id: int) -> list[ReplySuggestion]:
    return (
        db.query(ReplySuggestion)
        .filter(ReplySuggestion.comment_id == comment_id)
        .order_by(ReplySuggestion.created_at.desc())
        .all()
    )
