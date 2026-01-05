# ============================================
# ATUALIZAÇÃO ROADMAP_ONDAS_5A_A_9_EXECUTIVO.md
# ============================================
# Data/Hora: 2026-01-05 16:50:00 UTC
# Épico: E7.12
# Autor: Claude (Arquiteto Enterprise)
# 
# INSTRUÇÕES: Substituir conteúdo do arquivo existente
# em _documentation/planning/ROADMAP_ONDAS_5A_A_9_EXECUTIVO.md
# ============================================

# 🗺️ ROADMAP ONDAS 5A-9 - STATUS ATUALIZADO

**Data/Hora de Atualização:** 2026-01-05 16:50:00 UTC  
**Versão:** 2.0.0  
**Autor:** Claude (Arquiteto Enterprise)

---

## 📌 CONTEXTO HISTÓRICO

Este roadmap foi originalmente planejado em **Dezembro 2024**, ANTES da decisão E7 (DDD/Hexagonal). Após conclusão do E7.0-E7.11, várias ondas foram absorvidas ou precisam ser replanejadas.

---

## 📊 STATUS CONSOLIDADO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ONDAS DE INFRAESTRUTURA - STATUS JANEIRO 2026                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ COMPLETAS:                                                              │
│  ├── Onda 5A: Observabilidade (JSON logs, requestId, correlation)          │
│  ├── Onda 5B: Idempotência (SQL-persisted, webhooks)                       │
│  └── Onda 7: ABSORVIDA PELO E7 (Drizzle modular + Use Cases)               │
│                                                                             │
│  🔄 EM PROGRESSO:                                                           │
│  └── Onda 6: Document Pipeline (parcialmente implementado)                  │
│                                                                             │
│  ⬜ PENDENTES (REPLANEJADAS):                                               │
│  ├── Onda 6 v2: Document Pipeline DDD (1-2 semanas)                        │
│  ├── Onda 8 v2: Performance DDD-aware (2-3 semanas)                        │
│  └── Onda 9 v2: Security DDD + Audit v2 (2-3 semanas)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ ONDA 5A: OBSERVABILIDADE

**Status:** COMPLETA ✅  
**PR:** #15, #20  
**Data de Conclusão:** Novembro 2025

### Entregáveis

| Item | Status | Descrição |
|------|--------|-----------|
| JSON Structured Logs | ✅ | Logs em formato JSON para parsing |
| Request ID | ✅ | UUID único por request |
| Correlation ID | ✅ | Propagação entre serviços |
| Server-Timing Headers | ✅ | Métricas de latência |
| Diagnostics Endpoint | ✅ | `/api/diagnostics` read-only |

### Código

```typescript
// Exemplo de uso
import { logger, withRequestId } from '@/shared/infrastructure/observability';

export async function GET(req: Request) {
  const requestId = withRequestId(req);
  logger.info({ requestId, action: 'list-payables' }, 'Processing request');
  // ...
}
```

---

## ✅ ONDA 5B: IDEMPOTÊNCIA

**Status:** COMPLETA ✅  
**PR:** #22  
**Data de Conclusão:** Novembro 2025

### Entregáveis

| Item | Status | Descrição |
|------|--------|-----------|
| `idempotency_keys` table | ✅ | Persistência SQL Server |
| `withIdempotency()` wrapper | ✅ | HOF para Use Cases |
| Webhook Idempotency | ✅ | BTG webhooks com event_id |
| Observability Events | ✅ | Logs de idempotency hit/miss |

### Código

```typescript
// Exemplo de uso
import { withIdempotency } from '@/shared/infrastructure/idempotency';

const result = await withIdempotency(
  `payment-${payableId}-${paymentDate}`,
  async () => {
    return payAccountPayableUseCase.execute(input);
  }
);
```

---

## ✅ ONDA 7: ABSORVIDA PELO E7

**Status:** ABSORVIDA ✅  
**Épico:** E7.0-E7.11  
**Data de Conclusão:** Dezembro 2025

### Planejamento Original (Dez 2024)

```
Onda 7 - Drizzle Modular + Usecases + Contracts:
- Modularizar schemas Drizzle por domínio
- Criar Use Cases para operações complexas
- Estabelecer contratos de API
```

### O que E7 Implementou

| Item Original | Implementação E7 | Status |
|---------------|------------------|--------|
| Schemas modulares | `src/modules/*/schema.ts` | ✅ |
| Use Cases | `src/modules/*/domain/use-cases/` | ✅ |
| Contratos | `mcp-server/knowledge/contracts/` | ✅ |
| DI Container | tsyringe com tokens | ✅ |
| Repositories | Ports/Adapters pattern | ✅ |

### Conclusão

**Onda 7 foi 100% implementada pelo E7.** Não há trabalho adicional necessário.

---

## 🔄 ONDA 6: DOCUMENT PIPELINE

**Status:** EM PROGRESSO 🔄  
**Progresso:** ~40%

### Planejamento Original

```
Onda 6 - Document Pipeline:
- Upload de arquivos para S3/MinIO
- Jobs de processamento assíncrono
- Integração com módulos fiscais
```

### Status Atual

| Item | Status | Notas |
|------|--------|-------|
| S3/MinIO Config | ✅ | Configurado em dev |
| Upload básico | ✅ | Funcional |
| Jobs Queue | 🔄 | Parcialmente implementado |
| Integração Fiscal | ⬜ | Pendente |
| DDD Structure | ⬜ | **Precisa adaptar para DDD** |

### Replanejamento: Onda 6 v2

**PROBLEMA:** Implementação atual segue Vertical Slice, não DDD.

**SOLUÇÃO:** Adaptar para DDD/Hexagonal conforme E7.

**Nova Estrutura:**
```
src/modules/documents/
├── domain/
│   ├── entities/
│   │   ├── Document.ts
│   │   └── ProcessingJob.ts
│   ├── value-objects/
│   │   ├── FileMetadata.ts
│   │   └── ProcessingStatus.ts
│   ├── ports/
│   │   ├── IStorageGateway.ts
│   │   └── IJobQueueRepository.ts
│   └── use-cases/
│       ├── UploadDocument.ts
│       ├── ProcessDocument.ts
│       └── GetDocumentStatus.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── S3StorageAdapter.ts
│   │   └── MinioStorageAdapter.ts
│   └── repositories/
│       └── DrizzleJobRepository.ts
└── features/
    ├── upload-document/
    └── list-documents/
```

**Estimativa:** 1-2 semanas
**Dependência:** E7.14 (APIs → Features)

---

## ⬜ ONDA 8 v2: PERFORMANCE DDD-AWARE

**Status:** PENDENTE ⬜  
**Versão:** 2.0 (Replanejada para DDD)

### Planejamento Original (Dez 2024)

```
Onda 8 - SQL Server Performance:
- Otimizar queries em API routes
- Adicionar índices
- Implementar SSRM em grids
```

### Problema

Planejamento original assumia otimização em API routes. Com DDD, a otimização deve ser em:
1. Use Cases (lógica)
2. Repositories (queries)
3. Adapters (cache)

### Replanejamento: Onda 8 v2

**Nova Abordagem:**

| Área | Antes | Depois |
|------|-------|--------|
| Query optimization | API routes | Repositories |
| Indexes | Por tabela | Por agregado/caso de uso |
| SSRM | AG Grid direto | Via Feature Handlers |
| Caching | Não existia | Redis adapter (opcional) |

**Tarefas:**

1. **Query Store Analysis**
   - Identificar top 10 queries por duração
   - Mapear para Use Cases correspondentes

2. **Index por Repository**
   - `IPayableRepository`: índices para listagem paginada
   - `IStockRepository`: índices para busca por produto
   - `IJournalEntryRepository`: índices para período contábil

3. **SSRM via Use Cases**
   ```typescript
   // Feature Handler
   const result = await listPayablesHandler.execute({
     page: 1,
     pageSize: 100,
     sortModel: [{ colId: 'dueDate', sort: 'asc' }],
     filterModel: { status: 'OPEN' },
   });
   ```

4. **Benchmark Framework**
   ```typescript
   // src/shared/infrastructure/benchmark/
   export async function benchmarkUseCase<T>(
     name: string,
     useCase: () => Promise<T>
   ): Promise<BenchmarkResult<T>> {
     const start = performance.now();
     const result = await useCase();
     const duration = performance.now() - start;
     logger.info({ name, duration }, 'Use case benchmark');
     return { result, duration };
   }
   ```

**Estimativa:** 2-3 semanas
**Dependência:** E7.14 (APIs → Features)

---

## ⬜ ONDA 9 v2: SECURITY DDD + AUDIT V2

**Status:** PENDENTE ⬜  
**Versão:** 2.0 (Replanejada para DDD)

### Planejamento Original (Dez 2024)

```
Onda 9 - Security & Governance:
- RBAC avançado
- Audit trail completo
- Compliance reports
```

### Problema

Planejamento original não considerava:
1. `ExecutionContext` do E7
2. Domain Events para auditoria
3. DDD patterns para RBAC

### Replanejamento: Onda 9 v2

**Nova Abordagem:**

| Área | Antes | Depois |
|------|-------|--------|
| RBAC | Middleware em routes | Via ExecutionContext |
| Audit | GlobalTCL | Domain Events + AuditFinDB |
| Auth | NextAuth direto | Auth adapter |

**Tarefas:**

1. **RBAC via ExecutionContext**
   ```typescript
   // ExecutionContext já tem permissões
   const context = await getExecutionContext(req);
   if (!context.hasPermission('financial.payables.pay')) {
     return Result.fail(new UnauthorizedError());
   }
   ```

2. **Audit via Domain Events**
   ```typescript
   // Domain Event emitido pelo Use Case
   await eventBus.publish(new PaymentCompletedEvent({
     payableId,
     amount,
     paidBy: context.userId,
     paidAt: new Date(),
   }));
   
   // Audit Subscriber persiste
   class AuditEventSubscriber implements IEventSubscriber {
     async handle(event: DomainEvent) {
       await auditRepository.log({
         eventType: event.type,
         entityId: event.aggregateId,
         userId: event.metadata.userId,
         data: event.payload,
       });
     }
   }
   ```

3. **Consolidar GlobalTCL → AuditFinDB**
   - Migrar tabelas de audit existentes
   - Unificar schema de auditoria
   - Documentar em `docs/architecture/domains/AUDITORIA_V2.md`

4. **Compliance Reports**
   ```typescript
   // Query Use Case para relatórios
   class GenerateAuditReportUseCase {
     async execute(input: AuditReportInput): Promise<AuditReport> {
       const events = await auditRepository.findByDateRange(
         input.startDate,
         input.endDate,
         input.filters
       );
       return new AuditReport(events);
     }
   }
   ```

**Estimativa:** 2-3 semanas
**Dependência:** E7.15 (SPED → DDD, usa audit extensivamente)

---

## 📅 CRONOGRAMA ATUALIZADO

### Prioridade Imediata (E7.12-E7.17)

| Semana | Épico | Descrição |
|--------|-------|-----------|
| 1 | E7.12 | Documentação 100% |
| 2-4 | E7.13 | Services → DDD |
| 5-6 | E7.14 | APIs → Features |
| 7-10 | E7.15 | SPED → DDD |
| 11 | E7.16 | Verificação Semântica |
| 12 | E7.17 | Limpeza Final |
| 13 | Buffer | Estabilização |

### Após E7 (Abril-Maio 2026)

| Semana | Onda | Descrição |
|--------|------|-----------|
| 14-15 | 6 v2 | Document Pipeline DDD |
| 16-18 | 8 v2 | Performance DDD-aware |
| 19-21 | 9 v2 | Security DDD + Audit v2 |

---

## 📚 REFERÊNCIAS

- ADR-0012: Full DDD Migration
- ADR-0013: Eliminate Hybrid Architecture
- E7_STATUS_FINAL.md
- ROADMAP_E7.12_A_E7.17.md

---

*Documento atualizado em: 2026-01-05 16:50:00 UTC*
*Versão: 2.0.0*
