#!/bin/bash
# debug-coolify-schema.sh - Diagnosticar schema mismatch no Coolify

echo "🔍 DIAGNÓSTICO COMPLETO - Schema Mismatch (userId vs user_id)"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Container names (pode mudar a cada deploy)
WEB_CONTAINER_PATTERN="web-zksk8s0kk08sksgwggkos0gw"
SQL_CONTAINER_PATTERN="sql-zksk8s0kk08sksgwggkos0gw"

echo "=== 1. VERIFICAR CONTAINERS ATIVOS ==="
WEB_CONTAINER=$(docker ps --filter "name=$WEB_CONTAINER_PATTERN" --format "{{.Names}}" | head -1)
SQL_CONTAINER=$(docker ps --filter "name=$SQL_CONTAINER_PATTERN" --format "{{.Names}}" | head -1)

if [ -z "$WEB_CONTAINER" ]; then
  echo -e "${RED}❌ Container Web não encontrado!${NC}"
  exit 1
fi

if [ -z "$SQL_CONTAINER" ]; then
  echo -e "${RED}❌ Container SQL não encontrado!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Web: $WEB_CONTAINER${NC}"
echo -e "${GREEN}✅ SQL: $SQL_CONTAINER${NC}"
echo ""

# Verificar commit deployado
echo "=== 2. COMMIT ATUAL EM PRODUÇÃO ==="
IMAGE=$(docker ps --filter "name=$WEB_CONTAINER" --format "{{.Image}}")
COMMIT=$(echo $IMAGE | grep -oE '[a-f0-9]{40}' | head -c 8)
echo -e "${GREEN}✅ Commit: $COMMIT${NC}"
echo ""

# Verificar schema.ts deployado
echo "=== 3. SCHEMA DRIZZLE DEPLOYADO (accounts table) ==="
echo "Verificando src/lib/db/schema.ts..."
docker exec $WEB_CONTAINER sh -c "grep -A10 'export const accounts' /app/src/lib/db/schema.ts 2>/dev/null || cat /app/src/lib/db/schema.ts | grep -A10 'accounts.*mssqlTable'" 2>/dev/null | head -15
echo ""

# Verificar estrutura REAL do banco
echo "=== 4. ESTRUTURA REAL DA TABELA 'accounts' NO BANCO ==="
echo "Conectando no SQL Server..."

QUERY="SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'accounts'
ORDER BY ORDINAL_POSITION;"

docker exec $SQL_CONTAINER /opt/mssql-tools/bin/sqlcmd \
  -S localhost \
  -U sa \
  -P "pepked-qogbYt-vyfpa4" \
  -d AuraCore \
  -Q "$QUERY" \
  -h -1 \
  -W 2>/dev/null

echo ""

# Verificar se coluna é userId ou user_id
echo "=== 5. VERIFICAR NOME EXATO DA COLUNA FK PARA USERS ==="
HAS_USERID=$(docker exec $SQL_CONTAINER /opt/mssql-tools/bin/sqlcmd \
  -S localhost \
  -U sa \
  -P "pepked-qogbYt-vyfpa4" \
  -d AuraCore \
  -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'accounts' AND COLUMN_NAME = 'userId'" \
  -h -1 \
  -W 2>/dev/null | tr -d '[:space:]')

HAS_USER_ID=$(docker exec $SQL_CONTAINER /opt/mssql-tools/bin/sqlcmd \
  -S localhost \
  -U sa \
  -P "pepked-qogbYt-vyfpa4" \
  -d AuraCore \
  -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'accounts' AND COLUMN_NAME = 'user_id'" \
  -h -1 \
  -W 2>/dev/null | tr -d '[:space:]')

echo "Coluna 'userId': $HAS_USERID"
echo "Coluna 'user_id': $HAS_USER_ID"
echo ""

if [ "$HAS_USERID" = "1" ]; then
  echo -e "${GREEN}✅ Banco usa: userId (camelCase)${NC}"
  BANCO_COLUNA="userId"
elif [ "$HAS_USER_ID" = "1" ]; then
  echo -e "${GREEN}✅ Banco usa: user_id (snake_case)${NC}"
  BANCO_COLUNA="user_id"
else
  echo -e "${RED}❌ Nenhuma coluna encontrada!${NC}"
  BANCO_COLUNA="NENHUMA"
fi
echo ""

# Verificar schema.ts local (comparar)
echo "=== 6. SCHEMA.TS LOCAL (seu código) ==="
if [ -f "/app/src/lib/db/schema.ts" ]; then
  grep -A3 "userId.*nvarchar" /app/src/lib/db/schema.ts 2>/dev/null | head -5
else
  echo -e "${YELLOW}⚠️  Arquivo local não acessível${NC}"
fi
echo ""

# Verificar logs de erro recentes
echo "=== 7. LOGS RECENTES COM ERRO 'userId' ==="
docker logs $WEB_CONTAINER --tail=50 2>&1 | grep -i "userId\|user_id" | tail -10
echo ""

# DIAGNÓSTICO FINAL
echo "=== 📊 DIAGNÓSTICO FINAL ==="
echo ""

# Verificar schema deployado vs banco real
echo "Comparando schema deployado vs banco real:"
SCHEMA_DEPLOY=$(docker exec $WEB_CONTAINER sh -c "grep 'userId.*nvarchar' /app/src/lib/db/schema.ts" 2>/dev/null)

if [ ! -z "$SCHEMA_DEPLOY" ]; then
  if echo "$SCHEMA_DEPLOY" | grep -q 'nvarchar("userId"'; then
    SCHEMA_USA="userId"
  elif echo "$SCHEMA_DEPLOY" | grep -q 'nvarchar("user_id"'; then
    SCHEMA_USA="user_id"
  else
    SCHEMA_USA="DESCONHECIDO"
  fi
  
  echo ""
  echo -e "${YELLOW}Schema Drizzle deployado usa: $SCHEMA_USA${NC}"
  echo -e "${YELLOW}Banco de dados real tem: $BANCO_COLUNA${NC}"
  echo ""
  
  if [ "$SCHEMA_USA" = "$BANCO_COLUNA" ]; then
    echo -e "${GREEN}✅ MATCH! Schema e banco estão alinhados.${NC}"
    echo ""
    echo "Se ainda há erro, pode ser:"
    echo "1. Cache do container (precisa restart)"
    echo "2. Build antiga ainda em cache"
    echo "3. Erro em outra tabela (sessions, etc)"
  else
    echo -e "${RED}❌ MISMATCH! Schema usa $SCHEMA_USA mas banco tem $BANCO_COLUNA${NC}"
    echo ""
    echo "CORREÇÃO NECESSÁRIA:"
    if [ "$BANCO_COLUNA" = "userId" ]; then
      echo "→ Schema deve usar: nvarchar(\"userId\")"
      echo "→ NÃO user_id!"
    else
      echo "→ Schema deve usar: nvarchar(\"user_id\")"
      echo "→ NÃO userId!"
    fi
  fi
else
  echo -e "${RED}❌ Não consegui ler schema deployado${NC}"
fi

echo ""
echo "=== 🔧 PRÓXIMOS PASSOS ==="
echo ""
echo "1. Verificar correção no código local:"
echo "   cat ~/aura_core/src/lib/db/schema.ts | grep -A3 userId"
echo ""
echo "2. Se mismatch, corrigir e fazer push:"
echo "   # Editar schema.ts"
echo "   git add src/lib/db/schema.ts"
echo "   git commit -m 'fix: corrigir schema mismatch userId'"
echo "   git push origin main"
echo ""
echo "3. Aguardar deploy automático (~2 min)"
echo ""
echo "4. Re-executar este script para validar"
echo ""
