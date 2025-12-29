#!/bin/bash

# 🔥 SCRIPT AUTOMATIZADO - IMPLEMENTAR CRUD EM 19 TELAS
# Execute: chmod +x implementar-crud-19-telas.sh && ./implementar-crud-19-telas.sh

echo "🚀 INICIANDO IMPLEMENTAÇÃO DAS 19 TELAS..."
echo "⚡ MODO: ULTRA-RÁPIDO SEM PARAR"
echo ""

# Contador
count=0
total=19

# Função para adicionar handlers em uma tela
add_crud_handlers() {
    local file=$1
    local api_endpoint=$2
    local entity_name=$3
    local fetch_function=$4
    
    count=$((count + 1))
    echo "[$count/$total] 📝 Implementando: $file..."
    
    # Verificar se arquivo existe
    if [ ! -f "$file" ]; then
        echo "  ⚠️  Arquivo não encontrado: $file"
        return
    fi
    
    # Verificar se já tem os handlers
    if grep -q "handleEdit.*useCallback" "$file" 2>/dev/null; then
        echo "  ✅ Já implementado!"
        return
    fi
    
    # Backup
    cp "$file" "${file}.backup"
    
    # Adicionar imports se não existirem
    if ! grep -q "import.*Edit.*Trash2" "$file"; then
        sed -i '' 's/from "lucide-react";/, Edit, Trash2 } from "lucide-react";/' "$file"
    fi
    
    if ! grep -q "import.*useRouter" "$file"; then
        sed -i '' '/import.*from "lucide-react";/a\
import { useRouter } from "next\/navigation";\
import { toast } from "sonner";
' "$file"
    fi
    
    # Adicionar handlers (procurar após o primeiro useState ou useRef)
    sed -i '' '/const.*=.*useRef\|const.*=.*useState/a\
\
  const router = useRouter();\
  const handleEdit = useCallback((data: any) => {\
    router.push(`'"$entity_name"'/editar/${data.id}`);\
  }, [router]);\
  const handleDelete = useCallback(async (id: number) => {\
    if (!confirm("Tem certeza que deseja excluir?")) return;\
    try {\
      const res = await fetch(`'"$api_endpoint"'/${id}`, { method: "DELETE" });\
      if (!res.ok) { toast.error("Erro ao excluir"); return; }\
      toast.success("Excluído com sucesso!");\
      '"$fetch_function"'();\
    } catch (error) { toast.error("Erro"); }\
  }, []);
' "$file"
    
    echo "  ✅ Implementado!"
}

# 1. REMESSAS
add_crud_handlers \
    "src/app/(dashboard)/financeiro/remessas/page.tsx" \
    "/api/financial/remittances" \
    "/financeiro/remessas" \
    "queryClient.invalidateQueries({ queryKey: ['remittances'] })"

# 2. COTAÇÕES
add_crud_handlers \
    "src/app/(dashboard)/comercial/cotacoes/page.tsx" \
    "/api/commercial/quotes" \
    "/comercial/cotacoes" \
    "fetchQuotes"

# 3. TABELAS FRETE
add_crud_handlers \
    "src/app/(dashboard)/comercial/tabelas-frete/page.tsx" \
    "/api/commercial/freight-tables" \
    "/comercial/tabelas-frete" \
    "fetchTables"

# 4. REPOSITÓRIO CARGAS
add_crud_handlers \
    "src/app/(dashboard)/tms/repositorio-cargas/page.tsx" \
    "/api/tms/cargo-repository" \
    "/tms/repositorio-cargas" \
    "fetchCargos"

# 5. OCORRÊNCIAS
add_crud_handlers \
    "src/app/(dashboard)/tms/ocorrencias/page.tsx" \
    "/api/tms/occurrences" \
    "/tms/ocorrencias" \
    "fetchOccurrences"

# 6. PARCEIROS
add_crud_handlers \
    "src/app/(dashboard)/cadastros/parceiros/page.tsx" \
    "/api/partners" \
    "/cadastros/parceiros" \
    "queryClient.invalidateQueries({ queryKey: ['partners'] })"

# 7. PRODUTOS  
add_crud_handlers \
    "src/app/(dashboard)/cadastros/produtos/page.tsx" \
    "/api/products" \
    "/cadastros/produtos" \
    "queryClient.invalidateQueries({ queryKey: ['products'] })"

# 8. FILIAIS (cadastros)
add_crud_handlers \
    "src/app/(dashboard)/cadastros/filiais/page.tsx" \
    "/api/branches" \
    "/cadastros/filiais" \
    "fetchBranches"

# 9. DOCUMENTOS FISCAIS
add_crud_handlers \
    "src/app/(dashboard)/fiscal/documentos/page.tsx" \
    "/api/fiscal/documents" \
    "/fiscal/documentos" \
    "fetchDocuments"

# 10. CTE
add_crud_handlers \
    "src/app/(dashboard)/fiscal/cte/page.tsx" \
    "/api/fiscal/cte" \
    "/fiscal/cte" \
    "fetchCtes"

# 11. MATRIZ TRIBUTÁRIA
add_crud_handlers \
    "src/app/(dashboard)/fiscal/matriz-tributaria/page.tsx" \
    "/api/fiscal/tax-matrix" \
    "/fiscal/matriz-tributaria" \
    "fetchMatrix"

# 12. NCM CATEGORIAS
add_crud_handlers \
    "src/app/(dashboard)/fiscal/ncm-categorias/page.tsx" \
    "/api/fiscal/ncm-categories" \
    "/fiscal/ncm-categorias" \
    "fetchCategories"

# 13. CIAP
add_crud_handlers \
    "src/app/(dashboard)/fiscal/ciap/page.tsx" \
    "/api/ciap" \
    "/fiscal/ciap" \
    "fetchAssets"

# 14. WMS FATURAMENTO
add_crud_handlers \
    "src/app/(dashboard)/wms/faturamento/page.tsx" \
    "/api/financial/billing" \
    "/wms/faturamento" \
    "fetchBilling"

# 15. CONFIGURAÇÕES FILIAIS
add_crud_handlers \
    "src/app/(dashboard)/configuracoes/filiais/page.tsx" \
    "/api/branches" \
    "/configuracoes/filiais" \
    "fetchBranches"

# 16. DOCUMENTAÇÃO FROTA
add_crud_handlers \
    "src/app/(dashboard)/frota/documentacao/page.tsx" \
    "/api/fleet/documents" \
    "/frota/documentacao" \
    "fetchDocs"

# 17. JORNADAS
add_crud_handlers \
    "src/app/(dashboard)/rh/motoristas/jornadas/page.tsx" \
    "/api/hr/driver-journey" \
    "/rh/motoristas/jornadas" \
    "fetchJourneys"

# 18. CARBONO
add_crud_handlers \
    "src/app/(dashboard)/sustentabilidade/carbono/page.tsx" \
    "/api/esg/emissions" \
    "/sustentabilidade/carbono" \
    "fetchEmissions"

# 19. PNEUS
add_crud_handlers \
    "src/app/(dashboard)/frota/pneus/page.tsx" \
    "/api/fleet/tires" \
    "/frota/pneus" \
    "fetchTires"

echo ""
echo "✅ IMPLEMENTAÇÃO CONCLUÍDA!"
echo ""
echo "📊 RESULTADO:"
echo "  - 19 telas processadas"
echo "  - Handlers adicionados"
echo "  - Backups criados (.backup)"
echo ""
echo "🔄 PRÓXIMO PASSO:"
echo "  1. Revisar arquivos modificados"
echo "  2. Adicionar colunas de ações nos AG Grids"
echo "  3. Testar cada tela"
echo ""
echo "💾 Para reverter (se necessário):"
echo "  find src -name '*.backup' -exec sh -c 'mv \"\$1\" \"\${1%.backup}\"' _ {} \;"
echo ""
echo "🎉 PRONTO!"




















