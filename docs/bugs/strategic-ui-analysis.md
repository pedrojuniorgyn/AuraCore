# 🐛 Análise de Bugs - Strategic Module UI

## 📊 Problemas Identificados nos Testes

### 1️⃣ KPIs sem Edição/Exclusão (/strategic/kpis)

**Problema:**  
Nenhum KPI permite editar ou excluir na lista.

**Análise da Regra de Negócio:**
- ✅ KPI derivado de objetivo estratégico → NÃO permitir edit/delete
- ✅ KPI vinculado a outro módulo → NÃO permitir edit/delete  
- ❌ KPI standalone + fonte "entrada manual" → **DEVE** permitir edit/delete

**Causa Provável:**
Lógica de permissões não está verificando se o KPI é standalone.

**Investigação Necessária:**
```bash
# Verificar componente da lista de KPIs
grep -r "strategic/kpis" src/app/strategic/kpis/

# Verificar lógica de botões Edit/Delete
grep -A 10 "canEdit\|canDelete" src/app/strategic/kpis/
```

**Solução Planejada:**
1. Adicionar campo `source_type` ou verificar `goal_id` e `linked_module_id`
2. Lógica condicional:
```typescript
const canEditDelete = (kpi: KPI) => {
  // Se derivado de goal OU vinculado a módulo = false
  if (kpi.goalId || kpi.linkedModuleId) return false;
  
  // Se fonte manual = true
  if (kpi.dataSource === 'manual') return true;
  
  return false;
};
```

---

###  2️⃣ PDCA Grid - Ações Visualizar/Editar Sem Função (/strategic/pdca/grid)

**Problema:**  
Botões "Visualizar" e "Editar" no grid não funcionam.

**Logs Encontrados:**
```
[Warning] AG Grid: warning #94 – 'paginationPageSize=25' not in paginationPageSizeSelector
[Warning] AG Grid: rowSelection deprecated, use object value
```

**Causa Provável:**
1. **AG Grid config deprecada** - `rowSelection: "single"/"multiple"` não funciona mais
2. **paginationPageSize inválida** - valor 25 não está na lista de opções padrão

**Investigação Necessária:**
```bash
# Buscar config do grid PDCA
grep -A 20 "rowSelection\|paginationPageSize" src/app/strategic/pdca/grid/

# Verificar cell renderers de ações
grep -A 10 "onCellClicked\|cellRenderer.*action" src/app/strategic/pdca/grid/
```

**Solução Planejada:**

**Arquivo:** `src/app/strategic/pdca/grid/page.tsx`

```typescript
// ❌ ANTES (deprecado)
const gridOptions = {
  rowSelection: "single",
  paginationPageSize: 25,
};

// ✅ DEPOIS (correto)
const gridOptions = {
  rowSelection: {
    mode: "singleRow",
    checkboxes: false,
    enableClickSelection: true
  },
  paginationPageSize: 20, // ou 50/100 (valores padrão)
  paginationPageSizeSelector: [20, 50, 100],
};

// Cell renderer de ações
const actionsCellRenderer = (params: any) => {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/strategic/pdca/${params.data.id}`);
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/strategic/pdca/${params.data.id}/edit`);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};
```

---

### 3️⃣ Follow-up em Inglês + Estrutura Confusa (/strategic/action-plans/*/follow-up)

**Problema:**  
1. Tela de cadastro toda em inglês
2. Estrutura e correlações entre follow-ups não clara

**Investigação Necessária:**
```bash
# Verificar componente de follow-up
grep -r "follow.up\|followup" src/app/strategic/action-plans/

# Buscar strings em inglês
grep -r "Follow.up Title\|Description\|Status" src/app/strategic/action-plans/
```

**Solução Planejada:**

1. **I18n - Traduzir para PT-BR:**

```typescript
// src/app/strategic/action-plans/[id]/follow-up/new/page.tsx

const labels = {
  // ❌ ANTES
  title: "Follow-up Title",
  description: "Description",
  status: "Status",
  
  // ✅ DEPOIS
  title: "Título do Acompanhamento",
  description: "Descrição",
  status: "Status",
  dueDate: "Data Prevista",
  completion: "% Conclusão",
  responsible: "Responsável",
};
```

2. **Melhorar UI de sequência lógica:**

```typescript
// Exibir timeline de follow-ups
interface FollowUpTimeline {
  id: string;
  sequence: number;        // 1, 2, 3...
  title: string;
  status: "pending" | "inprogress" | "completed";
  completionPercent: number;
  createdAt: Date;
  completedAt?: Date;
}

// Componente de Timeline
<div className="space-y-4">
  {followUps.map((item, index) => (
    <Card key={item.id} className={cn(
      "border-l-4",
      item.status === "completed" && "border-l-green-500",
      item.status === "inprogress" && "border-l-blue-500",
      item.status === "pending" && "border-l-gray-300"
    )}>
      <div className="flex items-center gap-4">
        <div className="font-bold text-lg">#{index + 1}</div>
        <div className="flex-1">
          <h4>{item.title}</h4>
          <p className="text-sm text-muted-foreground">
            Status: {statusLabels[item.status]}
          </p>
        </div>
        <Progress value={item.completionPercent} className="w-24" />
        <span className="text-sm font-medium">{item.completionPercent}%</span>
      </div>
    </Card>
  ))}
</div>
```

---

### 4️⃣ SWOT Edit - Erro 500 ao Salvar (/strategic/swot/[id])

**Problema:**  
Após preencher formulário SWOT e clicar em Salvar → Erro 500

**Logs NÃO Encontrados no Console.txt**  
(Precisa verificar network tab ou server logs)

**Investigação Necessária:**
```bash
# 1. Verificar API route de SWOT PUT
cat src/app/api/strategic/swot/[id]/route.ts

# 2. Verificar schema Prisma
grep -A 30 "model StrategicSwot" prisma/schema.prisma

# 3. Buscar erros de validação
grep -A 10 "swot.*validation\|swot.*schema" src/
```

**Causas Prováveis:**
1. **Schema mismatch** - Campos camelCase vs snake_case
2. **Campo obrigatório faltando** - NULL constraint violation
3. **FK inválida** - Tentando referenciar ID inexistente
4. **Tipo de dado errado** - String no lugar de number

**Solução Planejada (após investigação):**

Verificar estrutura do PUT:

```typescript
// src/app/api/strategic/swot/[id]/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withPermission(request, "strategic.swot.edit", async (user, ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const body = await request.json();
    const { id } = params;

    // ✅ Garantir que campos obrigatórios existem
    const data = {
      title: body.title,
      description: body.description,
      
      // SWOT fields
      strengths: body.strengths || [],      // ⚠️ Se obrigatório no DB
      weaknesses: body.weaknesses || [],
      opportunities: body.opportunities || [],
      threats: body.threats || [],
      
      // Auditoria
      updatedBy: user.id,
      updatedAt: new Date(),
    };

    // Validar tipos
    if (typeof data.title !== "string" || data.title.length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    try {
      const updated = await db.strategicSwot.update({
        where: {
          id,
          organizationId: ctx.organizationId, // Multi-tenant check
        },
        data,
      });

      return NextResponse.json(updated);
    } catch (error) {
      console.error("[SWOT UPDATE ERROR]", error);
      
      // Log detalhado para debug
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Prisma Error Code:", error.code);
        console.error("Prisma Error Meta:", error.meta);
      }
      
      return NextResponse.json(
        { error: "Failed to update SWOT", details: error.message },
        { status: 500 }
      );
    }
  });
}
```

---

## 🔍 Erros Adicionais Encontrados nos Logs

### React Error #418 (Hydration Mismatch)
```
Error #418: visit https://react.dev/errors/418
```

**Causa:** Mismatch entre HTML server-side e client-side  
**Solução:** Verificar componentes que usam `window`, `localStorage` ou data dinâmica no SSR

### AG Grid License Warnings
```
AG Grid Enterprise License Key Not Found
```

**Causa:** Não é erro crítico, apenas aviso de trial  
**Solução:** Adicionar license key se empresa comprou Enterprise

---

## 📝 Plano de Ação Resumido

| # | Problema | Prioridade | Tempo Estimado | Ferramenta |
|---|----------|------------|----------------|------------|
| 1 | KPIs edit/delete logic | 🔴 Alta | 1-2h | Cursor AI |
| 2 | PDCA Grid rowSelection + actions | 🔴 Alta | 1-2h | Cursor AI |
| 3 | Follow-up i18n + timeline UI | 🟡 Média | 2-3h | Cursor Composer |
| 4 | SWOT 500 error | 🔴 **CRÍTICA** | 1-2h | Claude Code CLI |

**Total:** 5-9 horas

---

## 🚀 Ordem de Execução Recomendada

1. **SWOT 500** (bloqueador crítico) - Claude Code CLI
2. **PDCA Grid** (UX ruim) - Cursor AI
3. **KPIs edit/delete** (regra de negócio) - Cursor AI
4. **Follow-up i18n** (polish) - Cursor Composer

---

## ✅ Checklist Pré-Correção

- [ ] Fazer backup do banco (dump SQL)
- [ ] Criar branch `fix/strategic-ui-bugs`
- [ ] Rodar `npm run dev` e reproduzir cada bug
- [ ] Capturar Network tab do SWOT 500 error
- [ ] Verificar server logs do Coolify
- [ ] Documentar payload exato que causa erro

---

**Aguardando autorização para iniciar correções.**
