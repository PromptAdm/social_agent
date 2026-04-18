"""
Renderização de vídeo com legendas embutidas via FFmpeg.

FFmpeg deve estar instalado no sistema.
  - Linux/Mac: disponível via apt/brew
  - Windows:   download em https://ffmpeg.org/download.html e adicionar ao PATH
  - Docker:    incluir no Dockerfile: RUN apt-get install -y ffmpeg

Quando FFmpeg não está disponível, lança FFmpegNotAvailable.
O router trata esse caso e ainda entrega o arquivo SRT ao usuário.
"""

import logging
import shutil
import subprocess
import sys
from pathlib import Path

from app.core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()


class FFmpegNotAvailable(RuntimeError):
    """FFmpeg não encontrado no sistema."""


# ── API pública ───────────────────────────────────────────────────────────────

def render_with_subtitles_sync(input_path: str, srt_path: str, output_path: str) -> None:
    """
    Grava um novo vídeo com as legendas do SRT embutidas (hard-coded).

    Args:
        input_path:  caminho absoluto do vídeo original.
        srt_path:    caminho absoluto do arquivo .srt gerado.
        output_path: caminho absoluto onde o vídeo renderizado será salvo.

    Raises:
        FFmpegNotAvailable: se o binário ffmpeg não for encontrado.
        RuntimeError:       se o FFmpeg retornar código de saída diferente de 0.
    """
    ffmpeg_bin = _find_ffmpeg()

    srt_dir  = str(Path(srt_path).parent)
    srt_name = Path(srt_path).name

    # Usa cwd=srt_dir + nome sem caminho para evitar problemas com ':' no Windows
    cmd = [
        ffmpeg_bin, "-y",
        "-i", input_path,
        "-vf", f"subtitles={srt_name}",
        "-c:v", "libx264",
        "-crf", "23",
        "-preset", "fast",
        "-c:a", "copy",
        output_path,
    ]

    logger.info("FFmpeg render: %s → %s", input_path, output_path)

    result = subprocess.run(
        cmd,
        cwd=srt_dir,          # SRT referenciado por nome relativo
        capture_output=True,
        text=True,
        timeout=600,          # 10 min máximo
    )

    if result.returncode != 0:
        tail = result.stderr[-800:] if result.stderr else "(sem saída)"
        logger.error("FFmpeg falhou (code %d): %s", result.returncode, tail)
        raise RuntimeError(f"FFmpeg retornou código {result.returncode}. Detalhe: {tail}")

    logger.info("FFmpeg render concluído: %s", output_path)


def is_available() -> bool:
    """Retorna True se FFmpeg estiver instalado e no PATH."""
    try:
        _find_ffmpeg()
        return True
    except FFmpegNotAvailable:
        return False


# ── Privado ───────────────────────────────────────────────────────────────────

def _find_ffmpeg() -> str:
    candidates = [
        settings.FFMPEG_PATH,          # caminho explícito no .env
        shutil.which("ffmpeg"),        # PATH do sistema
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ]
    if sys.platform == "win32":
        candidates += [r"C:\ffmpeg\bin\ffmpeg.exe"]

    for c in candidates:
        if c and Path(c).is_file():
            return c

    raise FFmpegNotAvailable(
        "FFmpeg não encontrado. Instale em https://ffmpeg.org/download.html "
        "e adicione ao PATH, ou defina FFMPEG_PATH no .env."
    )
