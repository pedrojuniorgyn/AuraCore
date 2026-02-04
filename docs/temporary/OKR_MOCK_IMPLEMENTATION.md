# OKR Mock Implementation - Temporário

**Status:** ⚠️ TEMPORÁRIO (Mock data até implementação DDD completa)  
**Data:** 04/02/2026  
**Bug Fix:** BUG-002 - Remover Dados Mock  

---

## 📋 Contexto

Os OKRs atualmente **não possuem** implementação DDD/Hexagonal completa:
- ❌ Nenhum Entity/Aggregate no domain
- ❌ Nenhum Repository implementado
- ❌ Nenhum schema SQL criado
- ❌ Nenhuma tabela no banco de dados

**Por que temporário?**
Implementar DDD completo foge do escopo deste bug fix (que era apenas remover strings mock que causavam erro 500).

---

## 🛠️ Implementação Atual (Mock)

### Store Centralizado

**Arquivo:** `src/lib/okrs/mock-store.ts`

- **Singleton Map<string, OKR>** em memória
- **UUIDs fixos** ao invés de strings descritivas
- **5 OKRs de exemplo** (1 corporate, 3 department, 1 team)
- **Funções utilitárias:** getAllOkrs, getOkrById, createOkr, updateOkr, deleteOkr

### IDs Fixos (UUIDs)

| Tipo | ID (UUID v4) | Título |
|---|---|---|
| Corporate | `550e8400-e29b-41d4-a716-446655440000` | Aumentar eficiência operacional |
| Department | `550e8400-e29b-41d4-a716-446655440001` | Otimizar rotas de entrega |
| Department | `550e8400-e29b-41d4-a716-446655440002` | Reduzir custos operacionais |
| Department | `550e8400-e29b-41d4-a716-446655440003` | Aumentar vendas em 15% |
| Team | `550e8400-e29b-41d4-a716-446655440004` | Melhorar OTD Região Norte |

**Por que UUIDs fixos?**
- Permitir navegação consistente entre sessões
- Evitar erro 404 ao acessar páginas de detalhes
- Formato compatível com futuro banco de dados

---

## 🔄 Arquivos Atualizados

### API Routes

| Arquivo | Mudança | Antes | Depois |
|---|---|---|---|
| `route.ts` | Centralizar store | Map local | Import getAllOkrs |
| `tree/route.ts` | Centralizar store | Map local | Import getAllOkrs |
| `[id]/route.ts` | Centralizar store | Fetch interno | Import getOkrById |
| `[id]/route.ts` | PATCH/DELETE | Fetch interno | Import updateOkr/deleteOkr |

### Benefícios da Centralização

1. **Elimina fetch interno** que causava erro SSL em produção
2. **Consistência de dados** (mesmo store em todas rotas)
3. **Facilita migração** futura para DDD (apenas trocar import)

---

## 🚨 Limitações Conhecidas

### 1. Dados Não Persistem

**Problema:** Dados são perdidos ao reiniciar servidor.

**Workaround:** Store é reinicializado automaticamente.

**Solução Definitiva:** Implementar DDD + SQL (próximo épico).

### 2. Multi-Tenancy Simulado

**Problema:** organizationId e branchId são hardcoded (sempre 1).

**Workaround:** Filtrar manualmente no código.

**Solução Definitiva:** Contexto de tenant real via getTenantContext().

### 3. Concorrência

**Problema:** Map em memória não é thread-safe.

**Workaround:** Next.js single-threaded por request.

**Solução Definitiva:** Transações SQL.

### 4. Sem Validação de Negócio

**Problema:** Zod valida apenas tipos, não regras de negócio.

**Exemplo:** Pode criar OKR com parentId inexistente.

**Solução Definitiva:** Domain Entities com validações.

---

## 📝 Roadmap para Implementação DDD

### Fase 1: Domain Layer (1-2 dias)

```
src/modules/strategic/
├── domain/
│   ├── entities/
│   │   ├── Okr.ts                    ✅ Entity completa
│   │   └── KeyResult.ts              ✅ Value Object
│   ├── value-objects/
│   │   ├── OkrTitle.ts
│   │   ├── OkrPeriod.ts
│   │   └── Progress.ts
│   ├── services/
│   │   └── OkrProgressCalculator.ts  ✅ Domain Service
│   └── ports/
│       ├── input/
│       │   ├── ICreateOkrUseCase.ts
│       │   └── IUpdateOkrUseCase.ts
│       └── output/
│           └── IOkrRepository.ts      ✅ Repository Interface
```

### Fase 2: Infrastructure Layer (1 dia)

```
infrastructure/
├── persistence/
│   ├── schemas/
│   │   ├── okr.schema.ts             ✅ Drizzle Schema
│   │   └── key-result.schema.ts
│   ├── mappers/
│   │   └── OkrMapper.ts              ✅ toDomain/toPersistence
│   └── repositories/
│       └── DrizzleOkrRepository.ts    ✅ Implementação SQL Server
```

### Fase 3: Application Layer (1 dia)

```
application/
├── commands/
│   ├── CreateOkrCommand.ts
│   ├── UpdateOkrCommand.ts
│   └── DeleteOkrCommand.ts
└── queries/
    ├── GetOkrByIdQuery.ts
    ├── ListOkrsQuery.ts
    └── GetOkrTreeQuery.ts
```

### Fase 4: Migration SQL (meio dia)

```sql
-- migrations/XXXX_create_okrs_table.sql

CREATE TABLE okrs (
  id VARCHAR(36) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX),
  level VARCHAR(20) NOT NULL, -- corporate|department|team|individual
  parent_id VARCHAR(36),
  period_type VARCHAR(20), -- quarter|year|custom
  period_label NVARCHAR(50),
  start_date DATE,
  end_date DATE,
  owner_id NVARCHAR(100),
  owner_name NVARCHAR(200),
  owner_type VARCHAR(20), -- user|department|team
  progress DECIMAL(5,2),
  status VARCHAR(20), -- draft|active|completed|cancelled
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  created_by NVARCHAR(100),
  deleted_at DATETIME2,
  
  CONSTRAINT FK_okrs_parent FOREIGN KEY (parent_id) REFERENCES okrs(id),
  INDEX idx_okrs_tenant (organization_id, branch_id) WHERE deleted_at IS NULL,
  INDEX idx_okrs_parent (parent_id) WHERE deleted_at IS NULL,
  INDEX idx_okrs_period (period_label, start_date, end_date)
);

CREATE TABLE key_results (
  id VARCHAR(36) PRIMARY KEY,
  okr_id VARCHAR(36) NOT NULL,
  title NVARCHAR(200) NOT NULL,
  metric_type VARCHAR(20), -- number|percentage|currency|boolean
  start_value DECIMAL(18,2),
  target_value DECIMAL(18,2),
  current_value DECIMAL(18,2),
  progress DECIMAL(5,2),
  status VARCHAR(20), -- on_track|at_risk|blocked|completed
  weight INT,
  linked_kpi_id VARCHAR(36),
  [order] INT,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  deleted_at DATETIME2,
  
  CONSTRAINT FK_key_results_okr FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE,
  INDEX idx_key_results_okr (okr_id) WHERE deleted_at IS NULL
);

CREATE TABLE key_result_history (
  id VARCHAR(36) PRIMARY KEY,
  key_result_id VARCHAR(36) NOT NULL,
  value DECIMAL(18,2) NOT NULL,
  progress DECIMAL(5,2) NOT NULL,
  timestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_by NVARCHAR(100),
  notes NVARCHAR(MAX),
  
  CONSTRAINT FK_kr_history_kr FOREIGN KEY (key_result_id) REFERENCES key_results(id) ON DELETE CASCADE,
  INDEX idx_kr_history_kr (key_result_id, timestamp DESC)
);
```

### Fase 5: Substituir Mock nas Rotas (meio dia)

```typescript
// ANTES (Mock)
import { getAllOkrs } from '@/lib/okrs/mock-store';
const okrs = getAllOkrs();

// DEPOIS (DDD)
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IListOkrsQuery } from '@/modules/strategic/domain/ports/input/IListOkrsQuery';

const query = container.resolve<IListOkrsQuery>(STRATEGIC_TOKENS.ListOkrsQuery);
const result = await query.execute(filter);
```

---

## ✅ Critérios de Aceitação (Futuro DDD)

Quando implementar DDD, garantir:

- [ ] Entity Okr com validações de negócio
- [ ] Value Objects imutáveis (OkrTitle, Progress, etc)
- [ ] Repository com multi-tenancy (organizationId + branchId)
- [ ] Schema SQL com índices compostos
- [ ] Migrations testadas em local/homolog
- [ ] Soft delete (deletedAt)
- [ ] Use Cases registrados no DI
- [ ] Mapper com toDomain/toPersistence
- [ ] Testes unitários (Entity + Domain Service)
- [ ] Testes de integração (Repository)

---

## 📚 Referências

- **Regras MCP:** `.cursor/rules/regrasmcp.mdc`
- **Arquitetura DDD:** `docs/architecture/E7_DDD_HEXAGONAL_HIBRIDO.md`
- **Entity Pattern:** Seção ENTITY-001 a ENTITY-012 (regrasmcp.mdc)
- **Repository Pattern:** Seção REPO-001 a REPO-012 (regrasmcp.mdc)
- **Schema Pattern:** Seção SCHEMA-001 a SCHEMA-010 (regrasmcp.mdc)

---

**⚠️ AVISO:** Este mock é TEMPORÁRIO. Não expandir funcionalidades sem implementar DDD completo.

**Próximo Épico:** E8.5 - Implementação DDD de OKRs  
**Prioridade:** MÉDIA (funcionalidade mock atende temporariamente)  
**Estimativa:** 3-4 dias de desenvolvimento

---

**FIM DA DOCUMENTAÇÃO - Atualizado em 04/02/2026**
