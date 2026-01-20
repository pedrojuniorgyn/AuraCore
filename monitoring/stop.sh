#!/bin/bash
# monitoring/stop.sh
# Para stack de monitoramento AuraCore

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Parando stack de monitoramento..."

# Verificar se docker-compose existe
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose não encontrado!"
    exit 1
fi

$COMPOSE_CMD down

echo "✅ Stack parada!"
