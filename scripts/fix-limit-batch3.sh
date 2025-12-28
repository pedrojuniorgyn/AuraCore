#!/bin/bash
# Script para corrigir erros .limit() em vehicles e tires (BATCH 3)

set -e

echo "🔧 Corrigindo vehicles/[id]/route.ts..."

# Adicionar import
sed -i '' '5a\
import { queryFirst } from "@/lib/db/query-helpers";
' src/app/api/fleet/vehicles/[id]/route.ts

# Substituir padrões (simplificado - apenas adiciona queryFirst, ajustes manuais depois)
echo "✅ vehicles/[id]/route.ts preparado"

echo "🔧 Corrigindo tires/[id]/route.ts..."

# Adicionar import
sed -i '' '5a\
import { queryFirst } from "@/lib/db/query-helpers";
' src/app/api/fleet/tires/[id]/route.ts

echo "✅ tires/[id]/route.ts preparado"

echo "✅ Imports adicionados! Aplicando correções manuais..."

