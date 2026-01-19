# ============================================================================
# Docling Service Dockerfile
# ============================================================================
# Imagem Python otimizada para processamento de documentos com Docling.
# Baseada em Python 3.11 slim para menor footprint.
#
# Build:
#   docker build -t auracore-docling .
#
# Run:
#   docker run -p 8000:8000 -v ./uploads:/app/uploads auracore-docling
# ============================================================================

FROM python:3.11-slim

# Metadados
LABEL maintainer="AuraCore Team"
LABEL description="Docling Service for PDF document processing"
LABEL version="1.0.0"

# Variáveis de ambiente
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema necessárias para Docling
# - libgl1: OpenCV
# - libglib2.0-0: GLib
# - poppler-utils: PDF utilities
# - tesseract-ocr: OCR engine
# - curl: Health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-por \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY app/ ./app/

# Criar diretório para uploads
RUN mkdir -p /app/uploads

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando de inicialização
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
