# ADR 0013 — Eliminação da Arquitetura Híbrida

**Data de Criação:** 2026-01-05 15:35:00 UTC  
**Status:** Aceito  
**Decisor:** Pedro Jr.  
**Autor:** Claude (Arquiteto Enterprise)

---

## Contexto

O documento `E7_DDD_HEXAGONAL_HIBRIDO.md` definia uma "Filosofia Híbrida" com 4 padrões arquiteturais:

```
ARQUITETURA HÍBRIDA (ORIGINAL):
┌─────────────────────────────────────────────────────────────────┐
│  COMO DECIDIR O PADRÃO?                                        │
├─────────────────────────────────────────────────────────────────┤
│  É CRUD simples? → Vertical Slice (~46%)                       │
│  É cálculo puro? → Functional Core (~12%)                      │
│  Operação média? → Hexagonal Lite (~7%)                        │
│  Regras complexas? → Hexagonal + DDD (~35%)                    │
└─────────────────────────────────────────────────────────────────┘
```

Esta abordagem foi planejada como **estratégia de transição**, não como estado final. Após análise em Janeiro 2026, decidiu-se eliminar a arquitetura híbrida.

---

## Decisão

**Eliminar completamente a arquitetura híbrida**, estabelecendo:

1. **Padrão único**: DDD/Hexagonal para 100% do código
2. **Sem exceções**: CRUDs também seguem o padrão
3. **Deadline**: Abril 2026

---

## O Que Está Sendo Eliminado

### 1. Vertical Slice (~46% do código)

**ANTES:**
```typescript
// src/app/api/financial/payables/route.ts
export async function GET(req: Request) {
  const session = await auth();
  const payables = await db
    .select()
    .from(accountsPayable)
    .where(eq(accountsPayable.organizationId, session.user.organizationId));
  return Response.json(payables);
}
```

**DEPOIS:**
```typescript
// src/modules/financial/features/list-payables/handler.ts
export async function GET(req: Request) {
  const handler = container.resolve<IListPayablesHandler>('ListPayablesHandler');
  const query = ListPayablesQuery.fromRequest(req);
  return Response.json(await handler.execute(query));
}

// src/modules/financial/features/list-payables/ListPayablesHandler.ts
@injectable()
export class ListPayablesHandler implements IListPayablesHandler {
  constructor(@inject('PayableRepository') private repo: IPayableRepository) {}
  
  async execute(query: ListPayablesQuery): Promise<PayableListResult> {
    return this.repo.findAll(query.filters, query.pagination);
  }
}
```

### 2. Services Legados em /src/services/

**ANTES:**
```typescript
// src/services/accounting-engine.ts
export class AccountingEngine {
  async postJournalEntry(data: JournalEntryData) {
    // 500+ linhas de lógica de negócio
  }
}
```

**DEPOIS:**
```typescript
// src/modules/accounting/domain/use-cases/PostJournalEntryUseCase.ts
export class PostJournalEntryUseCase implements IPostJournalEntryUseCase {
  constructor(
    private readonly journalRepo: IJournalEntryRepository,
    private readonly validator: IDoubleEntryValidator,
    private readonly eventBus: IEventBus
  ) {}
  
  async execute(input: PostJournalEntryInput): Promise<Result<JournalEntry, DomainError>> {
    // Lógica testável e isolada
  }
}
```

### 3. Adapters "Wrapper" (Gambiarras)

**ANTES:**
```typescript
// Adapter que delega para service legado
export class SefazGatewayAdapter implements ISefazGateway {
  async authorize(xml: string): Promise<SefazResponse> {
    // ❌ GAMBIARRA: Chama service legado
    const result = await sefazClient.authorize(xml);
    return this.mapToSefazResponse(result);
  }
}
```

**DEPOIS:**
```typescript
// Adapter com implementação real
export class SefazGatewayAdapter implements ISefazGateway {
  constructor(private readonly httpClient: IHttpClient) {}
  
  async authorize(xml: string): Promise<SefazResponse> {
    // ✅ Implementação direta, sem delegação para legado
    const response = await this.httpClient.post(SEFAZ_URL, xml);
    return this.parseResponse(response);
  }
}
```

---

## Arquivos a Eliminar

### Services Legados (9 arquivos)

| Arquivo | Status | Épico |
|---------|--------|-------|
| `src/services/sefaz-client.ts` | A eliminar | E7.13 |
| `src/services/sefaz-processor.ts` | A eliminar | E7.13 |
| `src/services/btg-banking.ts` | A eliminar | E7.13 |
| `src/services/tax-credit-engine.ts` | A eliminar | E7.13 |
| `src/services/accounting-engine.ts` | A eliminar | E7.15 |
| `src/services/financial-title-generator.ts` | A eliminar | E7.15 |
| `src/services/sped-fiscal-generator.ts` | A eliminar | E7.15 |
| `src/services/sped-ecd-generator.ts` | A eliminar | E7.15 |
| `src/services/sped-contributions-generator.ts` | A eliminar | E7.15 |

### APIs Vertical Slice (~90 rotas)

| Módulo | Rotas | Épico |
|--------|-------|-------|
| Financial | ~25 | E7.14 |
| Fiscal | ~20 | E7.14 |
| TMS | ~15 | E7.14 |
| WMS | ~20 | E7.14 |
| Admin | ~10 | E7.14 |

---

## Consequências

### Positivas ✅

1. **Fim da ambiguidade**: Desenvolvedores sabem exatamente qual padrão usar
2. **Documentação clara**: "Tudo é DDD/Hexagonal" é simples de documentar
3. **MCP pode validar 100%**: Regras uniformes para todo o código
4. **Padrão enterprise**: Alinhado com SAP, Oracle, Salesforce

### Negativas ❌

1. **Esforço significativo**: 12 semanas de trabalho
2. **CRUDs mais verbosos**: Mais arquivos por operação

### Neutras ⚪

1. **Functional Core preservado**: Cálculos puros continuam em funções puras, mas dentro de `modules/*/core/`

---

## Cronograma de Eliminação

```
JANEIRO 2026
├── Semana 1: Documentação atualizada (E7.12)
├── Semana 2-4: Services migrados (E7.13)

FEVEREIRO 2026
├── Semana 5-6: APIs migradas (E7.14)
├── Semana 7-10: SPED migrado (E7.15)

MARÇO 2026
├── Semana 11: Verificação semântica (E7.16)
├── Semana 12: Limpeza final (E7.17)
│   └── DELETAR todos os arquivos legados

ABRIL 2026
└── Semana 13: Estabilização
```

---

## Verificação de Conformidade

Após E7.17, estas verificações DEVEM passar:

```bash
# Zero arquivos em /services/ com lógica
find src/services -name "*.ts" -type f | wc -l
# Esperado: 0

# Zero imports de services legados
grep -rn "from.*services/" src/modules --include="*.ts" | wc -l
# Esperado: 0

# Zero lógica de negócio em /app/api/
# (análise manual ou script de verificação)
```

---

## Documentação Atualizada

Este ADR implica atualização de:

1. `docs/architecture/E7_DDD_HEXAGONAL_HIBRIDO.md` → Renomear para `E7_DDD_HEXAGONAL.md` (sem "HÍBRIDO")
2. `docs/architecture/INDEX.md` → Adicionar referência a este ADR
3. `.cursorrules` → Remover menção a Vertical Slice
4. `docs/mcp/SYSTEM_GUIDE.md` → Atualizar padrões aceitos

---

## Referências

- ADR-0012: Full DDD Migration
- `docs/architecture/E7_DDD_HEXAGONAL_HIBRIDO.md`
- Análise dos 7 Pontos Críticos (2026-01-05)

---

**Aprovado por:** Pedro Jr.  
**Data de Aprovação:** 2026-01-05 15:35:00 UTC
