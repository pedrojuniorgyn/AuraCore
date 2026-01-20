# =============================================================================
# AURACORE AGENTS - DOCKERFILE
# =============================================================================
# Multi-stage build para imagem otimizada
# Version: 2.1.0
# =============================================================================

# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Instalar dependências de build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos necessários para o build
# IMPORTANTE: README.md é obrigatório pelo pyproject.toml (hatchling)
COPY pyproject.toml README.md ./

# Criar diretório src vazio para evitar erros de build
RUN mkdir -p src

# Instalar dependências
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# ============================================
# Stage 2: Runtime
# ============================================
FROM python:3.11-slim AS runtime

# Labels
LABEL org.opencontainers.image.title="AuraCore Agents" \
      org.opencontainers.image.description="AI Agents for Brazilian ERP" \
      org.opencontainers.image.version="2.1.0" \
      org.opencontainers.image.vendor="AuraCore" \
      org.opencontainers.image.source="https://github.com/pedrojuniorgyn/AuraCore"

# Variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PYTHONPATH=/app \
    APP_HOME=/app

# Criar usuário não-root
RUN groupadd --gid 1000 auracore && \
    useradd --uid 1000 --gid auracore --shell /bin/bash --create-home auracore

# Instalar dependências de runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR ${APP_HOME}

# Copiar site-packages do builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
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
