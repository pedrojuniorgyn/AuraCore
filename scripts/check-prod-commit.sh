#!/bin/bash
# check-prod-commit.sh - Verificar qual commit está em produção

echo "🔍 Verificando commit em produção..."
echo ""

# SSH e verificar
ssh root@srv1195982 << 'ENDSSH'
  # Encontrar container web
  WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
  
  if [ -z "$WEB" ]; then
    echo "❌ Container web não encontrado!"
    exit 1
  fi
  
  echo "✅ Container: $WEB"
  echo ""
  
  # Ver imagem (contém commit hash)
  IMAGE=$(docker ps --filter "name=$WEB" --format "{{.Image}}")
  COMMIT=$(echo $IMAGE | grep -oE '[a-f0-9]{40}')
  COMMIT_SHORT=$(echo $COMMIT | head -c 8)
  
  echo "📦 Imagem: $IMAGE"
  echo "🔖 Commit em produção: $COMMIT_SHORT"
  echo ""
  
  # Verificar schema deployado
  echo "📄 Schema deployado (accounts table):"
  docker exec $WEB sh -c "grep -A5 'export const accounts' /app/src/lib/db/schema.ts" 2>/dev/null | head -10
  echo ""
  
  # Verificar se usa userId ou user_id
  if docker exec $WEB sh -c "grep 'userId.*nvarchar.*\"userId\"' /app/src/lib/db/schema.ts" &>/dev/null; then
    echo "✅ Schema usa: userId (camelCase) ✅ CORRETO"
  elif docker exec $WEB sh -c "grep 'userId.*nvarchar.*\"user_id\"' /app/src/lib/db/schema.ts" &>/dev/null; then
    echo "❌ Schema usa: user_id (snake_case) ❌ ERRADO (bug conhecido)"
  else
    echo "⚠️  Não consegui detectar"
  fi
  
ENDSSH

echo ""
echo "=== 📊 Comparação com Local ==="
echo ""

# Mostrar commits locais
echo "Últimos 3 commits no repositório local:"
cd /Users/pedrolemes/aura_core
git log --oneline -3

echo ""
echo "=== 🎯 Análise ==="
echo ""
echo "Se commit em produção for anterior a cc4e1f0e:"
echo "  → Produção ainda tem o BUG (user_id ao invés de userId)"
echo "  → Solução: Aguardar deploy automático ou forçar redeploy"
echo ""
echo "Se commit em produção for cc4e1f0e ou posterior:"
echo "  → Schema está CORRETO (userId)"
echo "  → Problema pode ser cache ou banco real usa snake_case"
echo "  → Solução: Executar debug-coolify-schema.sh completo"
