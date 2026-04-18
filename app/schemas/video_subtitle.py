from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.projects import VideoProjectOut


# ── Segmento de legenda ───────────────────────────────────────────────────────

class SubtitleSegment(BaseModel):
    index: int
    start: float = Field(..., description="Início em segundos")
    end:   float = Field(..., description="Fim em segundos")
    text:  str


# ── Requests ──────────────────────────────────────────────────────────────────

class UpdateSegmentsIn(BaseModel):
    segments: list[SubtitleSegment]


# ── Responses ─────────────────────────────────────────────────────────────────

class VideoSubtitleStatusOut(BaseModel):
    """
    Resposta completa do endpoint GET /video-subtitle/{id}.
    Inclui projeto, fase derivada, segmentos e URLs de download.
    """
    project:   VideoProjectOut
    phase:     str
    # pending | transcribing | transcribed | rendering | completed | failed

    segments:  list[SubtitleSegment] | None = None
    srt_url:   str | None = None
    video_url: str | None = None
    ffmpeg_available: bool = False


class CreateProjectOut(BaseModel):
    """Retornado ao criar um projeto. O projeto já está em fase 'transcribing'."""
    project_id: int
    phase:      str = "transcribing"
    message:    str = "Transcrição iniciada em segundo plano."
