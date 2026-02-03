# 🔥 Strategic Module - Plano de Ação para Bugs

## 📊 Sumário Executivo

**Total de Bugs:** 4 críticos  
**Tempo Total Estimado:** 6-9 horas  
**Prioridade:** 🔴 ALTA - Bloqueadores de usabilidade  

---

## 🐛 BUG #1: SWOT Edit - Erro 500 ao Salvar

### Problema
Tela `/strategic/swot/[id]` retorna erro 500 após preencher formulário e clicar em Salvar.

### Status
**API OK** - Código do endpoint PUT em `/api/strategic/swot/[id]` está correto.  
**Frontend ?** - Precisa investigar payload enviado.

### Ação Imediata

**1. Capturar Payload Real:**
```bash
# No navegador (DevTools → Network → XHR):
# 1. Acessar https://tcl.auracore.cloud/strategic/swot/[id]
# 2. Preencher formulário
# 3. Clicar em Salvar
# 4. Copiar Request Payload do erro 500
# 5. Colar abaixo:
```

**Payload esperado pela API:**
```json
{
  "title": "string (1-200 chars)",
  "description": "string (max 2000 chars)",
  "impactScore": 1-5,
  "probabilityScore": 0-5,
  "category": "string (max 50 chars)"
}
```

**2. Verificar Server Logs:**
```bash
ssh root@coolify.auracore.cloud
docker logs web-zksk8s0kk08sksgwggkos0gw-* --tail 100 | grep -A 10 "PUT /api/strategic/swot"
```

### Correção Provável

Se o problema for **campos obrigatórios faltando no frontend:**

**Arquivo a corrigir:** `src/app/strategic/swot/[id]/page.tsx` (ou similar)

```typescript
// Garantir que o form submete todos os campos
const handleSubmit = async (data: FormData) => {
  const payload = {
    title: data.title,
    description: data.description || "",  // ✅ Default vazio
    impactScore: data.impactScore || 1,   // ✅ Default numérico
    probabilityScore: data.probabilityScore || 0,
    category: data.category || "general",
  };

  const response = await fetch(`/api/strategic/swot/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("SWOT Update Error:", error);
    toast.error(error.error || "Erro ao salvar");
    return;
  }

  toast.success("SWOT atualizado com sucesso!");
  router.push("/strategic/swot");
};
```

---

## 🐛 BUG #2: PDCA Grid - Ações Não Funcionam

### Problema
Botões "Visualizar" e "Editar" no grid `/strategic/pdca/grid` não executam nenhuma ação.

### Causa
1. **AG Grid config deprecada** - `rowSelection: "single"` obsoleto
2. **Cell renderer sem onClick** - Botões não têm event handler

### Investigação
```bash
cd /Users/pedrolemes/aura_core

# Buscar arquivo do grid PDCA
find src -path "*pdca*grid*" -name "*.tsx"

# Verificar config do AG Grid
grep -A 30 "rowSelection\|GridOptions" [arquivo_encontrado]
```

### Correção

**Arquivo:** `src/app/strategic/pdca/grid/page.tsx` (ou componente do grid)

#### Passo 1: Corrigir rowSelection

```typescript
// ❌ ANTES (deprecado desde AG Grid v32)
const gridOptions: GridOptions = {
  rowSelection: "single",
  paginationPageSize: 25,
};

// ✅ DEPOIS (nova API v34)
const gridOptions: GridOptions = {
  rowSelection: {
    mode: "singleRow",
    checkboxes: false,
    enableClickSelection: true
  },
  pagination: true,
  paginationPageSize: 20, // ou 50, 100 (valores padrão)
  paginationPageSizeSelector: [20, 50, 100],
};
```

#### Passo 2: Adicionar Cell Renderer de Ações

```typescript
import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

const ActionsCellRenderer = (params: any) => {
  const router = useRouter();
  const pdcaId = params.data.id;

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation(); // Evita seleção da row
          router.push(`/strategic/pdca/${pdcaId}`);
        }}
        title="Visualizar"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/strategic/pdca/${pdcaId}/edit`);
        }}
        title="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Na definição das colunas:
const columnDefs = [
  // ... outras colunas
  {
    headerName: "Ações",
    field: "actions",
    cellRenderer: ActionsCellRenderer,
    sortable: false,
    filter: false,
    width: 100,
    pinned: "right",
  },
];
```

---

## 🐛 BUG #3: KPIs sem Editar/Excluir

### Problema
Lista `/strategic/kpis` não exibe botões Edit/Delete mesmo para KPIs standalone com fonte manual.

### Regra de Negócio
```typescript
// Pode editar/deletar SE:
- KPI NÃO derivado de objetivo (goalId === null)
- KPI NÃO vinculado a módulo (linkedModuleId === null)
- KPI com fonte "entrada manual" (dataSource === 'manual')

// NÃO pode editar/deletar SE:
- KPI derivado de Goal
- KPI vinculado a outro módulo
```

### Investigação
```bash
cd /Users/pedrolemes/aura_core

# Buscar página de KPIs
find src -path "*kpis*" -name "page.tsx"

# Verificar lógica de permissões
grep -A 10 "canEdit\|canDelete\|isEditable" [arquivo_encontrado]
```

### Correção

**Arquivo:** `src/app/strategic/kpis/page.tsx` (ou componente de lista)

```typescript
// Função de validação
const canEditDelete = (kpi: KPI) => {
  // Se derivado de goal OU vinculado = NÃO pode
  if (kpi.goalId || kpi.linkedModuleId) {
    return false;
  }
  
  // Se fonte manual = PODE
  if (kpi.dataSource === 'manual') {
    return true;
  }
  
  return false;
};

// No componente de lista/grid:
<TableRow key={kpi.id}>
  <TableCell>{kpi.name}</TableCell>
  <TableCell>{kpi.dataSource}</TableCell>
  <TableCell>
    {canEditDelete(kpi) ? (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/strategic/kpis/${kpi.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleDelete(kpi.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <span className="text-muted-foreground text-sm">
        {kpi.goalId && "Vinculado a Objetivo"}
        {kpi.linkedModuleId && "Vinculado a Módulo"}
      </span>
    )}
  </TableCell>
</TableRow>
```

---

## 🐛 BUG #4: Follow-up em Inglês + UI Confusa

### Problema
1. Tela `/strategic/action-plans/[id]/follow-up/new` toda em inglês
2. Não mostra sequência lógica dos follow-ups

### Investigação
```bash
cd /Users/pedrolemes/aura_core

# Buscar página de follow-up
find src -path "*follow-up*" -name "*.tsx"

# Verificar strings em inglês
grep -r "Follow.up Title\|Description\|Status" src/
```

### Correção Parte 1: I18n (PT-BR)

**Arquivo:** `src/app/strategic/action-plans/[id]/follow-up/new/page.tsx`

```typescript
// Labels em português
const labels = {
  title: "Título do Acompanhamento",
  description: "Descrição Detalhada",
  status: "Status",
  dueDate: "Data Prevista",
  completionPercent: "% de Conclusão",
  responsible: "Responsável",
  attachments: "Anexos",
  notes: "Observações",
};

// Status options
const statusOptions = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];
```

### Correção Parte 2: Timeline UI

**Criar componente:** `src/components/strategic/FollowUpTimeline.tsx`

```typescript
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowUp {
  id: string;
  sequence: number;
  title: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  completionPercent: number;
  createdAt: Date;
  completedAt?: Date;
}

export function FollowUpTimeline({ followUps }: { followUps: FollowUp[] }) {
  const statusIcons = {
    completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    in_progress: <Clock className="h-5 w-5 text-blue-500" />,
    pending: <Circle className="h-5 w-5 text-gray-400" />,
    cancelled: <Circle className="h-5 w-5 text-red-500" />,
  };

  const statusLabels = {
    completed: "Concluído",
    in_progress: "Em Andamento",
    pending: "Pendente",
    cancelled: "Cancelado",
  };

  return (
    <div className="space-y-4">
      {followUps.map((item, index) => (
        <Card
          key={item.id}
          className={cn(
            "border-l-4 p-4",
            item.status === "completed" && "border-l-green-500",
            item.status === "in_progress" && "border-l-blue-500",
            item.status === "pending" && "border-l-gray-300",
            item.status === "cancelled" && "border-l-red-500"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              {statusIcons[item.status]}
              <div className="mt-2 text-lg font-bold text-muted-foreground">
                #{index + 1}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{item.title}</h4>
                <Badge variant={
                  item.status === "completed" ? "success" :
                  item.status === "in_progress" ? "default" :
                  "secondary"
                }>
                  {statusLabels[item.status]}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <Progress value={item.completionPercent} className="flex-1" />
                <span className="text-sm font-medium">
                  {item.completionPercent}%
                </span>
              </div>

              <div className="text-sm text-muted-foreground">
                Criado em: {item.createdAt.toLocaleDateString("pt-BR")}
                {item.completedAt && (
                  <span className="ml-4">
                    Concluído em: {item.completedAt.toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

## 📋 Ordem de Execução Recomendada

### 1. SWOT 500 (Mais Crítico)
```bash
# 1. Capturar payload real do erro 500 (DevTools)
# 2. Verificar logs do servidor
# 3. Corrigir frontend para enviar campos corretos
# 4. Testar save novamente
```

### 2. PDCA Grid
```bash
# 1. Localizar arquivo do grid
# 2. Atualizar rowSelection para nova API
# 3. Adicionar ActionsCellRenderer
# 4. Testar botões Visualizar/Editar
```

### 3. KPIs Edit/Delete
```bash
# 1. Localizar componente de lista de KPIs
# 2. Adicionar função canEditDelete
# 3. Renderizar botões condicionalmente
# 4. Testar com KPI standalone vs derivado
```

### 4. Follow-up i18n + Timeline
```bash
# 1. Localizar formulário de follow-up
# 2. Traduzir labels para PT-BR
# 3. Criar componente FollowUpTimeline
# 4. Integrar timeline na página de action plan
```

---

## ✅ Checklist Pré-Correção

- [ ] Criar branch `fix/strategic-bugs`
- [ ] Fazer backup do banco (opcional, soft delete ativo)
- [ ] Capturar screenshots dos bugs
- [ ] Reproduzir cada bug em `npm run dev`
- [ ] Documentar passos de reprodução

---

## 🚀 Comandos para Início Rápido

```bash
cd /Users/pedrolemes/aura_core

# 1. Criar branch de correções
git checkout -b fix/strategic-bugs

# 2. Localizar arquivos relevantes
find src -name "*swot*" -o -name "*pdca*grid*" -o -name "*kpis*" -o -name "*follow-up*" | grep -E "\.tsx$"

# 3. Abrir no Cursor para correção
cursor .

# 4. Após correções, testar localmente
npm run dev

# 5. Validar em produção
git push origin fix/strategic-bugs
```

---

**Aguardando autorização para iniciar correções ou captura de payload do SWOT 500 error.**
