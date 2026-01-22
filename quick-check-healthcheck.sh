#!/bin/bash
# Verificação rápida do healthcheck

CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

if [ -z "$CONTAINER" ]; then
  echo "❌ Container não encontrado!"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  QUICK CHECK - HEALTHCHECK                                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Container: $CONTAINER"
echo ""

echo "=== 1. APP_URL (verificar typo 'clud') ==="
APP_URL=$(docker exec $CONTAINER env | grep "^APP_URL=")
echo "$APP_URL"
if echo "$APP_URL" | grep -q "clud"; then
  echo "❌ TYPO DETECTADO: 'clud' deve ser 'cloud'"
  echo "   Corrigir no Coolify: APP_URL=https://tcl.auracore.cloud"
else
  echo "✅ APP_URL correto"
fi
echo ""

echo "=== 2. AUTH_SECRET (deve existir) ==="
AUTH_SECRET=$(docker exec $CONTAINER env | grep "^AUTH_SECRET=")
if [ -z "$AUTH_SECRET" ]; then
  echo "❌ AUTH_SECRET não encontrado!"
  echo "   Adicionar no Coolify: AUTH_SECRET=<valor-secreto>"
else
  echo "✅ AUTH_SECRET existe"
fi
echo ""

echo "=== 3. ÚLTIMO HEALTHCHECK ==="
docker logs $CONTAINER 2>&1 | grep "ops.health.finished" | tail -1 | jq -r '
  if .status == "SUCCEEDED" then
    "✅ HEALTHCHECK OK - Status: \(.status), Falhas: \(.failedCount)"
  else
    "❌ HEALTHCHECK FALHOU - Status: \(.status), Falhas: \(.failedCount)"
  end
' 2>/dev/null || docker logs $CONTAINER 2>&1 | grep "ops.health.finished" | tail -1
echo ""

echo "=== 4. LOGS DETALHADOS (últimas 3 tentativas) ==="
docker logs $CONTAINER 2>&1 | grep "ops.health" | tail -6
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  AÇÃO NECESSÁRIA                                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if echo "$APP_URL" | grep -q "clud"; then
  echo "🔴 ALTA PRIORIDADE: Corrigir typo em APP_URL"
  echo "   1. Coolify → Environment Variables"
  echo "   2. APP_URL → Update"
  echo "   3. Alterar 'clud' para 'cloud'"
  echo "   4. Redeploy"
  echo ""
fi

FAILED=$(docker logs $CONTAINER 2>&1 | grep "ops.health.finished" | tail -1 | grep -c "FAILED")
if [ "$FAILED" -gt 0 ]; then
  echo "⚠️  Healthcheck ainda falhando após correção APP_URL?"
  echo "   → Executar: cat fix-healthcheck.md"
  echo "   → Verificar tabela idempotency_keys"
else
  echo "✅ Tudo OK! Nenhuma ação necessária."
fi
