# 🔧 ANÁLISE: TELAS QUE PRECISAM DE CRUD COMPLETO

**Data:** 10/12/2025  
**Status:** 📋 Identificação de Pendências  
**Prioridade:** 🟡 MÉDIA (Melhorias de usabilidade)

---

## 📊 RESUMO EXECUTIVO

**Situação Atual:**
- ✅ **CREATE (Criar):** Implementado na maioria das telas
- ✅ **READ (Listar):** Implementado em todas as telas
- ⚠️ **UPDATE (Editar):** Parcialmente implementado
- ⚠️ **DELETE (Excluir):** Implementado em apenas 14 APIs

**Total de Telas Analisadas:** 82 páginas  
**APIs com DELETE:** 14  
**APIs com PUT:** 18  
**Telas com CRUD Incompleto:** ~30-40 telas

---

## 🎯 CATEGORIZAÇÃO POR PRIORIDADE

### 🔴 **ALTA PRIORIDADE** (Críticas para Operação)

Telas de cadastros básicos que são editados/excluídos frequentemente:

#### 1. **FROTA** 🚛

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Veículos** | `/frota/veiculos` | `/api/fleet/vehicles` | ❌ Incompleto | PUT, DELETE |
| **Motoristas** | `/frota/motoristas` | `/api/fleet/drivers` | ❌ Incompleto | PUT, DELETE |
| **Pneus** | `/frota/pneus` | `/api/fleet/tires` | ❌ Incompleto | PUT, DELETE |
| **Planos Manutenção** | `/frota/manutencao/planos` | `/api/fleet/maintenance-plans` | ❌ Incompleto | PUT, DELETE |
| **Ordens de Serviço** | `/frota/manutencao/ordens` | `/api/fleet/maintenance/work-orders` | ❌ Incompleto | PUT, DELETE |
| **Documentação Frota** | `/frota/documentacao` | `/api/fleet/documents` | ❌ Incompleto | PUT, DELETE |

**Impacto:**
- ⚠️ Usuários não conseguem corrigir erros de cadastro
- ⚠️ Dados errados ficam permanentes no sistema
- ⚠️ Necessário pedir suporte para correções simples

**Prioridade:** 🔴 **ALTA** - Uso diário, dados mutáveis

---

#### 2. **TMS (TRANSPORTE)** 📦

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Viagens** | `/tms/viagens` | `/api/tms/trips` | ❌ Incompleto | PUT, DELETE |
| **Ocorrências** | `/tms/ocorrencias` | `/api/tms/occurrences` | ❌ Incompleto | PUT, DELETE |
| **Repositório Cargas** | `/tms/repositorio-cargas` | `/api/tms/cargo-repository/[id]` | ✅ DELETE OK | PUT |

**Impacto:**
- ⚠️ Viagens com dados errados não podem ser corrigidas
- ⚠️ Ocorrências registradas incorretamente ficam permanentes
- ⚠️ Cargas não podem ser editadas após criação

**Prioridade:** 🔴 **ALTA** - Operação diária

---

#### 3. **COMERCIAL** 💼

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Tabelas de Frete** | `/comercial/tabelas-frete` | `/api/commercial/freight-tables/[id]` | ✅ PUT/DELETE OK | - |
| **Cotações** | `/comercial/cotacoes` | `/api/commercial/quotes/[id]` | ✅ PUT/DELETE OK | - |
| **Propostas** | `/comercial/propostas` | `/api/comercial/proposals` | ❌ Incompleto | PUT, DELETE |
| **CRM Leads** | `/comercial/crm` | `/api/comercial/crm/leads/[id]` | ✅ PUT OK | DELETE |

**Impacto:**
- ✅ Tabelas e cotações já funcionam bem
- ⚠️ Propostas não podem ser editadas após criação
- ⚠️ Leads não podem ser deletados

**Prioridade:** 🔴 **ALTA** - Impacta vendas

---

### 🟡 **MÉDIA PRIORIDADE** (Importantes mas menos frequentes)

#### 4. **FINANCEIRO** 💰

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Centros de Custo** | `/financeiro/centros-custo` | `/api/financial/cost-centers/[id]` | ✅ PUT/DELETE OK | - |
| **Plano de Contas** | `/financeiro/plano-contas` | `/api/financial/chart-accounts/[id]` | ✅ PUT/DELETE OK | - |
| **Categorias** | `/financeiro/categorias` | `/api/financial/categories/[id]` | ✅ PUT/DELETE OK | - |
| **Contas a Pagar** | `/financeiro/contas-pagar` | `/api/financial/payables` | ❌ Incompleto | PUT, DELETE |
| **Contas a Receber** | `/financeiro/contas-receber` | `/api/financial/receivables` | ❌ Incompleto | PUT, DELETE |
| **Faturamento** | `/financeiro/faturamento` | `/api/financial/billing` | ❌ Incompleto | PUT, DELETE |
| **Remessas CNAB** | `/financeiro/remessas` | `/api/financial/remittances` | ❌ Incompleto | DELETE |

**Impacto:**
- ✅ Estruturas base (CC, Plano Contas) já funcionam
- ⚠️ Títulos financeiros não podem ser editados (problema médio)
- ⚠️ Faturas não podem ser corrigidas antes de enviar

**Prioridade:** 🟡 **MÉDIA** - Importante mas com workarounds (recriar)

---

#### 5. **FISCAL** 📄

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Documentos Fiscais** | `/fiscal/documentos` | `/api/fiscal/documents/[id]` | ✅ PUT/DELETE OK | - |
| **Matriz Tributária** | `/fiscal/matriz-tributaria` | `/api/fiscal/tax-matrix/[id]` | ✅ PUT/DELETE OK | - |
| **NCM Categorias** | `/fiscal/ncm-categorias` | `/api/fiscal/ncm-categories` | ❌ Incompleto | PUT, DELETE |
| **CTe** | `/fiscal/cte` | `/api/fiscal/cte` | ❌ Incompleto | PUT (apenas Cancel) |
| **CIAP** | `/fiscal/ciap` | `/api/ciap` | ❌ Incompleto | PUT, DELETE |

**Impacto:**
- ✅ Documentos e matriz já funcionam bem
- ⚠️ NCM não pode ser editado (problema menor)
- ✅ CTe não deve ser editado (apenas cancelado - OK)

**Prioridade:** 🟡 **MÉDIA** - Maioria já funciona

---

### 🟢 **BAIXA PRIORIDADE** (Raramente editados)

#### 6. **WMS (ARMAZÉM)** 📦

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Endereços** | `/wms/enderecos` | `/api/wms/locations` | ❌ Incompleto | PUT, DELETE |
| **Inventário** | `/wms/inventario` | `/api/wms/inventory/counts` | ❌ Incompleto | PUT, DELETE |
| **Faturamento WMS** | `/wms/faturamento` | `/api/wms/billing-events/[id]` | ✅ PUT/DELETE OK | - |

**Impacto:**
- ⚠️ Endereços raramente mudam
- ✅ Inventário é periódico (não precisa editar)

**Prioridade:** 🟢 **BAIXA** - Uso esporádico

---

#### 7. **CONFIGURAÇÕES** ⚙️

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Filiais** | `/configuracoes/filiais` | `/api/branches/[id]` | ✅ PUT OK | DELETE |
| **Usuários** | `/configuracoes/usuarios` | `/api/users` | ❌ Incompleto | PUT, DELETE |
| **Configurações Fiscal** | `/configuracoes/fiscal` | `/api/fiscal/settings` | ✅ PUT OK | - |

**Impacto:**
- ⚠️ Filiais raramente são deletadas
- ⚠️ Usuários raramente são editados

**Prioridade:** 🟢 **BAIXA** - Administrativo

---

#### 8. **RH (RECURSOS HUMANOS)** 👥

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Jornadas Motoristas** | `/rh/motoristas/jornadas` | `/api/hr/driver-journey` | ❌ Incompleto | PUT, DELETE |

**Impacto:**
- ⚠️ Jornadas são registros históricos (não devem ser editadas)

**Prioridade:** 🟢 **BAIXA** - Registro histórico

---

#### 9. **SUSTENTABILIDADE** 🌱

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Emissões Carbono** | `/sustentabilidade/carbono` | `/api/esg/emissions` | ❌ Incompleto | PUT, DELETE |

**Impacto:**
- ⚠️ Dados de emissão são calculados automaticamente

**Prioridade:** 🟢 **BAIXA** - Dados gerados automaticamente

---

#### 10. **OPERACIONAL** 📊

| Tela | Rota | API | Status CRUD | Falta |
|------|------|-----|-------------|-------|
| **Sinistros** | `/operacional/sinistros` | `/api/claims/[id]` | ✅ PUT/DELETE OK | - |
| **Margem CTe** | `/operacional/margem-cte` | `/api/reports/cte-margin` | ❌ Apenas leitura | N/A |

**Impacto:**
- ✅ Sinistros já funcionam
- ✅ Margem é relatório (apenas leitura - OK)

**Prioridade:** 🟢 **BAIXA** - Já funciona ou é read-only

---

## 📋 RESUMO POR MÓDULO

| Módulo | Total Telas | CRUD Completo | CRUD Incompleto | % Completo |
|--------|-------------|---------------|-----------------|------------|
| **Frota** | 7 | 0 | 7 | 0% 🔴 |
| **TMS** | 6 | 1 | 5 | 17% 🔴 |
| **Comercial** | 5 | 2 | 3 | 40% 🟡 |
| **Financeiro** | 13 | 3 | 10 | 23% 🟡 |
| **Fiscal** | 9 | 2 | 7 | 22% 🟡 |
| **Cadastros** | 3 | 2 | 1 | 67% ✅ |
| **WMS** | 4 | 1 | 3 | 25% 🟡 |
| **Configurações** | 6 | 2 | 4 | 33% 🟡 |
| **RH** | 1 | 0 | 1 | 0% 🟢 |
| **Sustentabilidade** | 1 | 0 | 1 | 0% 🟢 |
| **Operacional** | 2 | 1 | 1 | 50% ✅ |

---

## 🎯 PLANO DE AÇÃO RECOMENDADO

### **FASE 1: CRÍTICAS (1-2 dias)** 🔴

**Prioridade 1 - Frota (6 telas):**
```typescript
✅ Implementar em:
1. /api/fleet/vehicles/[id]        - PUT, DELETE
2. /api/fleet/drivers/[id]         - PUT, DELETE
3. /api/fleet/tires/[id]           - PUT, DELETE
4. /api/fleet/maintenance-plans/[id] - PUT, DELETE
5. /api/fleet/maintenance/work-orders/[id] - PUT, DELETE
6. /api/fleet/documents/[id]       - PUT, DELETE
```

**Prioridade 2 - TMS (3 telas):**
```typescript
✅ Implementar em:
1. /api/tms/trips/[id]             - PUT, DELETE
2. /api/tms/occurrences/[id]       - PUT, DELETE
3. /api/tms/cargo-repository/[id]  - PUT (DELETE já OK)
```

**Estimativa:** 8-12 horas  
**Impacto:** 🔴 ALTO - Uso diário

---

### **FASE 2: IMPORTANTES (2-3 dias)** 🟡

**Comercial (2 telas):**
```typescript
✅ Implementar em:
1. /api/comercial/proposals/[id]    - PUT, DELETE
2. /api/comercial/crm/leads/[id]    - DELETE (PUT já OK)
```

**Financeiro (4 telas principais):**
```typescript
✅ Implementar em:
1. /api/financial/payables/[id]     - PUT, DELETE
2. /api/financial/receivables/[id]  - PUT, DELETE
3. /api/financial/billing/[id]      - PUT, DELETE
4. /api/financial/remittances/[id]  - DELETE
```

**Estimativa:** 10-14 horas  
**Impacto:** 🟡 MÉDIO - Importante mas com workarounds

---

### **FASE 3: COMPLEMENTARES (1-2 dias)** 🟢

**Fiscal, WMS, Config (8 telas):**
```typescript
✅ Implementar em:
1. /api/fiscal/ncm-categories/[id]  - PUT, DELETE
2. /api/fiscal/ciap/[id]            - PUT, DELETE
3. /api/wms/locations/[id]          - PUT, DELETE
4. /api/wms/inventory/counts/[id]   - PUT, DELETE
5. /api/branches/[id]               - DELETE (PUT já OK)
6. /api/users/[id]                  - PUT, DELETE
7. /api/hr/driver-journey/[id]      - PUT, DELETE
8. /api/esg/emissions/[id]          - PUT, DELETE
```

**Estimativa:** 8-10 horas  
**Impacto:** 🟢 BAIXO - Uso esporádico

---

## 🔧 TEMPLATE DE IMPLEMENTAÇÃO

### **Exemplo: API com PUT e DELETE**

```typescript
// src/app/api/fleet/vehicles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar veículo específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const vehicleId = parseInt(params.id);
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, session.user.organizationId),
          isNull(vehicles.deletedAt)
        )
      )
      .limit(1);

    if (vehicle.length === 0) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: vehicle[0] });
  } catch (error) {
    console.error("Erro ao buscar veículo:", error);
    return NextResponse.json({ error: "Erro ao buscar veículo" }, { status: 500 });
  }
}

// PUT - Atualizar veículo
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const vehicleId = parseInt(params.id);
    const body = await req.json();

    // Validações
    if (!body.plate || !body.type || !body.brand || !body.model) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Verificar se existe
    const existing = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, session.user.organizationId),
          isNull(vehicles.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    // Atualizar
    const updated = await db
      .update(vehicles)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Veículo atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar veículo:", error);
    return NextResponse.json({ error: "Erro ao atualizar veículo" }, { status: 500 });
  }
}

// DELETE - Soft delete do veículo
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const vehicleId = parseInt(params.id);

    // Verificar se existe
    const existing = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, session.user.organizationId),
          isNull(vehicles.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    // Validações de negócio (opcional)
    // Ex: Verificar se veículo está em viagem ativa
    
    // Soft delete
    await db
      .update(vehicles)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(vehicles.id, vehicleId));

    return NextResponse.json({
      success: true,
      message: "Veículo excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir veículo:", error);
    return NextResponse.json({ error: "Erro ao excluir veículo" }, { status: 500 });
  }
}
```

---

### **Exemplo: Frontend com Editar/Excluir**

```typescript
// Adicionar na grid:

const columnDefs: ColDef[] = [
  // ... outras colunas
  {
    field: "actions",
    headerName: "Ações",
    width: 120,
    pinned: "right",
    cellRenderer: (params: any) => {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(params.data)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(params.data.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      );
    },
  },
];

// Handlers:

const handleEdit = (vehicle: Vehicle) => {
  setFormData(vehicle);
  setIsEditing(true);
  setCurrentId(vehicle.id);
  setIsDialogOpen(true);
};

const handleDelete = async (id: number) => {
  if (!confirm("Deseja realmente excluir este veículo?")) return;
  
  try {
    const res = await fetch(`/api/fleet/vehicles/${id}`, {
      method: "DELETE",
    });
    
    if (res.ok) {
      toast.success("Veículo excluído com sucesso");
      refetch(); // Recarregar grid
    } else {
      toast.error("Erro ao excluir veículo");
    }
  } catch (error) {
    toast.error("Erro ao excluir veículo");
  }
};
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Para cada tela:

- [ ] **Backend:**
  - [ ] Criar arquivo `/api/[modulo]/[recurso]/[id]/route.ts`
  - [ ] Implementar `GET` (buscar por ID)
  - [ ] Implementar `PUT` (atualizar)
  - [ ] Implementar `DELETE` (soft delete)
  - [ ] Adicionar validações de negócio
  - [ ] Testar com Postman/Thunder Client

- [ ] **Frontend:**
  - [ ] Adicionar coluna "Ações" na grid
  - [ ] Implementar botões Editar/Excluir
  - [ ] Criar handlers `handleEdit` e `handleDelete`
  - [ ] Adicionar confirmação no delete
  - [ ] Implementar modal de edição (reusar modal de criação)
  - [ ] Adicionar loading states
  - [ ] Testar manualmente

- [ ] **UX:**
  - [ ] Confirmação antes de excluir
  - [ ] Toast de sucesso/erro
  - [ ] Recarregar grid após operação
  - [ ] Validação de formulário

---

## 📊 ESTIMATIVA TOTAL

| Fase | Telas | Horas | Dias (8h) |
|------|-------|-------|-----------|
| Fase 1 - Críticas | 9 | 8-12h | 1-2 dias |
| Fase 2 - Importantes | 6 | 10-14h | 2-3 dias |
| Fase 3 - Complementares | 8 | 8-10h | 1-2 dias |
| **TOTAL** | **23** | **26-36h** | **4-7 dias** |

---

## 🎯 RECOMENDAÇÃO FINAL

### **Implementar Agora (Prioridade Alta):**
1. ✅ **Frota completa** (veículos, motoristas, pneus)
2. ✅ **TMS** (viagens, ocorrências)

### **Implementar na Sequência (Prioridade Média):**
3. ✅ **Comercial** (propostas, leads)
4. ✅ **Financeiro** (títulos, faturamento)

### **Implementar Quando Necessário (Prioridade Baixa):**
5. 🟢 **Demais módulos** (conforme demanda dos usuários)

---

**Análise realizada por:** Arquiteto de Software  
**Data:** 10 de Dezembro de 2025  
**Próxima Revisão:** Após implementação Fase 1

🔧 **Pronto para começar a implementação!**























