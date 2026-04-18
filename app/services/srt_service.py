"""
Geração e parsing de arquivos SRT (SubRip Text).
Puro Python, sem dependências externas.
"""

import re


def _fmt_ts(seconds: float) -> str:
    h  = int(seconds // 3600)
    m  = int((seconds % 3600) // 60)
    s  = int(seconds % 60)
    ms = int(round((seconds % 1) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def segments_to_srt(segments: list[dict]) -> str:
    """Converte lista de segmentos em conteúdo SRT."""
    lines: list[str] = []
    for i, seg in enumerate(segments, start=1):
        lines.append(str(seg.get("index", i)))
        lines.append(f"{_fmt_ts(seg['start'])} --> {_fmt_ts(seg['end'])}")
        lines.append(seg["text"].strip())
        lines.append("")
    return "\n".join(lines)


def parse_srt(content: str) -> list[dict]:
    """Converte conteúdo SRT de volta em lista de segmentos."""
    _TS = r"(\d{2}:\d{2}:\d{2},\d{3})"
    _BLOCK = re.compile(
        rf"(\d+)\r?\n{_TS} --> {_TS}\r?\n([\s\S]*?)(?=\n\n|\Z)",
        re.MULTILINE,
    )
    segments = []
    for m in _BLOCK.finditer(content.strip()):
        idx, start_s, end_s, text = m.group(1), m.group(2), m.group(3), m.group(4)
        segments.append({
            "index": int(idx),
            "start": _ts_to_seconds(start_s),
            "end":   _ts_to_seconds(end_s),
            "text":  text.strip(),
        })
    return segments


def _ts_to_seconds(ts: str) -> float:
    h, m, rest = ts.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
