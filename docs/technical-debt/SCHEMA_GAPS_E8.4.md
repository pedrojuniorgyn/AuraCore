# Schema Gaps Identificados - E8.4

**Data:** 2026-01-19 (atualizado 2026-02-11)  
**Épico:** E8.4 - Performance Migration  
**Status:** ✅ TODOS RESOLVIDOS (E13.2)  
**Responsável:** Equipe Backend

---

## Resumo Executivo

Durante a execução da E8.4 (migration de índices de performance), foram identificadas **inconsistências críticas** no schema do banco de dados que impedem a criação de índices padronizados e representam gaps arquiteturais.

---

## 1. Tabelas sem `branch_id` (Multi-tenancy Incompleto)

Estas tabelas violam a regra **SCHEMA-003** (índice composto multi-tenancy obrigatório).

| # | Tabela | Módulo | Prioridade | Sprint Sugerida |
|---|--------|--------|------------|-----------------|
| 1 | `bank_transactions` | Financial | 🔴 ALTA | E9.1 |
| 2 | `fuel_transactions` | Fleet | 🔴 ALTA | E9.1 |
| 3 | `warehouse_movements` | WMS | 🔴 ALTA | E9.1 |
| 4 | `maintenance_work_orders` | Fleet | 🟡 MÉDIA | E9.2 |
| 5 | `warehouse_inventory_counts` | WMS | 🟡 MÉDIA | E9.2 |
| 6 | `inventory_adjustments` | WMS | 🟡 MÉDIA | E9.2 |

### Ação Requerida

```sql
-- Template de correção
ALTER TABLE [tabela] ADD [branch_id] INT NULL;
GO

-- Popular com branch_id da organização (se existir padrão)
UPDATE t
SET t.branch_id = b.id
FROM [tabela] t
CROSS APPLY (
  SELECT TOP 1 id FROM branches 
  WHERE organization_id = t.organization_id
  ORDER BY is_headquarters DESC
) b
WHERE t.branch_id IS NULL;
GO

-- Tornar NOT NULL após popular
ALTER TABLE [tabela] ALTER COLUMN [branch_id] INT NOT NULL;
GO
```

---

## 2. Tabelas sem `deleted_at` (Soft Delete Ausente)

Estas tabelas violam a regra **SCHEMA-006** (soft delete obrigatório).

| # | Tabela | Módulo | Prioridade | Sprint Sugerida |
|---|--------|--------|------------|-----------------|
| 1 | `bank_transactions` | Financial | 🔴 ALTA | E9.1 |
| 2 | `fiscal_settings` | Fiscal | 🟡 MÉDIA | E9.2 |
| 3 | `fuel_transactions` | Fleet | 🟡 MÉDIA | E9.2 |
| 4 | `warehouse_movements` | WMS | 🟡 MÉDIA | E9.2 |
| 5 | `warehouse_inventory_counts` | WMS | 🟡 MÉDIA | E9.2 |
| 6 | `inventory_adjustments` | WMS | 🟡 MÉDIA | E9.2 |
| 7 | `trip_checkpoints` | TMS | 🟢 BAIXA | E9.3 |

### Ação Requerida

```sql
ALTER TABLE [tabela] ADD [deleted_at] DATETIME2 NULL;
GO
```

---

## 3. Tabelas Filhas sem Tenant (Design Documentado)

Estas tabelas **NÃO** precisam de `organization_id` e `branch_id` porque são sempre acessadas via JOIN com a tabela pai.

| Tabela | Tabela Pai | Acesso | Status |
|--------|------------|--------|--------|
| `trip_stops` | `trips` | Via JOIN | ✅ SEGURO |
| `trip_documents` | `trips` | Via JOIN | ✅ SEGURO |
| `trip_checkpoints` | `trips` | Via JOIN | ✅ SEGURO |
| `cte_cargo_documents` | `cte_header` | Via JOIN | ✅ SEGURO |
| `cte_value_components` | `cte_header` | Via JOIN | ✅ SEGURO |
| `billing_items` | `billing_invoices` | Via JOIN | ✅ SEGURO |
| `payable_items` | `accounts_payable` | Via JOIN | ✅ SEGURO |

### Regra de Acesso

> **NUNCA** acessar tabelas filhas diretamente. Sempre via JOIN com a tabela pai que possui tenant.

```typescript
// ✅ CORRETO - Acessa via trip (que tem organizationId)
const stops = await db.select()
  .from(tripStops)
  .innerJoin(trips, eq(tripStops.tripId, trips.id))
  .where(eq(trips.organizationId, ctx.organizationId));

// ❌ ERRADO - Acesso direto (vazamento de dados)
const stops = await db.select().from(tripStops);
```

---

## 4. Tabelas sem `updated_at` (Auditoria Incompleta)

| # | Tabela | Prioridade |
|---|--------|------------|
| 1 | `fuel_transactions` | 🟢 BAIXA |
| 2 | `warehouse_movements` | 🟢 BAIXA |
| 3 | `trip_checkpoints` | 🟢 BAIXA |
| 4 | `inventory_adjustments` | 🟢 BAIXA |

---

## 5. Plano de Correção

### Épico E9.1 - Correção de Schema (Crítico)

| Tarefa | Tabela | Ação |
|--------|--------|------|
| E9.1.1 | `bank_transactions` | Adicionar `branch_id`, `deleted_at` |
| E9.1.2 | `fuel_transactions` | Adicionar `branch_id`, `deleted_at`, `updated_at` |
| E9.1.3 | `warehouse_movements` | Adicionar `branch_id`, `deleted_at`, `updated_at` |

### Épico E9.2 - Correção de Schema (Médio)

| Tarefa | Tabela | Ação |
|--------|--------|------|
| E9.2.1 | `maintenance_work_orders` | Adicionar `branch_id` |
| E9.2.2 | `warehouse_inventory_counts` | Adicionar `branch_id`, `deleted_at` |
| E9.2.3 | `inventory_adjustments` | Adicionar `branch_id`, `deleted_at`, `updated_at` |
| E9.2.4 | `fiscal_settings` | Adicionar `deleted_at` |

### Épico E9.3 - Correção de Schema (Baixo)

| Tarefa | Tabela | Ação |
|--------|--------|------|
| E9.3.1 | `trip_checkpoints` | Adicionar `deleted_at`, `updated_at` |

---

## 6. Referências

- **Épico E8.4:** Performance Migration
- **Correções MCP:** LC-740883, LC-743510, LC-745627
- **Padrões:** SCHEMA-003, SCHEMA-005, SCHEMA-006
- **Contrato:** `mcp-server/knowledge/contracts/migrations-contract.json`

---

## Histórico

| Data | Autor | Alteração |
|------|-------|-----------|
| 2026-01-19 | Claude | Criação inicial baseada em auditoria E8.4 |
| 2026-02-11 | AuraCore Team | Todos gaps resolvidos (E13.2). Migrations: 0037, 0038, 0065, 0068. Schemas Drizzle atualizados. |