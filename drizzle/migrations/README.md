# Guia de Migrations - AuraCore

## Sequência de Execução (E8.4 - E9.2)

### Contexto

Durante os épicos E8.4 a E9.2, houve múltiplas migrations para:

1. Criar índices de performance (0034)
2. Corrigir índices com colunas inexistentes (0036)
3. Adicionar branch_id para multi-tenancy (0037)
4. Adicionar deleted_at para soft delete (0038)

### Ordem Correta de Execução

| # | Migration | Descrição | Quando Executar |
|---|-----------|-----------|-----------------|
| 1 | `0034_add_tenant_indexes.sql` | Índices iniciais (DEPRECADO) | **NÃO EXECUTAR** - tinha erros de colunas inexistentes |
| 2 | `0036_fix_tenant_indexes.sql` | Corrige 0034 | Apenas se 0034 foi executada |
| 3 | `0037_add_branch_id_to_tables.sql` | Adiciona branch_id + índices | **EXECUTAR** |
| 4 | `0038_add_deleted_at_soft_delete.sql` | Adiciona deleted_at | **EXECUTAR** |

---

## Cenários de Execução

### Para Ambiente NOVO (sem migrations anteriores)

```bash
# Apenas executar as migrations válidas:
sqlcmd -S servidor -d banco -i 0037_add_branch_id_to_tables.sql
sqlcmd -S servidor -d banco -i 0038_add_deleted_at_soft_delete.sql
```

### Para Ambiente com 0034 já executada

```bash
# Primeiro corrigir, depois adicionar:
sqlcmd -S servidor -d banco -i 0036_fix_tenant_indexes.sql
sqlcmd -S servidor -d banco -i 0037_add_branch_id_to_tables.sql
sqlcmd -S servidor -d banco -i 0038_add_deleted_at_soft_delete.sql
```

---

## Tabelas Afetadas

### Migration 0037 - branch_id + Índices (9 tabelas)

| Tabela | branch_id | Índice | Épico |
|--------|-----------|--------|-------|
| bank_transactions | ✅ | idx_bank_transactions_tenant | E9.1 |
| fuel_transactions | ✅ | idx_fuel_transactions_tenant | E9.1 |
| warehouse_movements | ✅ | idx_warehouse_movements_tenant | E9.1 |
| maintenance_work_orders | ✅ | idx_maintenance_work_orders_tenant | E9.1 |
| cost_centers | ✅ | idx_cost_centers_tenant | E9.1 |
| drivers | ✅ | idx_drivers_tenant | E9.1 |
| products | ✅ | idx_products_tenant | E9.1 |
| vehicles | ✅ (já tinha) | idx_vehicles_tenant | E9.1.3 |
| warehouse_locations | ✅ | idx_warehouse_locations_tenant | E9.1.3 |

### Migration 0038 - deleted_at (6 tabelas)

| Tabela | deleted_at | Épico |
|--------|------------|-------|
| bank_transactions | ✅ | E9.2 |
| fiscal_settings | ✅ | E9.2 |
| fuel_transactions | ✅ | E9.2 |
| warehouse_movements | ✅ | E9.2 |
| warehouse_locations | ✅ | E9.2 |
| trip_checkpoints | ✅ | E9.2 |

---

## Sobre o DEFAULT 1 para branch_id

### Decisão de Design

Foi usado `DEFAULT 1` para branch_id porque:

1. **AuraCore NÃO está em produção com múltiplos branches** - todos os dados existentes são de branch_id = 1 (branch padrão)
2. **Backward compatibility** - código existente que não passa branchId continua funcionando
3. **Migração gradual** - permite atualizar Use Cases incrementalmente

### Relação com PREVENT-006

A regra `PREVENT-006` diz "branchId ALWAYS obrigatório" referindo-se a **filtros em queries**, não ao schema. O default no schema é permitido para backward compatibility.

```sql
-- ✅ CORRETO: Query DEVE filtrar por branchId
SELECT * FROM products 
WHERE organization_id = @orgId AND branch_id = @branchId;

-- ❌ ERRADO: Query sem filtro de branchId (viola PREVENT-006)
SELECT * FROM products 
WHERE organization_id = @orgId;
```

### Ação Futura (quando implementar multi-branch)

1. Remover DEFAULT do schema
2. Atualizar todos os Use Cases para passar branchId explicitamente
3. Validar inserts em código, não depender do banco

---

## Rollback

### Rollback Migration 0037

```sql
-- Remover índices
DROP INDEX IF EXISTS [idx_bank_transactions_tenant] ON [bank_transactions];
DROP INDEX IF EXISTS [idx_fuel_transactions_tenant] ON [fuel_transactions];
DROP INDEX IF EXISTS [idx_warehouse_movements_tenant] ON [warehouse_movements];
DROP INDEX IF EXISTS [idx_maintenance_work_orders_tenant] ON [maintenance_work_orders];
DROP INDEX IF EXISTS [idx_cost_centers_tenant] ON [cost_centers];
DROP INDEX IF EXISTS [idx_drivers_tenant] ON [drivers];
DROP INDEX IF EXISTS [idx_products_tenant] ON [products];
DROP INDEX IF EXISTS [idx_vehicles_tenant] ON [vehicles];
DROP INDEX IF EXISTS [idx_warehouse_locations_tenant] ON [warehouse_locations];

-- Remover colunas branch_id
ALTER TABLE [bank_transactions] DROP COLUMN [branch_id];
ALTER TABLE [fuel_transactions] DROP COLUMN [branch_id];
ALTER TABLE [warehouse_movements] DROP COLUMN [branch_id];
ALTER TABLE [maintenance_work_orders] DROP COLUMN [branch_id];
ALTER TABLE [cost_centers] DROP COLUMN [branch_id];
ALTER TABLE [drivers] DROP COLUMN [branch_id];
ALTER TABLE [products] DROP COLUMN [branch_id];
-- vehicles já tinha branch_id, não remover
ALTER TABLE [warehouse_locations] DROP COLUMN [branch_id];
ALTER TABLE [warehouse_locations] DROP COLUMN [organization_id];
```

### Rollback Migration 0038

```sql
ALTER TABLE [bank_transactions] DROP COLUMN [deleted_at];
ALTER TABLE [fiscal_settings] DROP COLUMN [deleted_at];
ALTER TABLE [fuel_transactions] DROP COLUMN [deleted_at];
ALTER TABLE [warehouse_movements] DROP COLUMN [deleted_at];
ALTER TABLE [warehouse_locations] DROP COLUMN [deleted_at];
ALTER TABLE [trip_checkpoints] DROP COLUMN [deleted_at];
```

---

## Referências

- **Épico E8.4**: Auditoria de schema gaps
- **Épico E9.1**: Multi-tenancy compliance (branch_id)
- **Épico E9.1.1**: Índices compostos no schema Drizzle
- **Épico E9.1.3**: Tabelas faltantes (vehicles, warehouse_locations)
- **Épico E9.2**: Soft delete compliance (deleted_at)
- **Regra SCHEMA-003**: Índice composto obrigatório
- **Regra SCHEMA-006**: Soft delete obrigatório
