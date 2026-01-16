# 🔍 ANÁLISE DE GAPS - AuraCore DDD/Hexagonal

**Data:** 13 de Janeiro de 2026  
**Baseline:** Pós E7.15 (Type Safety Completo)  
**Objetivo:** Identificar gaps entre estado atual e ADR-0015 (100% DDD)

---

## 📊 RESUMO EXECUTIVO

### Estado Atual vs Planejado

| Dimensão | Planejado (ADR-0015) | Atual | Gap | Prioridade |
|----------|----------------------|-------|-----|------------|
| **Estrutura de Pastas** | 100% DDD | 60% | 40% | ALTA |
| **Input Ports** | Todos os módulos | 0 módulos | 100% | CRÍTICA |
| **Output Ports** | Todos os módulos | 3 módulos | 40% | ALTA |
| **Commands/Queries** | Separados | Misturados | 100% | ALTA |
| **Código Legado** | 0 arquivos | 58 arquivos | 100% | CRÍTICA |
| **Domain Purity** | 100% | 100% | 0% | ✅ |
| **Type Safety** | 100% | 100% | 0% | ✅ |
| **Multi-Tenancy** | 100% seguro | 7 falhas | ~1% | ALTA |

**Gap Geral:** ~45% (necessita 2-3 sprints para conformidade total)

---

## 🚨 GAP 1: INPUT PORTS AUSENTES

### Descrição
**Nenhum módulo** possui `domain/ports/input/` com interfaces de Use Cases, violando princípio fundamental da Hexagonal Architecture.

### Impacto
- ❌ Use Cases sem contrato formal
- ❌ Impossível trocar implementação sem quebrar
- ❌ Testes não podem mockar interface
- ❌ Violação de ARCH-010 (ADR-0015)

### Estado Atual
```
financial/domain/ports/input/   → 0 arquivos ❌
accounting/domain/ports/input/  → 0 arquivos ❌
fiscal/domain/ports/input/      → 0 arquivos ❌
wms/domain/ports/input/         → 0 arquivos ❌
tms/domain/ports/input/         → Pasta não existe ❌
```

### Estado Esperado (ADR-0015)
```typescript
// src/modules/financial/domain/ports/input/ICreatePayableUseCase.ts
export interface ICreatePayableUseCase {
  execute(input: CreatePayableInput): Promise<Result<PayableOutput, string>>;
}

// src/modules/financial/application/commands/CreatePayableCommand.ts
@injectable()
export class CreatePayableCommand implements ICreatePayableUseCase {
  constructor(
    @inject(TOKENS.PayableRepository) private repo: IPayableRepository
  ) {}

  async execute(input: CreatePayableInput): Promise<Result<PayableOutput, string>> {
    // implementação
  }
}
```

### Plano de Correção

#### Fase 1: Financial (1 dia)
- [ ] Criar `ICreatePayableUseCase.ts`
- [ ] Criar `IGetPayableByIdUseCase.ts`
- [ ] Criar `IListPayablesUseCase.ts`
- [ ] Criar `ICancelPayableUseCase.ts`
- [ ] Criar `IPayAccountPayableUseCase.ts`
- [ ] Criar `IGeneratePayableTitleUseCase.ts`
- [ ] Criar `IGenerateReceivableTitleUseCase.ts`
- [ ] Atualizar Use Cases para implementar interfaces

**Total:** 8 interfaces

#### Fase 2: Accounting (1 dia)
- [ ] Criar `ICreateJournalEntryUseCase.ts`
- [ ] Criar `IGetJournalEntryByIdUseCase.ts`
- [ ] Criar `IListJournalEntriesUseCase.ts`
- [ ] Criar `IPostJournalEntryUseCase.ts`
- [ ] Criar `IReverseJournalEntryUseCase.ts`
- [ ] Criar `IGenerateJournalEntryUseCase.ts`
- [ ] Criar `IAddLineToEntryUseCase.ts`
- [ ] Atualizar Use Cases para implementar interfaces

**Total:** 9 interfaces

#### Fase 3: Fiscal (1.5 dias)
- [ ] Mapear todos os Use Cases (estimativa: ~15)
- [ ] Criar interfaces correspondentes
- [ ] Atualizar implementações

**Total:** ~15 interfaces

#### Fase 4: WMS (1 dia)
- [ ] Mapear todos os Use Cases (estimativa: ~10)
- [ ] Criar interfaces correspondentes
- [ ] Atualizar implementações

**Total:** ~10 interfaces

#### Fase 5: TMS (0.5 dia)
- [ ] Criar pasta `domain/ports/input/`
- [ ] Mapear Use Cases (estimativa: ~5)
- [ ] Criar interfaces correspondentes

**Total:** ~5 interfaces

### Esforço Total
**5 dias** (1 desenvolvedor) ou **2 dias** (2 desenvolvedores em paralelo)

### Prioridade
🔴 **CRÍTICA** - Requisito fundamental de Hexagonal Architecture

---

## 🚨 GAP 2: COMMANDS/QUERIES NÃO SEPARADOS

### Descrição
Use Cases ainda em `application/use-cases/` (padrão antigo), violando CQRS e ADR-0015.

### Impacto
- ❌ Violação de ARCH-012 e ARCH-013
- ❌ Dificulta otimização de queries
- ❌ Mistura responsabilidades (read vs write)
- ❌ Impossível aplicar políticas diferentes (cache, permissões)

### Estado Atual
```
financial/application/use-cases/    → 8 arquivos (misturados)
accounting/application/use-cases/   → 9 arquivos (misturados)
fiscal/application/use-cases/       → ~15 arquivos (misturados)
wms/application/use-cases/          → ~10 arquivos (misturados)
tms/application/                    → Vazio
```

### Estado Esperado (ADR-0015)
```
financial/application/
├── commands/                    # Write Operations
│   ├── CreatePayableCommand.ts
│   ├── CancelPayableCommand.ts
│   └── PayAccountPayableCommand.ts
└── queries/                     # Read Operations
    ├── GetPayableByIdQuery.ts
    └── ListPayablesQuery.ts
```

### Plano de Correção

#### Passo 1: Criar Estrutura (30 min)
```bash
# Para cada módulo
mkdir -p src/modules/{module}/application/commands
mkdir -p src/modules/{module}/application/queries
```

#### Passo 2: Classificar Use Cases (1 dia)
Analisar cada Use Case e classificar:

**Commands (Write):**
- Create*, Update*, Delete*
- Cancel*, Approve*, Reject*
- Generate*, Process*, Execute*
- Pay*, Receive*, Transfer*

**Queries (Read):**
- Get*, Find*, List*
- Search*, Filter*, Count*
- Calculate* (sem side effects)

#### Passo 3: Mover Arquivos (2 dias)
```bash
# Exemplo: Financial
mv CreatePayableUseCase.ts → commands/CreatePayableCommand.ts
mv GetPayableByIdUseCase.ts → queries/GetPayableByIdQuery.ts
mv ListPayablesUseCase.ts → queries/ListPayablesQuery.ts
# ... etc
```

#### Passo 4: Atualizar Imports (1 dia)
- Buscar todos os imports dos Use Cases movidos
- Atualizar paths
- Atualizar nomes (UseCase → Command/Query)

#### Passo 5: Atualizar DI (1 dia)
- Atualizar registros no container
- Atualizar tokens se necessário

### Esforço Total
**5 dias** (1 desenvolvedor) ou **3 dias** (2 desenvolvedores)

### Prioridade
🔴 **ALTA** - Requisito de CQRS e ADR-0015

---

## 🚨 GAP 3: CÓDIGO LEGADO EM src/services/

### Descrição
**58 arquivos** em `src/services/` fora da estrutura modular DDD, violando ADR-0015.

### Impacto
- ❌ Código não testável isoladamente
- ❌ Acoplamento com infrastructure
- ❌ Dificulta manutenção
- ❌ Violação de PREVENT-004 (código em src/services/ proibido)
- ⚠️ **RISCO FISCAL:** SPED generators fora de controle

### Inventário Completo

#### 🔴 CRÍTICOS (Migração Urgente)

| Arquivo | Tamanho | Destino | Risco | Esforço |
|---------|---------|---------|-------|---------|
| **sped-fiscal-generator.ts** | 11KB | fiscal/domain/services/ | Multa SEFAZ | 2 dias |
| **financial-title-generator.ts** | 10KB | financial/domain/services/ | Títulos duplicados | 2 dias |
| **accounting-engine.ts** | 9.3KB | accounting/domain/services/ | Contabilização errada | 2 dias |
| **sped-contributions-generator.ts** | 7.1KB | fiscal/domain/services/ | Multa RFB | 1.5 dias |
| **sped-ecd-generator.ts** | 7.0KB | accounting/domain/services/ | Multa RFB | 1.5 dias |

**Subtotal:** 5 arquivos, **9 dias de esforço**

#### 🟡 ALTOS (Migração Prioritária)

| Arquivo | Destino | Esforço |
|---------|---------|---------|
| fiscal-classification-service.ts | fiscal/domain/services/ | 1 dia |
| fiscal-validation-engine.ts | fiscal/domain/services/ | 1 dia |
| tax-credit-engine.ts | fiscal/domain/services/ | 1 dia |
| payment-engine.ts | financial/domain/services/ | 1 dia |
| wms-billing-engine.ts | wms/domain/services/ | 1 dia |
| ciap-engine.ts | fiscal/domain/services/ | 1 dia |
| intercompany-allocation-engine.ts | accounting/domain/services/ | 1 dia |
| cost-center-allocation.ts | accounting/domain/services/ | 1 dia |
| management-accounting.ts | accounting/domain/services/ | 1 dia |
| hr-journey-processor.ts | hr/domain/services/ | 1 dia |

**Subtotal:** 10 arquivos, **10 dias de esforço**

#### 🟢 MÉDIOS/BAIXOS (Migração Gradual)

| Categoria | Arquivos | Destino | Esforço |
|-----------|----------|---------|---------|
| Banking | 3 arquivos | financial/infrastructure/adapters/ | 2 dias |
| BTG | 2 arquivos | financial/infrastructure/adapters/ | 1 dia |
| Commercial | 2 arquivos | commercial/domain/services/ | 1 dia |
| Fleet | 2 arquivos | fleet/domain/services/ | 1 dia |
| Pricing | 2 arquivos | commercial/domain/services/ | 1 dia |
| Validators | 3 arquivos | shared/domain/validators/ | 1 dia |
| Cron | 2 arquivos | infrastructure/jobs/ | 1 dia |
| Outros | 27 arquivos | Diversos | 10 dias |

**Subtotal:** 43 arquivos, **18 dias de esforço**

### Plano de Migração (3 Sprints)

#### Sprint 1: Críticos (2 semanas)
**Objetivo:** Eliminar riscos fiscais e financeiros

1. **sped-fiscal-generator.ts** (2 dias)
   - Criar `fiscal/domain/services/SpedFiscalGenerator.ts`
   - Mover lógica pura
   - Criar adapter para XML em infrastructure
   - Testes unitários
   - Migrar rotas API

2. **financial-title-generator.ts** (2 dias)
   - Criar `financial/domain/services/FinancialTitleGenerator.ts`
   - Mover lógica de geração
   - Testes unitários
   - Migrar Use Cases

3. **accounting-engine.ts** (2 dias)
   - Criar `accounting/domain/services/AccountingEngine.ts`
   - Mover regras contábeis
   - Testes unitários (crítico!)
   - Validar com dados reais

4. **sped-contributions-generator.ts** (1.5 dias)
   - Criar `fiscal/domain/services/SpedContributionsGenerator.ts`
   - Mover lógica
   - Testes unitários

5. **sped-ecd-generator.ts** (1.5 dias)
   - Criar `accounting/domain/services/SpedEcdGenerator.ts`
   - Mover lógica
   - Testes unitários

**Resultado:** 5 arquivos críticos migrados, zero risco fiscal

#### Sprint 2: Altos (2 semanas)
**Objetivo:** Migrar 10 arquivos de alta prioridade

- 1 arquivo por dia
- Seguir template DDD
- Testes obrigatórios
- Code review rigoroso

**Resultado:** 10 arquivos migrados, 15 restantes

#### Sprint 3: Médios/Baixos (3 semanas)
**Objetivo:** Limpar resto de src/services/

- Migração em lote por categoria
- Priorizar por impacto
- Aceitar migração gradual

**Resultado:** 100% código em módulos DDD

### Esforço Total
**37 dias** (1 desenvolvedor) ou **~15 dias** (2 desenvolvedores em paralelo)

### Prioridade
🔴 **CRÍTICA** (5 arquivos) + 🟡 **ALTA** (10 arquivos) + 🟢 **MÉDIA** (resto)

---

## ⚠️ GAP 4: console.log EM PRODUÇÃO

### Descrição
**584 ocorrências** de `console.log` no código de produção.

### Impacto
- ⚠️ Poluição de logs
- ⚠️ Possível vazamento de dados sensíveis
- ⚠️ Performance degradada (I/O síncrono)
- ❌ Logs não estruturados (dificulta análise)

### Distribuição
```bash
# Por diretório (estimativa)
src/services/        → ~200 ocorrências
src/app/             → ~150 ocorrências
src/modules/         → ~100 ocorrências
src/lib/             → ~50 ocorrências
src/components/      → ~84 ocorrências
```

### Estado Esperado
```typescript
// ❌ ERRADO
console.log('Processando documento:', docId);
console.log('Erro:', error);

// ✅ CORRETO
import { logger } from '@/shared/infrastructure/logger';

logger.info('Processando documento', { docId, userId });
logger.error('Erro ao processar', { error, docId, stack: error.stack });
```

### Plano de Correção

#### Passo 1: Implementar Logger (1 dia)
```typescript
// src/shared/infrastructure/logger/index.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});
```

#### Passo 2: Criar Padrões (0.5 dia)
```typescript
// Logs permitidos
logger.info()    // Informação geral
logger.warn()    // Avisos
logger.error()   // Erros
logger.debug()   // Debug (apenas dev)

// Logs proibidos
console.log()    // ❌ Remover
console.error()  // ❌ Substituir por logger.error()
console.warn()   // ❌ Substituir por logger.warn()
```

#### Passo 3: Migração Automática (1 dia)
```bash
# Script de migração
find src/ -name "*.ts" -exec sed -i '' \
  's/console\.log(/logger.info(/g' {} \;

find src/ -name "*.ts" -exec sed -i '' \
  's/console\.error(/logger.error(/g' {} \;

find src/ -name "*.ts" -exec sed -i '' \
  's/console\.warn(/logger.warn(/g' {} \;
```

#### Passo 4: Revisão Manual (1 dia)
- Revisar logs sensíveis
- Remover logs de debug
- Adicionar contexto estruturado

#### Passo 5: ESLint Rule (0.5 dia)
```json
// .eslintrc.json
{
  "rules": {
    "no-console": ["error", { "allow": [] }]
  }
}
```

### Esforço Total
**4 dias** (1 desenvolvedor)

### Prioridade
🟡 **MÉDIA** - Não bloqueia funcionalidade, mas afeta qualidade

---

## 🔴 GAP 5: branchId OPCIONAL (SEGURANÇA)

### Descrição
**7 locais** com `branchId ??` permitindo bypass de multi-tenancy.

### Impacto
- 🔴 **RISCO DE SEGURANÇA CRÍTICO**
- 🔴 Dados de filiais podem vazar
- 🔴 Violação de AP-008 (Anti-Pattern)
- 🔴 Violação de ARCH-006 (Multi-Tenancy)

### Locais Identificados
```bash
grep -rn "branchId ??" src/ --include="*.ts"
# 7 resultados (locais exatos precisam ser mapeados)
```

### Estado Atual (INSEGURO)
```typescript
// ❌ ERRADO - Permite bypass
const branchId = input.branchId ?? 1;
const branchId = ctx.branchId ?? session.user.defaultBranchId;
const branchId = filters.branchId ?? undefined; // Pior ainda!
```

### Estado Esperado (SEGURO)
```typescript
// ✅ CORRETO - Validação obrigatória
if (!input.branchId) {
  return Result.fail('branchId obrigatório para multi-tenancy');
}
const branchId = input.branchId;

// ✅ CORRETO - Contexto sempre validado
if (!ctx.branchId) {
  throw new Error('ExecutionContext inválido: branchId ausente');
}
```

### Plano de Correção

#### Passo 1: Mapear Locais (1 hora)
```bash
grep -rn "branchId ??" src/ --include="*.ts" > branchid_gaps.txt
# Analisar cada ocorrência
```

#### Passo 2: Corrigir (4 horas)
Para cada ocorrência:
1. Identificar contexto
2. Adicionar validação obrigatória
3. Remover fallback
4. Testar multi-tenancy

#### Passo 3: Adicionar Testes (2 horas)
```typescript
it('should fail if branchId is missing', async () => {
  const result = await useCase.execute({
    ...validInput,
    branchId: undefined as unknown as number
  });
  
  expect(Result.isFail(result)).toBe(true);
  expect(result.error).toContain('branchId obrigatório');
});
```

#### Passo 4: Adicionar Lint Rule (1 hora)
```typescript
// custom-eslint-rules/no-optional-branchid.js
module.exports = {
  create(context) {
    return {
      'LogicalExpression[operator="??"]'(node) {
        if (node.left.property?.name === 'branchId') {
          context.report({
            node,
            message: 'branchId não pode ter fallback (multi-tenancy)'
          });
        }
      }
    };
  }
};
```

### Esforço Total
**1 dia** (8 horas)

### Prioridade
🔴 **CRÍTICA** - Risco de segurança, corrigir IMEDIATAMENTE

---

## 🟢 GAP 6: TESTES E2E FALHANDO

### Descrição
**10 testes E2E** falhando por falta de build Next.js.

### Impacto
- 🟡 CI/CD não valida E2E
- 🟡 Risco de regressão não detectada
- 🟢 Não bloqueia desenvolvimento

### Erro
```
Error: Could not find a production build in the '.next' directory.
Try building your app with 'next build' before starting the production server.
```

### Solução 1: Build Antes de Testes (Recomendado)
```json
// package.json
{
  "scripts": {
    "test:e2e": "npm run build && vitest run tests/e2e/",
    "test:e2e:watch": "npm run build && vitest watch tests/e2e/"
  }
}
```

### Solução 2: Modo Development
```typescript
// tests/helpers/test-client.ts
const app = next({
  dev: true, // ← Usar modo dev
  dir: process.cwd(),
  port: 3001
});
```

### Plano de Correção
1. Adicionar build step no CI/CD
2. Ou usar modo development
3. Validar 10 testes voltam a passar

### Esforço Total
**1 hora**

### Prioridade
🟢 **BAIXA** - Não bloqueia funcionalidade

---

## 🟡 GAP 7: ANTI-PATTERN AP-001 REINCIDENTE

### Descrição
**1 ocorrência** de `Array.isArray(result)` em db.execute, mesmo após documentação.

### Impacto
- 🟡 Código morto (nunca executa)
- 🟡 Confusão para desenvolvedores
- 🟡 Violação de PC-006 (Pattern Consistency)

### Padrão Correto (PC-006)
```typescript
// ✅ CORRETO - Padrão AuraCore
const resultData = (result.recordset || result) as Array<T>;
const row = resultData[0];

// ❌ ERRADO - Array.isArray é código morto
const row = result.recordset?.[0] || 
  (Array.isArray(result) ? result[0] : undefined);
// result é SEMPRE objeto { recordset: [...] }, nunca array
```

### Plano de Correção
1. Buscar ocorrência
2. Substituir por padrão correto
3. Adicionar comentário explicativo

### Esforço Total
**30 minutos**

### Prioridade
🟡 **MÉDIA** - Não afeta funcionalidade, mas viola padrão

---

## 📊 MATRIZ DE PRIORIZAÇÃO

| GAP | Descrição | Impacto | Esforço | Prioridade | Sprint |
|-----|-----------|---------|---------|------------|--------|
| **GAP 5** | branchId opcional | 🔴 Segurança | 1 dia | CRÍTICA | Sprint 1 |
| **GAP 3.1** | 5 arquivos críticos | 🔴 Fiscal | 9 dias | CRÍTICA | Sprint 1 |
| **GAP 1** | Input Ports | 🟡 Arquitetura | 5 dias | ALTA | Sprint 2 |
| **GAP 2** | Commands/Queries | 🟡 CQRS | 5 dias | ALTA | Sprint 2 |
| **GAP 3.2** | 10 arquivos altos | 🟡 Manutenção | 10 dias | ALTA | Sprint 2-3 |
| **GAP 4** | console.log | 🟢 Qualidade | 4 dias | MÉDIA | Sprint 3 |
| **GAP 7** | AP-001 | 🟢 Padrão | 0.5 dia | MÉDIA | Sprint 3 |
| **GAP 3.3** | 43 arquivos médios | 🟢 Cleanup | 18 dias | BAIXA | Sprint 4-5 |
| **GAP 6** | Testes E2E | 🟢 CI/CD | 1 hora | BAIXA | Sprint 3 |

---

## 🎯 ROADMAP DE CORREÇÃO

### Sprint 1: Segurança e Críticos (2 semanas)
**Objetivo:** Eliminar riscos de segurança e fiscais

**Entregas:**
- ✅ branchId obrigatório (7 locais corrigidos)
- ✅ 5 arquivos críticos migrados
- ✅ Zero riscos de segurança
- ✅ Zero riscos fiscais

**Esforço:** 10 dias (2 desenvolvedores)

---

### Sprint 2: Arquitetura Hexagonal (2 semanas)
**Objetivo:** 100% conformidade com ADR-0015

**Entregas:**
- ✅ Input Ports em todos os módulos (~47 interfaces)
- ✅ Commands/Queries separados
- ✅ Output Ports completos (WMS, TMS)
- ✅ 10 arquivos altos migrados

**Esforço:** 20 dias (2 desenvolvedores)

---

### Sprint 3: Qualidade e Cleanup (2 semanas)
**Objetivo:** Código profissional e limpo

**Entregas:**
- ✅ Logger estruturado (584 console.log substituídos)
- ✅ AP-001 corrigido
- ✅ Testes E2E passando
- ✅ ESLint rules customizadas

**Esforço:** 5 dias (1 desenvolvedor)

---

### Sprint 4-5: Migração Completa (4 semanas)
**Objetivo:** Zero código legado

**Entregas:**
- ✅ 43 arquivos restantes migrados
- ✅ src/services/ deletado
- ✅ 100% DDD/Hexagonal

**Esforço:** 18 dias (2 desenvolvedores)

---

## 📈 MÉTRICAS DE SUCESSO

### Após Sprint 1
- [ ] Zero riscos de segurança (branchId)
- [ ] 5 arquivos críticos migrados
- [ ] Zero erros TypeScript (mantido)
- [ ] Testes passando (mantido)

### Após Sprint 2
- [ ] 100% módulos com Input Ports
- [ ] 100% Commands/Queries separados
- [ ] 15 arquivos legados migrados (26%)

### Após Sprint 3
- [ ] Zero console.log
- [ ] Logger estruturado ativo
- [ ] 100% testes E2E passando

### Após Sprint 4-5
- [ ] Zero arquivos em src/services/
- [ ] 100% conformidade ADR-0015
- [ ] 100% DDD/Hexagonal

---

## 🏆 CRITÉRIOS DE ACEITAÇÃO

### Conformidade Total ADR-0015

#### ✅ Estrutura de Pastas
- [ ] Todos os módulos têm domain/ports/input/
- [ ] Todos os módulos têm domain/ports/output/
- [ ] Todos os módulos têm application/commands/
- [ ] Todos os módulos têm application/queries/
- [ ] Todos os módulos têm infrastructure/persistence/

#### ✅ Pureza do Domain
- [ ] Zero imports de infrastructure
- [ ] Zero imports de bibliotecas externas
- [ ] Zero imports de módulos Node.js
- [ ] 100% testável sem mocks

#### ✅ Implementação de Ports
- [ ] Repositories implementam Output Ports
- [ ] Use Cases implementam Input Ports
- [ ] Commands em commands/
- [ ] Queries em queries/

#### ✅ Qualidade
- [ ] Zero erros TypeScript
- [ ] Zero erros ESLint
- [ ] Zero console.log
- [ ] Zero código em src/services/
- [ ] 100% testes passando

#### ✅ Segurança
- [ ] branchId obrigatório em 100% dos casos
- [ ] Multi-tenancy validado
- [ ] Logs estruturados

---

## 📚 REFERÊNCIAS

- [ADR-0015: 100% DDD/Hexagonal](/docs/architecture/adr/ADR-0015-100-percent-ddd.md)
- [Snapshot 2026-01-13](/docs/reports/SNAPSHOT_2026-01-13.md)
- [SMP Methodology](/docs/mcp/SMP_METHODOLOGY.md)
- [Anti-Patterns Catalog](/docs/mcp/SMP_ANTI_PATTERNS.md)

---

**Próxima Revisão:** 27/01/2026 (após Sprint 1)
