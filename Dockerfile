# ─────────────────────────────────────────────────────────────────────────────
# Social Agent — Dockerfile (backend)
# Build:  docker build -t social-agent-api .
# Run:    docker run -p 8000:8000 --env-file .env.prod social-agent-api
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependências ─────────────────────────────────────────────────────
FROM python:3.12-slim AS deps

WORKDIR /app

# Instalar dependências do sistema necessárias para psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


# ── Stage 2: imagem final ─────────────────────────────────────────────────────
FROM python:3.12-slim AS final

WORKDIR /app

# Dependências de runtime do psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copiar pacotes instalados do stage deps
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copiar código-fonte
COPY . .

# Criar usuário não-root para segurança
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

# Variáveis de ambiente padrão (override via --env-file ou platform env vars)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

# Entrypoint: gunicorn com workers uvicorn para produção
# --workers: recomendado (2 × CPU cores) + 1. Render free tier = 1 vCPU → 3 workers.
CMD gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 3 \
    --bind 0.0.0.0:${PORT} \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile -
