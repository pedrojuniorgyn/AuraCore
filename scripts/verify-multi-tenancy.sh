#!/bin/bash

echo "🔍 Verificando Multi-tenancy..."

VIOLATIONS=0
REPOS=$(find src/modules -path "*/infrastructure/persistence/repositories/*.ts" -type f)

for REPO in $REPOS; do
  if grep -q "findFirst\|findMany" "$REPO"; then
    
    # Verificar organizationId
    if ! grep -q "organizationId" "$REPO"; then
      echo "❌ $REPO - Falta organizationId"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
    
    # Verificar branchId
    if ! grep -q "branchId" "$REPO"; then
      echo "❌ $REPO - Falta branchId"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo "✅ Multi-tenancy OK"
  exit 0
else
  echo "❌ $VIOLATIONS violações"
  exit 1
fi
