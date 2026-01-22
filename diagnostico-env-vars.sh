#!/bin/bash
# Comparar env vars entre containers antigo e novo

CONTAINER_NOVO="web-zksk8s0kk08sksgwggkos0gw-145917391493"
CONTAINER_ANTIGO="web-zksk8s0kk08sksgwggkos0gw-143322906072"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  COMPARAÇÃO DE VARIÁVEIS DE AMBIENTE                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "=== CONTAINER NOVO (50706698) ==="
docker exec $CONTAINER_NOVO env | grep -E "(DATABASE|MSSQL|DB_)" | sort
echo ""
echo "Total de env vars:"
docker exec $CONTAINER_NOVO env | wc -l
echo ""

echo "=== CONTAINER ANTIGO (1cb835c5) ==="
docker exec $CONTAINER_ANTIGO env | grep -E "(DATABASE|MSSQL|DB_)" | sort
echo ""
echo "Total de env vars:"
docker exec $CONTAINER_ANTIGO env | wc -l
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  DIAGNÓSTICO                                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Se o container ANTIGO tem DATABASE_URL mas o NOVO não:"
echo "  → Variáveis de ambiente NÃO foram copiadas para o novo deploy"
echo "  → Coolify precisa ter as env vars configuradas"
echo ""
echo "Ação necessária:"
echo "  1. Acessar Coolify → AuraCore → Environment Variables"
echo "  2. Adicionar DATABASE_URL com valor correto"
echo "  3. Fazer redeploy"
echo ""
