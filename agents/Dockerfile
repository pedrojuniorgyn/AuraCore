# =============================================================================
# AURACORE AGENTS - DOCKERFILE
# =============================================================================
# Multi-stage build para imagem otimizada
# Version: 2.0.0
# =============================================================================

# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.12-slim as builder

# Variáveis de build
ARG POETRY_VERSION=1.7.1

# Instalar dependências de build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar Poetry
RUN pip install --no-cache-dir poetry==${POETRY_VERSION}

# Configurar Poetry
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app

# Copiar arquivos de dependências
COPY pyproject.toml poetry.lock* ./

# Instalar dependências (sem dev)
RUN --mount=type=cache,target=/tmp/poetry_cache \
    poetry install --without dev --no-root || \
    pip install --no-cache-dir -e .

# ============================================
# Stage 2: Runtime
# ============================================
FROM python:3.12-slim as runtime

# Labels
LABEL org.opencontainers.image.title="AuraCore Agents" \
      org.opencontainers.image.description="AI Agents for Brazilian ERP" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.vendor="AuraCore" \
      org.opencontainers.image.source="https://github.com/pedrojuniorgyn/AuraCore"

# Variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH" \
    APP_HOME=/app

# Criar usuário não-root
RUN groupadd --gid 1000 auracore && \
    useradd --uid 1000 --gid auracore --shell /bin/bash --create-home auracore

# Instalar dependências de runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR ${APP_HOME}

# Copiar virtualenv do builder (se existir) ou site-packages
COPY --from=builder /app/.venv ./.venv
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copiar código da aplicação
COPY --chown=auracore:auracore src/ ./src/
COPY --chown=auracore:auracore tests/ ./tests/

# Criar diretórios de dados
RUN mkdir -p /app/data/memory /app/data/logs /app/.cache && \
    chown -R auracore:auracore /app

# Mudar para usuário não-root
USER auracore

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Porta
EXPOSE 8000

# Comando de inicialização
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
