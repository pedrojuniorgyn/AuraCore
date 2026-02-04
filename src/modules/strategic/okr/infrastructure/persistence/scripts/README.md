# OKR Data Migration Script

Script para migrar dados de OKRs do Mock Store para SQL Server usando DDD Repository.

---

## 📋 Pré-requisitos

1. **SQL Server rodando** (localhost:1433 ou remoto via env)
2. **Tabelas criadas** (schema já definido em Task 02)
3. **Environment variables** configuradas (.env.local)

---

## 🚀 Execução

### Passo 1: Verificar SQL Server

```bash
# Verificar se SQL Server está rodando
# Docker:
docker ps | grep mssql

# Ou testar conexão:
sqlcmd -S localhost -U sa -Q "SELECT @@VERSION"
```

### Passo 2: Criar Tabelas (se necessário)

As tabelas `strategic_okr` e `strategic_okr_key_result` devem existir. Se não existirem:

```bash
# Opção 1: Usar Drizzle Push (desenvolvimento)
npm run db:migrate:test

# Opção 2: Executar migration SQL manual
# (Se houver arquivo SQL específico para OKRs)
```

### Passo 3: Executar Migração

```bash
# Via tsx (recomendado - mais rápido)
npx tsx src/modules/strategic/okr/infrastructure/persistence/scripts/migrate-okrs-to-db.ts

# Ou via ts-node
npx ts-node src/modules/strategic/okr/infrastructure/persistence/scripts/migrate-okrs-to-db.ts
```

---

## 📊 Dados Migrados

O script migra **5 OKRs** do Mock Store (`src/lib/okrs/mock-store.ts`):

| Nível | Título | Key Results |
|-------|--------|-------------|
| **Corporate** | Aumentar eficiência operacional em 20% | 3 KRs |
| **Department** | Otimizar rotas de entrega | 2 KRs |
| **Department** | Reduzir custos operacionais | 1 KR |
| **Department** | Aumentar vendas em 15% | 1 KR |
| **Team** | Melhorar OTD Região Norte | 1 KR |

**Total:** 5 OKRs + ~8 Key Results

---

## ✅ Output Esperado

```
🚀 Starting OKRs migration from Mock Store to SQL Server...

🔌 Connecting to SQL Server...
✅ Connected to SQL Server

📦 Registering DI Container...
[OkrModule] Dependencies registered successfully
✅ DI Container registered

📄 Found 5 OKRs in Mock Store

📦 Migrating: "Aumentar eficiência operacional em 20%" (corporate)...
  ✅ Saved: 550e8400-e29b-41d4-a716-446655440000 (3 Key Results, 65% progress)
📦 Migrating: "Otimizar rotas de entrega" (department)...
  ✅ Saved: 550e8400-e29b-41d4-a716-446655440001 (2 Key Results, 75% progress)
...

============================================================
📊 MIGRATION SUMMARY
============================================================
Total OKRs: 5
✅ Success: 5
❌ Errors: 0
============================================================

🎉 Migration completed successfully!

📋 Next Steps:
1. Validate data in SQL Server
2. Update APIs to use Repository (Task 04)
3. Delete Mock Store + JSON (Task 05)
```

---

## 🔍 Validação Pós-Migração

```sql
-- Verificar OKRs migrados
SELECT id, title, level, progress, status 
FROM strategic_okr
WHERE deleted_at IS NULL
ORDER BY CASE level
  WHEN 'corporate' THEN 1
  WHEN 'department' THEN 2
  WHEN 'team' THEN 3
  WHEN 'individual' THEN 4
END;

-- Verificar Key Results
SELECT 
  kr.id,
  okr.title AS okr_title,
  kr.title AS kr_title,
  kr.current_value,
  kr.target_value,
  kr.status
FROM strategic_okr_key_result kr
INNER JOIN strategic_okr okr ON kr.okr_id = okr.id
ORDER BY okr.title, kr.order_index;

-- Contar registros
SELECT 
  (SELECT COUNT(*) FROM strategic_okr WHERE deleted_at IS NULL) AS total_okrs,
  (SELECT COUNT(*) FROM strategic_okr_key_result) AS total_key_results;
```

**Resultado Esperado:**
- **5 OKRs** inseridos
- **~8 Key Results** inseridos
- Hierarquia preservada (parent_id)
- Progress calculado corretamente

---

## ❌ Troubleshooting

### Erro: Connection is closed

```
❌ Save failed: ConnectionError: Connection is closed.
```

**Solução:** Adicionar `ensureConnection()` antes de usar Repository (já implementado).

### Erro: Failed to connect to localhost:1433

```
💥 Fatal error: ConnectionError: Failed to connect to localhost:1433
```

**Solução:**
1. Verificar se SQL Server está rodando
2. Verificar variáveis de ambiente (.env.local)
3. Testar conexão com sqlcmd ou Azure Data Studio

### Erro: Invalid object name 'strategic_okr'

```
❌ Save failed: Invalid object name 'strategic_okr'
```

**Solução:** Executar migrations Drizzle primeiro:
```bash
npm run db:migrate:test
```

---

## 🔄 Re-execução

O script **preserva IDs originais** do Mock Store (UUIDs fixos). Se executado múltiplas vezes:

- **Primeira execução:** INSERT de 5 OKRs
- **Execuções seguintes:** UPDATE dos mesmos 5 OKRs (via `repository.save()`)

Seguro executar múltiplas vezes (idempotente).

---

## 📝 Próximas Tarefas

1. ✅ **Task 03 (atual):** Criar script de migração
2. ⏳ **Task 04:** Update APIs (use Repository ao invés de Mock Store)
3. ⏳ **Task 05:** Delete Mock Store + JSON (`src/lib/okrs/`)
4. ⏳ **Task 06:** Testes de integração

---

## 📚 Referências

- **Schema:** `src/modules/strategic/okr/infrastructure/persistence/schemas/okr.schema.ts`
- **Repository:** `src/modules/strategic/okr/infrastructure/persistence/repositories/DrizzleOkrRepository.ts`
- **Mock Store:** `src/lib/okrs/mock-store.ts` (será deletado na Task 05)
- **DDD Entities:** `src/modules/strategic/okr/domain/entities/`

---

**Status:** ✅ Script pronto | ⏸️  Aguardando SQL Server para executar

**Autor:** AuraCore DDD Migration Team  
**Data:** 04/02/2026
