#!/bin/bash
# monitoring/start.sh
# Inicia stack de monitoramento AuraCore

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Iniciando stack de monitoramento AuraCore..."
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Criar diretórios se não existirem
mkdir -p prometheus alertmanager grafana/provisioning/datasources grafana/provisioning/dashboards grafana/dashboards

# Verificar se docker-compose existe
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose não encontrado!"
    exit 1
fi

# Subir containers
echo "📦 Subindo containers..."
$COMPOSE_CMD up -d

echo ""
echo -e "${GREEN}✅ Stack de monitoramento iniciada!${NC}"
echo ""
echo "📊 URLs:"
echo "   Grafana:      http://localhost:3001 (admin/auracore2026)"
echo "   Prometheus:   http://localhost:9090"
echo "   Alertmanager: http://localhost:9093"
echo ""
echo "📈 Dashboards disponíveis:"
echo "   - AuraCore - Agents Overview"
echo "   - AuraCore - Voice Interface"
echo "   - AuraCore - RAG & Knowledge Base"
echo ""
echo -e "${YELLOW}💡 Dica: Acesse Grafana > Explore para testar queries Prometheus${NC}"
