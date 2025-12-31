# 🚀 GUIA DEFINITIVO - IMPLEMENTAR CRUD FRONTEND

**Data:** 10/12/2025  
**Status:** ✅ **EXEMPLOS PRONTOS + GUIA COMPLETO**

---

## ✅ O QUE JÁ FOI IMPLEMENTADO

### **3 TELAS FUNCIONANDO (Use como referência!):**

1. ✅ **Veículos** - `/frota/veiculos/page.tsx`
   - Botões Edit/Delete com AG Grid básico
   - Handlers implementados
   - AlertDialog de confirmação

2. ✅ **Motoristas** - `/frota/motoristas/page.tsx`
   - Botões Edit/Delete com AG Grid
   - Handlers implementados
   - AlertDialog de confirmação

3. ✅ **Contas a Pagar** - `/financeiro/contas-pagar/page.tsx`
   - **Usa PremiumActionCell** (componente Enterprise)
   - Handlers via context do AG Grid
   - Exemplo mais avançado

### **1 COMPONENTE GLOBAL ATUALIZADO:**

- ✅ **PremiumActionCell** - `/lib/ag-grid/aurora-premium-cells.tsx`
  - Aceita handlers via `context`
  - Usado em 20+ telas automaticamente
  - Apenas configure o context!

---

## 📊 TELAS QUE PRECISAM DE IMPLEMENTAÇÃO

### **🔴 COM AG GRID + PremiumActionCell (FÁCIL - 5min cada):**

Essas telas JÁ TÊM os botões visuais, só precisam dos handlers!

1. ❌ `/financeiro/contas-receber/page.tsx`
2. ❌ `/financeiro/remessas/page.tsx`
3. ❌ `/comercial/cotacoes/page.tsx`
4. ❌ `/comercial/tabelas-frete/page.tsx`
5. ❌ `/tms/repositorio-cargas/page.tsx`
6. ❌ `/tms/ocorrencias/page.tsx`
7. ❌ `/cadastros/parceiros/page.tsx`
8. ❌ `/cadastros/produtos/page.tsx`
9. ❌ `/cadastros/filiais/page.tsx`
10. ❌ `/fiscal/documentos/page.tsx`
11. ❌ `/fiscal/cte/page.tsx`
12. ❌ `/fiscal/matriz-tributaria/page.tsx`
13. ❌ `/fiscal/ncm-categorias/page.tsx`
14. ❌ `/fiscal/ciap/page.tsx`
15. ❌ `/wms/faturamento/page.tsx`
16. ❌ `/configuracoes/filiais/page.tsx`

### **🟡 COM AG GRID BÁSICO (MÉDIO - 10min cada):**

Precisam adicionar coluna de ações + handlers

17. ❌ `/frota/documentacao/page.tsx`
18. ❌ `/rh/motoristas/jornadas/page.tsx`
19. ❌ `/sustentabilidade/carbono/page.tsx`

### **🟠 SEM AG GRID (AVANÇADO - 15-20min cada):**

Precisam de botões customizados nos Cards/Tables

20. ❌ `/frota/pneus/page.tsx` (usa Cards)
21. ❌ `/tms/viagens/page.tsx` (usa Cards)
22. ❌ `/frota/manutencao/planos/page.tsx`
23. ❌ `/frota/manutencao/ordens/page.tsx`

---

## 🎯 MÉTODO 1: TELAS COM PremiumActionCell (MAIS FÁCIL)

### **⚡ Implementação em 3 PASSOS:**

#### **PASSO 1: Adicionar imports**

```typescript
import { toast } from "sonner";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
```

#### **PASSO 2: Adicionar handlers no componente**

```typescript
export default function SuaPagina() {
  const router = useRouter();
  
  // ... código existente ...

  // 🔥 HANDLER DE EDITAR
  const handleEdit = useCallback((data: SeuTipo) => {
    router.push(`/seu-modulo/editar/${data.id}`);
    // OU abrir modal: setFormData(data); setIsDialogOpen(true);
  }, [router]);

  // 🔥 HANDLER DE EXCLUIR
  const handleDelete = useCallback(async (id: number, data: SeuTipo) => {
    try {
      const response = await fetch(`/api/seu-endpoint/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Erro ao excluir");
        return;
      }

      toast.success("Excluído com sucesso!");
      fetchData(); // Sua função de recarregar dados
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir");
    }
  }, []);

  // 🔥 CONTEXT PARA O AG GRID
  const gridContext = useMemo(() => ({
    onEdit: handleEdit,
    onDelete: handleDelete,
  }), [handleEdit, handleDelete]);

  // ... resto do código ...
}
```

#### **PASSO 3: Passar context para o AG Grid**

```typescript
<AgGridReact
  // ... props existentes ...
  context={gridContext}  // 👈 ADICIONAR ESTA LINHA
  rowData={seusDados}
  columnDefs={columnDefs}
  // ... resto das props ...
/>
```

### **✅ PRONTO! Os botões já funcionam!**

---

## 🎯 MÉTODO 2: TELAS COM AG GRID SEM PremiumActionCell

### **📝 Implementação COMPLETA:**

#### **PASSO 1: Adicionar imports**

```typescript
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
```

#### **PASSO 2: Adicionar estados**

```typescript
const router = useRouter();
const queryClient = useQueryClient();
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [deleteId, setDeleteId] = useState<number | null>(null);
```

#### **PASSO 3: Criar handlers**

```typescript
const handleEdit = (item: SeuTipo) => {
  router.push(`/seu-modulo/editar/${item.id}`);
};

const handleDelete = (id: number) => {
  setDeleteId(id);
  setShowDeleteDialog(true);
};

const confirmDelete = async () => {
  if (!deleteId) return;

  try {
    const res = await fetch(`/api/seu-endpoint/${deleteId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = await res.json();
      toast.error(error.error || "Erro ao excluir");
      return;
    }

    toast.success("Excluído com sucesso!");
    queryClient.invalidateQueries({ queryKey: ["sua-query-key"] });
    setShowDeleteDialog(false);
    setDeleteId(null);
  } catch (error) {
    console.error("Erro:", error);
    toast.error("Erro ao excluir");
  }
};
```

#### **PASSO 4: Adicionar coluna de ações no columnDefs**

```typescript
const columnDefs: ColDef<SeuTipo>[] = [
  // ... colunas existentes ...
  {
    headerName: "Ações",
    width: 120,
    pinned: "right",
    sortable: false,
    filter: false,
    cellRenderer: (params: any) => (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(params.data)}
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(params.data.id)}
          title="Excluir"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    ),
  },
];
```

#### **PASSO 5: Adicionar AlertDialog no JSX**

```tsx
{/* No final do return, antes de fechar </div> */}
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
      <AlertDialogDescription>
        Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={confirmDelete}
        className="bg-red-500 hover:bg-red-600"
      >
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 🎯 MÉTODO 3: TELAS SEM AG GRID (Cards/Tables)

### **Para páginas que usam Cards:**

```tsx
{items.map((item) => (
  <Card key={item.id}>
    <CardHeader>
      <div className="flex justify-between items-start">
        <CardTitle>{item.name}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {/* ... conteúdo do card ... */}
    </CardContent>
  </Card>
))}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

Para cada tela, verifique:

- [ ] Importou `toast` do sonner
- [ ] Importou `useCallback`, `useMemo` (se usar PremiumActionCell)
- [ ] Importou `useRouter`
- [ ] Criou `handleEdit(data)`
- [ ] Criou `handleDelete(id, data)` 
- [ ] Criou `gridContext` (se usar PremiumActionCell)
- [ ] Passou `context={gridContext}` para AgGridReact
- [ ] OU adicionou coluna de ações manualmente
- [ ] Adicionou AlertDialog (se não usar PremiumActionCell)
- [ ] Testou editar e excluir

---

## 🔗 REFERÊNCIAS DE CÓDIGO

### **📁 Exemplos Completos:**

1. **Método PremiumActionCell:**
   - Ver: `/financeiro/contas-pagar/page.tsx`
   - API: `/api/financial/payables/[id]/route.ts`

2. **Método AG Grid Básico:**
   - Ver: `/frota/veiculos/page.tsx`
   - API: `/api/fleet/vehicles/[id]/route.ts`

3. **Método Manual (sem AG Grid):**
   - Ver: `/frota/motoristas/page.tsx`
   - API: `/api/fleet/drivers/[id]/route.ts`

---

## 🎯 MAPEAMENTO: TELA → API

| Tela | API Endpoint | Método |
|------|-------------|--------|
| `/financeiro/contas-receber/page.tsx` | `/api/financial/receivables/[id]` | Método 1 |
| `/financeiro/remessas/page.tsx` | `/api/financial/remittances/[id]` | Método 1 |
| `/comercial/cotacoes/page.tsx` | `/api/comercial/proposals/[id]` | Método 1 |
| `/tms/repositorio-cargas/page.tsx` | `/api/tms/cargo-repository/[id]` | Método 1 |
| `/tms/ocorrencias/page.tsx` | `/api/tms/occurrences/[id]` | Método 1 |
| `/cadastros/parceiros/page.tsx` | `/api/partners/[id]` | Método 1 |
| `/cadastros/produtos/page.tsx` | `/api/products/[id]` | Método 1 |
| `/fiscal/documentos/page.tsx` | `/api/fiscal/documents/[id]` | Método 1 |
| `/fiscal/cte/page.tsx` | `/api/fiscal/cte/[id]` | Método 1 |
| `/fiscal/ncm-categorias/page.tsx` | `/api/fiscal/ncm-categories/[id]` | Método 1 |
| `/fiscal/ciap/page.tsx` | `/api/ciap/[id]` | Método 1 |
| `/wms/faturamento/page.tsx` | `/api/financial/billing/[id]` | Método 1 |
| `/frota/documentacao/page.tsx` | `/api/fleet/documents/[id]` | Método 2 |
| `/rh/motoristas/jornadas/page.tsx` | `/api/hr/driver-journey/[id]` | Método 2 |
| `/sustentabilidade/carbono/page.tsx` | `/api/esg/emissions/[id]` | Método 2 |
| `/frota/pneus/page.tsx` | `/api/fleet/tires/[id]` | Método 3 |
| `/frota/manutencao/planos/page.tsx` | `/api/fleet/maintenance-plans/[id]` | Método 3 |

---

## ⏱️ TEMPO ESTIMADO POR TELA

| Método | Complexidade | Tempo | Qtd Telas |
|--------|--------------|-------|-----------|
| **Método 1** (PremiumActionCell) | 🟢 Fácil | 5-10 min | 16 telas |
| **Método 2** (AG Grid Básico) | 🟡 Médio | 10-15 min | 3 telas |
| **Método 3** (Cards/Custom) | 🟠 Avançado | 15-20 min | 4 telas |
| **TOTAL** | - | **3-5 horas** | **23 telas** |

---

## 🚀 COMEÇAR AGORA

### **Sugestão de Ordem:**

**Fase 1 - Rápidas (Método 1):** ~1-2h
1. Contas a Receber
2. Remessas
3. Cotações
4. Repositório Cargas
5. Ocorrências
6. Parceiros

**Fase 2 - Médias (Método 2):** ~30-45min
7. Documentação Frota
8. Jornadas
9. Carbono

**Fase 3 - Customizadas (Método 3):** ~1h
10. Pneus
11. Planos Manutenção
12. Outras

---

## 🎯 DICA FINAL

**COPIE E COLE!** 

Para implementar rapidamente, use este template:

```bash
# 1. Abra a tela
code src/app/(dashboard)/seu-modulo/page.tsx

# 2. Copie código do Método 1 (acima)

# 3. Ajuste:
#    - SeuTipo → seu tipo de dados
#    - /api/seu-endpoint → sua API
#    - queryKey → sua query key

# 4. Teste!
```

---

## ✅ RESULTADO FINAL

Após implementar TODAS:

- ✅ **23 APIs backend** funcionando
- ✅ **23 telas frontend** com Edit/Delete
- ✅ **Sistema 100% CRUD completo**
- ✅ **UX profissional**
- ✅ **Validações de segurança**

---

**🎉 SISTEMA COMPLETO E PROFISSIONAL!**

---

**Criado:** 10/12/2025  
**Implementado:** Backend 100% ✅ | Frontend 3/23 ✅ | Guia Completo ✅























