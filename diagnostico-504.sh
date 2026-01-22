#!/bin/bash
# Diagnóstico específico para erro 504 Gateway Timeout

CONTAINER_NAME="web-zksk8s0kk08sksgwggkos0gw-145917391493"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  DIAGNÓSTICO 504 - Gateway Timeout                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "=== 1. CONTAINER ESTÁ REALMENTE RODANDO? ==="
docker inspect $CONTAINER_NAME --format='{{.State.Status}}' 2>&1
echo ""

echo "=== 2. NEXT.JS INICIOU? ==="
docker logs $CONTAINER_NAME 2>&1 | grep -E "(Ready in|Local:|Network:)" | tail -5
echo ""

echo "=== 3. PORTA 3000 ESTÁ ESCUTANDO? ==="
docker exec $CONTAINER_NAME sh -c "command -v ss && ss -tlnp | grep 3000 || echo 'ss não disponível, tentando netstat...'" 2>&1
docker exec $CONTAINER_NAME sh -c "command -v netstat && netstat -tlnp | grep 3000 || echo 'netstat não disponível'" 2>&1
echo ""

echo "=== 4. PROCESSO NODE ATIVO? ==="
docker exec $CONTAINER_NAME sh -c "command -v ps && ps aux | grep node || echo 'ps não disponível'" 2>&1
echo ""

echo "=== 5. TESTE DIRETO HTTP (sem curl)...  ==="
docker exec $CONTAINER_NAME sh -c "command -v wget && timeout 5 wget -O- http://localhost:3000/api/notifications?limit=5 2>&1 | head -20 || echo 'wget não disponível'" 2>&1
echo ""

echo "=== 6. VARIÁVEIS DE AMBIENTE CRÍTICAS ==="
docker exec $CONTAINER_NAME env | grep -E "(DATABASE_URL|MSSQL|NODE_ENV|PORT)" | head -10
echo ""

echo "=== 7. ERROS DE INICIALIZAÇÃO DI ==="
docker logs $CONTAINER_NAME 2>&1 | grep -i "failed to initialize" | tail -5
echo ""

echo "=== 8. ERROS SQL (Login Failed) ==="
docker logs $CONTAINER_NAME 2>&1 | grep -i "login failed" | tail -5
echo ""

echo "=== 9. ÚLTIMO HEALTHCHECK ==="
docker logs $CONTAINER_NAME 2>&1 | grep "ops.health" | tail -3
echo ""

echo "=== 10. ERROS RECENTES (últimas 50 linhas) ==="
docker logs $CONTAINER_NAME 2>&1 | grep -iE "(error|exception|fatal)" | tail -10
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ANÁLISE DO 504                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Causas comuns do 504 Gateway Timeout:"
echo ""
echo "1. ❌ Banco de dados inacessível (Login failed)"
echo "   → Verificar DATABASE_URL nas env vars"
echo "   → Verificar credenciais SQL Server"
echo ""
echo "2. ❌ DI Container falhou na inicialização"
echo "   → Verificar 'Failed to initialize DDD modules'"
echo "   → Verificar dependências circulares"
echo ""
echo "3. ❌ Next.js não iniciou completamente"
echo "   → Verificar 'Ready in XXXms'"
echo "   → Verificar porta 3000 está escutando"
echo ""
echo "4. ❌ Timeout no proxy Coolify"
echo "   → Verificar configuração de timeout"
echo "   → Aumentar timeout para 120s+"
echo ""
