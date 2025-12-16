#!/bin/bash

# 🔥 SCRIPT 2 - ADICIONAR COLUNAS DE AÇÕES NOS AG GRIDS
# Execute após implementar-crud-19-telas.sh

echo "🚀 ADICIONANDO COLUNAS DE AÇÕES NOS AG GRIDS..."
echo ""

# Template da coluna de ações
ACTIONS_COLUMN='{
  headerName: "Ações",
  width: 120,
  pinned: "right",
  sortable: false,
  filter: false,
  cellRenderer: (params: any) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleEdit(params.data)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleDelete(params.data.id)}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  ),
},'

echo "📝 INSTRUÇÕES MANUAIS:"
echo ""
echo "Para cada tela, adicione a coluna de ações NO FINAL do columnDefs:"
echo ""
echo "const columnDefs: ColDef[] = ["
echo "  // ... colunas existentes ..."
echo "  $ACTIONS_COLUMN"
echo "];"
echo ""
echo "📋 LISTA DE ARQUIVOS PARA EDITAR:"
echo ""

files=(
    "src/app/(dashboard)/financeiro/remessas/page.tsx"
    "src/app/(dashboard)/comercial/cotacoes/page.tsx"
    "src/app/(dashboard)/comercial/tabelas-frete/page.tsx"
    "src/app/(dashboard)/tms/repositorio-cargas/page.tsx"
    "src/app/(dashboard)/tms/ocorrencias/page.tsx"
    "src/app/(dashboard)/cadastros/parceiros/page.tsx"
    "src/app/(dashboard)/cadastros/produtos/page.tsx"
    "src/app/(dashboard)/cadastros/filiais/page.tsx"
    "src/app/(dashboard)/fiscal/documentos/page.tsx"
    "src/app/(dashboard)/fiscal/cte/page.tsx"
    "src/app/(dashboard)/fiscal/matriz-tributaria/page.tsx"
    "src/app/(dashboard)/fiscal/ncm-categorias/page.tsx"
    "src/app/(dashboard)/fiscal/ciap/page.tsx"
    "src/app/(dashboard)/wms/faturamento/page.tsx"
    "src/app/(dashboard)/configuracoes/filiais/page.tsx"
    "src/app/(dashboard)/frota/documentacao/page.tsx"
    "src/app/(dashboard)/rh/motoristas/jornadas/page.tsx"
    "src/app/(dashboard)/sustentabilidade/carbono/page.tsx"
    "src/app/(dashboard)/frota/pneus/page.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ⚠️  $file (não encontrado)"
    fi
done

echo ""
echo "💡 DICA RÁPIDA:"
echo "  Procure por '], []);' ou '], [' no final do columnDefs"
echo "  Adicione a coluna ANTES do fechamento do array"
echo ""
echo "🎯 EXEMPLO:"
echo "  Antes:"
echo "    { field: 'description', flex: 1 },"
echo "  ], []);"
echo ""
echo "  Depois:"
echo "    { field: 'description', flex: 1 },"
echo "    { headerName: 'Ações', width: 120, ... },"
echo "  ], [handleEdit, handleDelete]);"
echo ""










