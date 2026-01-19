#!/bin/bash
#
# Setup ChromaDB para o AuraCore Knowledge Base
#
# Este script inicia o ChromaDB usando Docker e verifica a conexão.
#
# Uso:
#   ./scripts/setup-chromadb.sh
#
# Requisitos:
#   - Docker instalado e rodando
#

set -e

echo "=============================================="
echo " AuraCore - Setup ChromaDB"
echo "=============================================="
echo ""

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

echo "✅ Docker está rodando"

# Navegar para o diretório do ChromaDB
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROMA_DIR="$SCRIPT_DIR/../docker/chroma"

if [ ! -d "$CHROMA_DIR" ]; then
    echo "❌ Diretório docker/chroma não encontrado"
    exit 1
fi

cd "$CHROMA_DIR"

echo ""
echo "📦 Iniciando ChromaDB..."

# Criar rede se não existir
docker network create auracore-network 2>/dev/null || true

# Subir ChromaDB
docker compose up -d

echo ""
echo "⏳ Aguardando ChromaDB inicializar..."
sleep 5

# Verificar saúde
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:8001/api/v1/heartbeat > /dev/null 2>&1; then
        echo ""
        echo "=============================================="
        echo "✅ ChromaDB está rodando!"
        echo ""
        echo "   API: http://localhost:8001"
        echo "   Health: http://localhost:8001/api/v1/heartbeat"
        echo ""
        echo "Variáveis de ambiente para .env.local:"
        echo ""
        echo "   CHROMA_HOST=localhost"
        echo "   CHROMA_PORT=8001"
        echo "   CHROMA_COLLECTION=auracore_knowledge"
        echo "   VECTOR_STORE_TYPE=chroma"
        echo ""
        echo "=============================================="
        exit 0
    fi

    echo "   Tentativa $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "❌ ChromaDB não respondeu após $MAX_ATTEMPTS tentativas."
echo ""
echo "Verifique os logs:"
echo "   docker compose logs -f"
exit 1
