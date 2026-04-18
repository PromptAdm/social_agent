"""
Serviço de geração de imagens para o módulo Árvore de Imagens.

Providers suportados (IMAGE_PROVIDER):
  mock   — SVG colorido por família, sem custo externo (desenvolvimento)
  openai — DALL-E 3 (requer OPENAI_API_KEY — placeholder para evolução)

Modos e famílias geradas:
  fast     → 1 família, 4 imagens  (10 créditos)
  creative → 2 famílias, 4 imagens cada  (20 créditos)
  campaign → 3 famílias, 4 imagens cada  (30 créditos)

Cada família é um dicionário serializável que vai para metadata_json de
GenerationResult(result_type="families"). A estrutura de famílias é a
"árvore" — cada nó-raiz é uma família visual, e cada folha é uma variação
de imagem dentro dessa família.
"""

import time
import uuid
from pathlib import Path

from app.core.config import get_settings
from app.services import storage_service

settings = get_settings()


# ── Configuração de famílias por estilo ───────────────────────────────────────

_FAMILY_CONFIGS: dict[str, list[dict]] = {
    "minimalist": [
        {
            "name": "Minimalista Clean",
            "colors": ("#F8FAFC", "#64748B", "#CBD5E1"),
            "desc": "Espaço negativo generoso, tipografia fina, paleta neutra — menos é mais",
        },
        {
            "name": "Minimalista Premium",
            "colors": ("#0F0F0F", "#E2E8F0", "#6366F1"),
            "desc": "Dark minimalismo com acentos índigo — elegância sofisticada",
        },
        {
            "name": "Minimalista Editorial",
            "colors": ("#FFFBF0", "#1C1917", "#D97706"),
            "desc": "Editorial com warm whites, contraste máximo e detalhe dourado",
        },
    ],
    "bold": [
        {
            "name": "Bold Impacto",
            "colors": ("#0F0F0F", "#6366F1", "#A5B4FC"),
            "desc": "Tipografia oversized, contraste extremo, presença marcante de marca",
        },
        {
            "name": "Bold Vibrante",
            "colors": ("#7C3AED", "#EC4899", "#FCD34D"),
            "desc": "Gradientes vibrantes, energia máxima, youth appeal imediato",
        },
        {
            "name": "Bold Ousado",
            "colors": ("#DC2626", "#1C1917", "#FEF2F2"),
            "desc": "Vermelho dominante, alto impacto emocional, força da marca",
        },
    ],
    "lifestyle": [
        {
            "name": "Lifestyle Natural",
            "colors": ("#F0FDF4", "#166534", "#BBF7D0"),
            "desc": "Verde orgânico, sensação de natureza, autenticidade e cuidado",
        },
        {
            "name": "Lifestyle Urbano",
            "colors": ("#1E293B", "#F59E0B", "#FEF3C7"),
            "desc": "Paleta urbana quente, estilo de vida contemporâneo e aspiracional",
        },
        {
            "name": "Lifestyle Premium",
            "colors": ("#F9F5F1", "#78350F", "#FBBF24"),
            "desc": "Tons terrosos luxuosos — autêntico e aspiracional ao mesmo tempo",
        },
    ],
    "corporate": [
        {
            "name": "Corporate Trust",
            "colors": ("#1E3A5F", "#FFFFFF", "#3B82F6"),
            "desc": "Azul institucional clássico, credibilidade e confiança sólida",
        },
        {
            "name": "Corporate Moderno",
            "colors": ("#0F172A", "#E2E8F0", "#6366F1"),
            "desc": "Corporativo moderno com acentos índigo — inovação com seriedade",
        },
        {
            "name": "Corporate Acolhedor",
            "colors": ("#1C1917", "#FAFAF9", "#D97706"),
            "desc": "Corporativo acolhedor com acentos âmbar — humano e confiável",
        },
    ],
    "artistic": [
        {
            "name": "Artístico Expressivo",
            "colors": ("#18181B", "#A78BFA", "#34D399"),
            "desc": "Cores inesperadas, composição dinâmica e livre, arte autoral",
        },
        {
            "name": "Artístico Etéreo",
            "colors": ("#EDE9FE", "#7C3AED", "#C4B5FD"),
            "desc": "Paleta lavanda etérea — softness poético com profundidade visual",
        },
        {
            "name": "Artístico Raw",
            "colors": ("#0C0A09", "#F5F0E8", "#EF4444"),
            "desc": "Textura bruta, contraste máximo, autenticidade crua e impactante",
        },
    ],
    "playful": [
        {
            "name": "Playful Alegre",
            "colors": ("#FEF9C3", "#F59E0B", "#EF4444"),
            "desc": "Cores quentes e alegres, energia positiva, convida à interação",
        },
        {
            "name": "Playful Pop",
            "colors": ("#FCE7F3", "#EC4899", "#8B5CF6"),
            "desc": "Pop colorido, diversão imediata e memorabilidade de marca",
        },
        {
            "name": "Playful Fresco",
            "colors": ("#ECFDF5", "#10B981", "#3B82F6"),
            "desc": "Frescor e leveza — agradável, acessível e de fácil absorção",
        },
    ],
}

_DEFAULT_FAMILY_CONFIGS = [
    {
        "name": "Direção Principal",
        "colors": ("#0F172A", "#6366F1", "#A5B4FC"),
        "desc": "Direção visual principal derivada da referência e descrição fornecidas",
    },
    {
        "name": "Direção Alternativa",
        "colors": ("#1E1B4B", "#7C3AED", "#DDD6FE"),
        "desc": "Abordagem alternativa com variação de tom e composição",
    },
    {
        "name": "Direção Complementar",
        "colors": ("#18181B", "#D97706", "#FEF3C7"),
        "desc": "Contraponto visual que complementa a identidade da marca",
    },
]

_IMAGES_PER_FAMILY = 4

_MODE_FAMILIES: dict[str, int] = {
    "fast":     1,
    "creative": 2,
    "campaign": 3,
}

_CREDIT_COSTS: dict[str, int] = {
    "fast":     10,
    "creative": 20,
    "campaign": 30,
}

_VARIANT_LABELS = ["Principal", "Variação A", "Variação B", "Variação C"]


# ── API pública ───────────────────────────────────────────────────────────────

def credit_cost_for_mode(mode: str) -> int:
    return _CREDIT_COSTS.get(mode, 10)


def generate_families_sync(
    project_id: int,
    user_id: int,
    direction: dict,
    ref_paths: list[str],
) -> list[dict]:
    """
    Gera famílias visuais em modo síncrono (chamado via BackgroundTasks).

    Retorna lista de dicts serializáveis compatíveis com ImageFamilyOut.
    """
    provider = getattr(settings, "IMAGE_PROVIDER", "mock")
    if provider == "openai":
        return _generate_openai(project_id, user_id, direction, ref_paths)
    return _generate_mock(project_id, user_id, direction)


def generate_refinement_sync(
    project_id: int,
    user_id: int,
    original_family: dict,
    refine_direction: str,
) -> dict:
    """
    Gera uma nova família como variação/refinamento de uma família existente.
    Retorna um único dict de família pronto para ser anexado à lista.
    """
    provider = getattr(settings, "IMAGE_PROVIDER", "mock")
    if provider == "openai":
        raise NotImplementedError("Refinamento OpenAI ainda não implementado.")
    return _generate_refined_mock(project_id, user_id, original_family, refine_direction)


# ── Geração mock ──────────────────────────────────────────────────────────────

def _generate_mock(project_id: int, user_id: int, direction: dict) -> list[dict]:
    time.sleep(3)  # simular latência de chamada de API

    style      = direction.get("style", "bold")
    mode       = direction.get("mode", "fast")
    desc       = direction.get("description", "")
    tone       = direction.get("tone", "professional")
    n_families = _MODE_FAMILIES.get(mode, 1)

    configs    = _FAMILY_CONFIGS.get(style, _DEFAULT_FAMILY_CONFIGS)
    output_dir = storage_service.get_output_dir(user_id, "image", project_id)

    families = []
    for fam_idx in range(n_families):
        cfg       = configs[fam_idx % len(configs)]
        family_id = str(uuid.uuid4())
        images    = _render_family_images(output_dir, cfg, fam_idx, style, tone, desc)

        families.append({
            "family_id":     family_id,
            "family_name":   cfg["name"],
            "style_variant": style,
            "description":   cfg["desc"],
            "images":        images,
        })

    return families


def _generate_refined_mock(
    project_id: int,
    user_id: int,
    original_family: dict,
    refine_direction: str,
) -> dict:
    time.sleep(2)  # refinamento é mais rápido

    style   = original_family.get("style_variant", "bold")
    configs = _FAMILY_CONFIGS.get(style, _DEFAULT_FAMILY_CONFIGS)

    # Escolhe a próxima configuração de cor para diferenciar do original
    orig_name = original_family.get("family_name", "")
    names     = [c["name"] for c in configs]
    try:
        next_idx = (names.index(orig_name) + 1) % len(configs)
    except ValueError:
        next_idx = 1 % len(configs)

    cfg        = configs[next_idx]
    family_id  = str(uuid.uuid4())
    output_dir = storage_service.get_output_dir(user_id, "image", project_id)
    ref_suffix = int(uuid.uuid4().int % 1000)  # evitar colisão de nome de arquivo

    images = _render_family_images(
        output_dir, cfg,
        fam_idx=ref_suffix,
        style=style,
        tone="refined",
        desc=refine_direction,
    )

    return {
        "family_id":     family_id,
        "family_name":   f"{cfg['name']} — Refinado",
        "style_variant": style,
        "description":   f"Refinamento: {refine_direction[:80]}. {cfg['desc']}",
        "images":        images,
        "refined_from":  original_family.get("family_id"),
    }


def _generate_openai(
    project_id: int,
    user_id: int,
    direction: dict,
    ref_paths: list[str],
) -> list[dict]:
    """Placeholder para geração real via DALL-E 3 ou GPT-Image-1."""
    raise NotImplementedError(
        "Geração OpenAI ainda não implementada. Defina IMAGE_PROVIDER=mock."
    )


# ── Renderização SVG ──────────────────────────────────────────────────────────

def _render_family_images(
    output_dir: Path,
    cfg: dict,
    fam_idx: int,
    style: str,
    tone: str,
    desc: str,
) -> list[dict]:
    images = []
    for var_idx in range(_IMAGES_PER_FAMILY):
        svg_content = _make_svg(
            family_name=cfg["name"],
            variant_index=var_idx,
            colors=cfg["colors"],
            style=style,
            tone=tone,
        )
        filename  = f"fam_{fam_idx}_{var_idx}.svg"
        file_path = output_dir / filename
        file_path.write_text(svg_content, encoding="utf-8")
        file_url  = storage_service.relative_url(file_path)
        prompt    = _build_prompt(cfg["name"], var_idx, style, tone, desc)

        images.append({
            "file_path":     str(file_path),
            "file_url":      file_url,
            "prompt_used":   prompt,
            "variant_index": var_idx,
        })
    return images


def _make_svg(
    family_name: str,
    variant_index: int,
    colors: tuple[str, str, str],
    style: str,
    tone: str,
) -> str:
    bg, fg, accent = colors
    var_label = _VARIANT_LABELS[variant_index % len(_VARIANT_LABELS)]
    bg_dark   = _darken(bg)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">\n'
        f'  <defs>\n'
        f'    <linearGradient id="bg{variant_index}" x1="0%" y1="0%" x2="100%" y2="100%">\n'
        f'      <stop offset="0%" stop-color="{bg}" />\n'
        f'      <stop offset="100%" stop-color="{bg_dark}" />\n'
        f'    </linearGradient>\n'
        f'    <linearGradient id="ac{variant_index}" x1="0%" y1="0%" x2="100%" y2="0%">\n'
        f'      <stop offset="0%" stop-color="{accent}" />\n'
        f'      <stop offset="100%" stop-color="{fg}" />\n'
        f'    </linearGradient>\n'
        f'  </defs>\n'
        f'  <rect width="1080" height="1080" fill="url(#bg{variant_index})" />\n'
        f'  <rect x="80" y="80" width="920" height="920" fill="none" stroke="{accent}" stroke-width="1" opacity="0.25" />\n'
        f'  <circle cx="980" cy="140" r="180" fill="{accent}" opacity="0.08" />\n'
        f'  <circle cx="980" cy="140" r="80"  fill="{accent}" opacity="0.12" />\n'
        f'  <rect x="0" y="820" width="1080" height="260" fill="{fg}" opacity="0.05" />\n'
        f'  <rect x="80" y="500" width="240" height="3" fill="url(#ac{variant_index})" />\n'
        f'  <text x="80" y="460" font-family="system-ui,-apple-system,sans-serif" font-size="54" font-weight="700" fill="{fg}" opacity="0.92">{_esc(family_name)}</text>\n'
        f'  <text x="80" y="530" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="400" fill="{fg}" opacity="0.45">{var_label} &middot; {style.upper()}</text>\n'
        f'  <text x="80" y="940" font-family="system-ui,-apple-system,sans-serif" font-size="16" fill="{accent}" opacity="0.6">NEZORA STUDIO &middot; {tone.upper()}</text>\n'
        f'</svg>'
    )


def _darken(hex_color: str) -> str:
    """Escurece levemente uma cor hex para gradiente de fundo."""
    try:
        h = hex_color.lstrip("#")
        if len(h) != 6:
            return hex_color
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        r2, g2, b2 = int(r * 0.72), int(g * 0.72), int(b * 0.72)
        return f"#{r2:02X}{g2:02X}{b2:02X}"
    except Exception:
        return hex_color


def _esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _build_prompt(family_name: str, variant_index: int, style: str, tone: str, desc: str) -> str:
    variants = [
        "composição principal",
        "variação com mais contraste",
        "variação com composição alternativa",
        "versão com enquadramento diferente",
    ]
    v = variants[variant_index % len(variants)]
    ctx = desc[:80] if desc else "projeto visual"
    return f"{family_name} — {v}. Estilo: {style}, tom: {tone}. Contexto: {ctx}."
