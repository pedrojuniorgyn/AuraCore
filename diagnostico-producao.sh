#!/bin/bash
# Script de diagnóstico pós-deploy
# Verifica se correções foram aplicadas e diagnostica 504

CONTAINER_NAME="web-zksk8s0kk08sksgwggkos0gw-145917391493"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  DIAGNÓSTICO PÓS-DEPLOY - AuraCore Production                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "=== 1. CONTAINER STATUS ==="
docker ps | grep "zksk8s0kk08sksgwggkos0gw" | head -1
echo ""

echo "=== 2. VERIFICAR ERROS CORRIGIDOS (devem estar AUSENTES) ==="
echo ""
echo "2.1. Buscando 'e.limit is not a function'..."
COUNT_LIMIT=$(docker logs $CONTAINER_NAME 2>&1 | grep -c "e.limit is not a function")
if [ "$COUNT_LIMIT" -eq 0 ]; then
  echo "✅ ZERO ocorrências de 'e.limit is not a function'"
else
  echo "❌ ENCONTRADAS $COUNT_LIMIT ocorrências (PROBLEMA PERSISTE!)"
fi
echo ""

echo "2.2. Buscando 'e.offset(...).limit is not a function'..."
COUNT_OFFSET=$(docker logs $CONTAINER_NAME 2>&1 | grep -c "e.offset(...).*limit is not a function")
if [ "$COUNT_OFFSET" -eq 0 ]; then
  echo "✅ ZERO ocorrências de 'e.offset().limit'"
else
  echo "❌ ENCONTRADAS $COUNT_OFFSET ocorrências (PROBLEMA PERSISTE!)"
fi
echo ""

echo "2.3. Buscando 'Cannot read properties of undefined'..."
COUNT_UNDEF=$(docker logs $CONTAINER_NAME 2>&1 | grep -c "Cannot read properties of undefined")
if [ "$COUNT_UNDEF" -eq 0 ]; then
  echo "✅ ZERO ocorrências de 'undefined properties'"
else
  echo "❌ ENCONTRADAS $COUNT_UNDEF ocorrências"
fi
echo ""

echo "=== 3. VERIFICAR INICIALIZAÇÃO ==="
echo ""
echo "3.1. Next.js Ready?"
docker logs $CONTAINER_NAME 2>&1 | grep -E "(Ready in|Starting)" | tail -2
echo ""

echo "3.2. Módulos DDD Inicializados?"
docker logs $CONTAINER_NAME 2>&1 | grep -E "\[.*Module\].*registrado" | head -10
echo ""

echo "=== 4. VERIFICAR CONEXÃO COM BANCO ==="
echo ""
echo "4.1. Erros de conexão SQL Server?"
COUNT_SQL_ERRORS=$(docker logs $CONTAINER_NAME 2>&1 | grep -c "Login failed for user")
if [ "$COUNT_SQL_ERRORS" -eq 0 ]; then
  echo "✅ Nenhum erro de autenticação SQL"
else
  echo "⚠️  ENCONTRADOS $COUNT_SQL_ERRORS erros de login SQL"
  docker logs $CONTAINER_NAME 2>&1 | grep "Login failed" | tail -3
fi
echo ""

echo "4.2. Healthcheck Status?"
docker logs $CONTAINER_NAME 2>&1 | grep "ops.health" | tail -5
echo ""

echo "=== 5. TESTE INTERNO: API Responde? ==="
echo ""
echo "5.1. Teste /api/notifications (sem autenticação)..."
docker exec $CONTAINER_NAME curl -s -I http://localhost:3000/api/notifications?limit=5 2>&1 | head -10
echo ""

echo "5.2. Teste /api/health (se existir)..."
docker exec $CONTAINER_NAME curl -s http://localhost:3000/api/health 2>&1 | head -5
echo ""

echo "=== 6. ÚLTIMAS 30 LINHAS DO LOG ==="
docker logs $CONTAINER_NAME 2>&1 | tail -30
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  FIM DO DIAGNÓSTICO                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
