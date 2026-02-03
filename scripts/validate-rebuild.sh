#!/bin/bash
# validate-rebuild.sh - Validar se rebuild corrigiu o bug userId

echo "🔍 Validando rebuild do commit 70b8822b..."
echo ""

# Executar no servidor
ssh root@srv1195982 << 'ENDSSH'
  # Encontrar container web
  WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
  
  if [ -z "$WEB" ]; then
    echo "❌ Container web não encontrado! Deploy ainda em andamento?"
    exit 1
  fi
  
  # Ver commit e data de criação
  IMAGE=$(docker ps --filter "name=$WEB" --format "{{.Image}}")
  COMMIT=$(echo $IMAGE | grep -oE '[a-f0-9]{40}' | head -c 8)
  CREATED=$(docker ps --filter "name=$WEB" --format "{{.CreatedAt}}")
  
  echo "=== 📦 CONTAINER ==="
  echo "Nome: $WEB"
  echo "Commit: $COMMIT"
  echo "Criado: $CREATED"
  echo ""
  
  # Verificar se é o commit correto
  if [ "$COMMIT" != "70b8822b" ]; then
    echo "⚠️  Commit esperado: 70b8822b"
    echo "⚠️  Commit em produção: $COMMIT"
    echo ""
    echo "Deploy ainda não terminou ou falhou."
    echo "Aguarde mais alguns minutos ou verifique logs do Coolify."
    exit 1
  fi
  
  echo "✅ Commit correto em produção!"
  echo ""
  
  # Verificar schema
  echo "=== 📄 SCHEMA DEPLOYADO ==="
  SCHEMA_LINE=$(docker exec $WEB grep 'userId.*nvarchar' /app/src/lib/db/schema.ts | head -1)
  echo "$SCHEMA_LINE"
  echo ""
  
  if echo "$SCHEMA_LINE" | grep -q 'nvarchar("userId"'; then
    echo "✅ Schema CORRETO! Usando userId (camelCase)"
  elif echo "$SCHEMA_LINE" | grep -q 'nvarchar("user_id"'; then
    echo "❌ Schema ERRADO! Ainda usando user_id (snake_case)"
    echo ""
    echo "⚠️  Cache não foi limpo. Execute:"
    echo "   Via painel: https://coolify.auracore.cloud → Redeploy com No Cache"
    echo "   Ou force rebuild manual (ver REBUILD_STATUS.md)"
    exit 1
  else
    echo "⚠️  Não consegui detectar. Linha encontrada:"
    echo "$SCHEMA_LINE"
  fi
  echo ""
  
ENDSSH

# Testar API
echo "=== 🧪 TESTE DA API ==="
echo "Testando: GET /api/admin/users"
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://tcl.auracore.cloud/api/admin/users)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API retornou 200 OK!"
  
  # Ver quantos usuários
  USER_COUNT=$(curl -s https://tcl.auracore.cloud/api/admin/users | jq '. | length' 2>/dev/null)
  if [ ! -z "$USER_COUNT" ]; then
    echo "✅ $USER_COUNT usuário(s) encontrado(s)"
  fi
elif [ "$HTTP_CODE" = "500" ]; then
  echo "❌ API ainda retorna 500 Internal Server Error"
  echo ""
  echo "Possíveis causas:"
  echo "1. Container não terminou de iniciar (aguarde 1-2 min)"
  echo "2. Cache não foi limpo (forçar rebuild manual)"
  echo "3. Outro erro no código (verificar logs)"
  echo ""
  echo "Verificar logs:"
  echo "  ssh root@srv1195982"
  echo "  docker logs \$(docker ps --filter 'name=web-zksk8s0kk08sksgwggkos0gw' --format '{{.Names}}' | head -1) --tail=50"
else
  echo "⚠️  HTTP $HTTP_CODE (inesperado)"
fi

echo ""
echo "=== 📊 RESUMO ==="
echo ""

# Verificar se tudo passou
if [ "$HTTP_CODE" = "200" ]; then
  echo "🎉 BUG RESOLVIDO! ✅"
  echo ""
  echo "Tudo funcionando:"
  echo "  ✅ Commit 70b8822b deployado"
  echo "  ✅ Schema userId correto"
  echo "  ✅ API retornando 200 OK"
  echo ""
  echo "Próximos passos:"
  echo "  1. Testar UI: https://tcl.auracore.cloud/configuracoes/usuarios"
  echo "  2. Validar outras páginas afetadas"
  echo "  3. Monitorar logs por 24h"
else
  echo "⚠️  PROBLEMA PERSISTE"
  echo ""
  echo "Próximos passos:"
  echo "  1. Aguardar mais 2-3 minutos (deploy pode estar finalizando)"
  echo "  2. Re-executar este script: ~/aura_core/scripts/validate-rebuild.sh"
  echo "  3. Se persistir: Forçar rebuild manual (ver REBUILD_STATUS.md)"
fi

echo ""
