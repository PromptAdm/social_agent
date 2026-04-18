"""
Serviço de transcrição de áudio/vídeo.

Provedores suportados:
  mock    — segmentos de exemplo (desenvolvimento sem API key)
  openai  — Whisper API (requer TRANSCRIPTION_PROVIDER=openai + OPENAI_API_KEY)

Para trocar de provedor: TRANSCRIPTION_PROVIDER=openai no .env

Retorno: list[dict] com chaves index, start (float), end (float), text (str)
"""

import logging
import time

from app.core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()


# ── API pública ───────────────────────────────────────────────────────────────

def transcribe_sync(file_path: str, language: str = "pt") -> list[dict]:
    """
    Transcreve o áudio do arquivo em file_path e retorna segmentos.
    Execução síncrona — deve ser chamada dentro de um BackgroundTask ou thread.
    """
    provider = settings.TRANSCRIPTION_PROVIDER.lower()

    if provider == "openai" and settings.OPENAI_API_KEY:
        logger.info("Transcrevendo via OpenAI Whisper: %s", file_path)
        return _transcribe_openai(file_path, language)

    if provider != "mock":
        logger.warning(
            "Provedor '%s' não reconhecido ou sem API key — usando mock.", provider
        )

    logger.info("Transcrevendo via mock: %s", file_path)
    return _transcribe_mock(language)


# ── OpenAI Whisper ────────────────────────────────────────────────────────────

def _transcribe_openai(file_path: str, language: str) -> list[dict]:
    """
    Integração real com OpenAI Whisper API.
    Requer: pip install openai
    Documentação: https://platform.openai.com/docs/guides/speech-to-text
    """
    try:
        import openai  # noqa: PLC0415
    except ImportError:
        logger.error("Pacote 'openai' não instalado. Execute: pip install openai")
        raise RuntimeError(
            "Pacote 'openai' não encontrado. Instale com: pip install openai"
        )

    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    with open(file_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=language if language != "auto" else None,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    raw_segments = getattr(response, "segments", None) or []
    segments: list[dict] = []

    for i, seg in enumerate(raw_segments, start=1):
        text = seg.get("text", "").strip()
        if not text:
            continue
        # Quebra segmentos longos em blocos de ~7 palavras para melhor legibilidade
        sub_blocks = _split_long_text(text, seg.get("start", 0.0), seg.get("end", 0.0))
        for block in sub_blocks:
            block["index"] = len(segments) + 1
            segments.append(block)

    return segments


# ── Mock ──────────────────────────────────────────────────────────────────────

def _transcribe_mock(language: str = "pt") -> list[dict]:
    """
    Retorna segmentos de exemplo para desenvolvimento.
    Simula ~3 segundos de processamento.
    """
    time.sleep(3)

    if language in ("en", "english"):
        return [
            {"index": 1, "start": 0.0,  "end": 2.8,  "text": "Hello and welcome to this video."},
            {"index": 2, "start": 3.0,  "end": 6.2,  "text": "Today we'll cover a very important topic."},
            {"index": 3, "start": 6.5,  "end": 9.0,  "text": "Stay until the end so you don't miss anything."},
            {"index": 4, "start": 9.3,  "end": 12.5, "text": "This is an example of automatic subtitles."},
            {"index": 5, "start": 13.0, "end": 16.0, "text": "You can edit the text before exporting."},
            {"index": 6, "start": 16.3, "end": 19.5, "text": "The final video will include the subtitles burned in."},
            {"index": 7, "start": 20.0, "end": 23.2, "text": "Thank you for using Nezora Video."},
        ]

    return [
        {"index": 1, "start": 0.0,  "end": 2.8,  "text": "Olá, bem-vindo a este vídeo."},
        {"index": 2, "start": 3.0,  "end": 6.2,  "text": "Hoje vamos explorar um assunto muito importante."},
        {"index": 3, "start": 6.5,  "end": 9.0,  "text": "Fique até o final para não perder nada."},
        {"index": 4, "start": 9.3,  "end": 12.5, "text": "Este é um exemplo de legenda automática gerada pelo Nezora."},
        {"index": 5, "start": 13.0, "end": 16.0, "text": "Você pode editar o texto antes de exportar."},
        {"index": 6, "start": 16.3, "end": 19.5, "text": "O vídeo final terá as legendas embutidas."},
        {"index": 7, "start": 20.0, "end": 23.2, "text": "Obrigado por usar o Nezora Vídeo."},
    ]


# ── Utilitário ────────────────────────────────────────────────────────────────

def _split_long_text(text: str, start: float, end: float, max_words: int = 8) -> list[dict]:
    """Divide um bloco longo em sub-segmentos de até max_words palavras."""
    words = text.split()
    if len(words) <= max_words:
        return [{"start": start, "end": end, "text": text}]

    chunks: list[list[str]] = []
    for i in range(0, len(words), max_words):
        chunks.append(words[i : i + max_words])

    duration   = end - start
    chunk_dur  = duration / len(chunks)
    result: list[dict] = []

    for j, chunk in enumerate(chunks):
        result.append({
            "start": round(start + j * chunk_dur, 3),
            "end":   round(start + (j + 1) * chunk_dur, 3),
            "text":  " ".join(chunk),
        })
    return result
