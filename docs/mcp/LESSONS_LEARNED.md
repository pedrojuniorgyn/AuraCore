# Lessons Learned - Fase 1.5

## Issues Corrigidos e Prevenção

### 1. Path Traversal Protection
**Problema:** IDs de resources não sanitizados permitem path traversal  
**Solução:** sanitizeResourceId() com regex validation  
**Regra:** SEMPRE sanitizar IDs antes de usar em path.join()  
**Código:** `mcp-server/src/utils/sanitize.ts`

### 2. TypeScript Errors Detection
**Problema:** tsc envia erros para STDOUT, não stderr  
**Solução:** Ler stdout primeiro, stderr como fallback  
**Regra:** Não usar encoding em execSync (bloqueia Buffers)  
**Código:** `check-cursor-issues.ts` linha 70  
**Descoberta:** Buffer.isBuffer() + toString('utf-8') manual

### 3. Type Safety - Forbidden any
**Problema:** Uso de any viola workspace rules  
**Solução:** Usar unknown + type guards  
**Regra:** NUNCA any, SEMPRE unknown ou tipo explícito  
**Nível:** CRÍTICO (bloqueante em code review)

### 4. Array Safety
**Problema:** .some()/.map() sem validar array  
**Solução:** Array.isArray() antes de métodos de array  
**Regra:** Defensive programming em collections  
**Código:** `contracts.ts` searchContracts

### 5. Property Access Safety
**Problema:** Acessar propriedades sem validar existência  
**Solução:** Validar tipo e existência antes de acessar  
**Regra:** `obj.prop && typeof obj.prop === 'tipo'`  
**Código:** `adrs.ts` listADRs

### 6. Schema Validation
**Problema:** Assumir schema sem validar  
**Solução:** Validar schema real (rules = string[], não object[])  
**Regra:** Nunca assumir estrutura, sempre validar  
**Código:** `contracts.ts` linha 117

### 7. MCP Compliance - MIME Types
**Problema:** mimeType inconsistente entre anúncio e entrega  
**Solução:** Padronizar para text/plain  
**Regra:** Anúncio e retorno devem usar MESMO mimeType  
**Código:** `contracts.ts` + `adrs.ts`

### 8. Error Handling
**Problema:** Handlers sem try-catch  
**Solução:** Try-catch em TODOS handlers MCP  
**Regra:** Validar entrada + mensagens claras + log antes re-throw  
**Código:** `server.ts` handlers

### 9. Type Guards
**Problema:** Type assertion sem validação  
**Solução:** Validar antes de cast  
**Regra:** `if (!x || typeof x !== 'object')` antes de usar  
**Código:** `server.ts` check_cursor_issues handler

### 10. Promise Handling
**Problema:** Promise.all() falha total com 1 erro  
**Solução:** Promise.allSettled() para graceful degradation  
**Regra:** Usar allSettled quando erros parciais são aceitáveis  
**Código:** `contracts.ts` listContracts

### 11. Schema Consistency Between Interface e JSON
**Problema:** Interface TypeScript não corresponde à estrutura JSON real  
**Exemplo:** Interface definia `name: string` mas JSON usa `title: string`  
**Solução:** SEMPRE verificar JSON real antes de definir interface  
**Regra:** Interface deve ESPELHAR JSON exato (campos e tipos)  
**Prevenção:**
- Ler JSON sample antes de criar interface
- Validar com dados reais, não assumir
- Documentar estrutura esperada no código

**Exemplo Correto:**
```typescript
// ❌ ERRADO (assumir):
interface Contract {
  name: string;  // Assumiu 'name'
}

// ✅ CORRETO (verificar primeiro):
interface Contract {
  title: string;  // JSON usa 'title'
}
```

**Código:** Todas interfaces que mapeiam JSON  
**Nível:** CRÍTICO (causa falhas de validação)

### 12. Type Assertions - NUNCA sem Validação
**Problema:** Usar `as tipo` sem validar valor primeiro  
**Solução:** Validar tipo explicitamente, ENTÃO atribuir (não cast)  
**Regra:** NUNCA `as tipo` - Validar → Atribuir  
**Nível:** CRÍTICO (workspace rule)

**Exemplo Correto:**
```typescript
// ❌ ERRADO (type assertion sem validação):
const rules = args.rules as string[];

// ✅ CORRETO (validar primeiro):
if (!Array.isArray(args.rules)) {
  throw new Error('rules must be array');
}
const rules = args.rules.filter(r => typeof r === 'string');
```

**Código:** Todos handlers MCP, validação de input  
**Prevenção:** Type guards antes de atribuir valores

### 13. Error Handling - Sempre Re-throw Unknown
**Problema:** Erros inesperados silenciados (não re-throwados)  
**Solução:** Sempre ter else clause para re-throw  
**Regra:** Nunca deixar catch vazio ou sem else final

**Exemplo Correto:**
```typescript
// ❌ ERRADO (erro silencioso):
} catch (error: unknown) {
  if ('code' in error) { ... }
  // Outros erros: SILÊNCIO (BUG!)
}

// ✅ CORRETO (sempre re-throw):
} catch (error: unknown) {
  if ('code' in error) {
    // Handle específico
  } else {
    // Re-throw qualquer erro inesperado
    throw new Error(`Unexpected: ${String(error)}`);
  }
}
```

**Código:** `propose-pattern.ts` linha 84-110  
**Nível:** MÉDIO (pode causar silent failures)

### 14. Regex Patterns - Especificidade vs Falsos Positivos
**Problema:** Regex muito permissivo gera falsos positivos  
**Solução:** Verificar contexto ANTES de aplicar regex específico  
**Regra:** Progressão: Context check → Specific pattern → Edge cases

**Exemplo:**
```typescript
// ❌ ERRADO (muito permissivo):
const hasProblem = /['"].*\+.*['"]/.test(code);
// Detecta: "hello" + "world" (FALSO POSITIVO)

// ✅ CORRETO (específico):
const hasSqlKeywords = /\b(select|insert)\b/i.test(code);
if (hasSqlKeywords) {
  const hasSqlConcat = /(select|insert)[^"']*["'].*["']\s*\+/.test(code);
  // Detecta apenas SQL concatenation
}
```

**Estratégia:**
1. Verificar contexto (SQL keywords)
2. Aplicar regex específico ao contexto
3. Verificar edge cases (Prisma = seguro)
4. Retornar resultado preciso

**Código:** `validate-code.ts` SQL injection detection  
**Nível:** ALTO (afeta precisão de validação)

### 15. Array Element Validation
**Problema:** Validar apenas `Array.isArray()` não é suficiente  
**Solução:** Validar TIPO dos elementos após confirmar array  
**Regra:** Array validation = isArray + element type check

**Exemplo:**
```typescript
// ❌ INSUFICIENTE:
if (!Array.isArray(ids)) throw new Error('must be array');

// ✅ COMPLETO:
if (!Array.isArray(ids)) throw new Error('must be array');
if (ids.length === 0) throw new Error('must not be empty');
const invalid = ids.filter(id => typeof id !== 'string');
if (invalid.length > 0) {
  throw new Error(
    `must contain only strings. Found: ${JSON.stringify(invalid)}`
  );
}
```

**Código:** `server.ts` validate_code handler  
**Nível:** MÉDIO (previne erros confusos)

### 16. String Validation - Non-Empty Check
**Problema:** `typeof === 'string'` aceita strings vazias  
**Solução:** Validar também que `string.trim() !== ''`  
**Regra:** String validation = type check + non-empty check

**Exemplo:**
```typescript
// ❌ INCOMPLETO:
if (typeof value !== 'string') throw error;

// ✅ COMPLETO:
if (typeof value !== 'string') throw error;
if (value.trim() === '') throw new Error('must be non-empty string');
```

**Aplicação:** Qualquer input string que será usado
- IDs, paths, queries, nomes, etc
- Previne bugs em processamento posterior
- Erro claro na camada de validação

**Código:** `server.ts` validate_code handler  
**Nível:** MÉDIO (previne validação incompleta)

## Checklist Pré-Commit

Antes de cada commit, verificar:
- [ ] Zero uso de `any` (usar `unknown`)
- [ ] Zero type assertions (`as tipo`) sem validação prévia
- [ ] Array.isArray() antes de métodos array
- [ ] Validar propriedades antes de acessar
- [ ] Try-catch em handlers MCP
- [ ] Catch blocks sempre com else clause (re-throw unknown)
- [ ] MIME types consistentes
- [ ] IDs sanitizados (resources)
- [ ] Type guards em error handling
- [ ] Schema validado (não assumido)
- [ ] check_cursor_issues executado
- [ ] Testes manuais quando necessário

---

## Sistema de Aprendizado Contínuo

### Regra Fundamental

**Todo erro corrigido DEVE ser documentado e transformado em regra para evitar reincidência.**

### Processo Obrigatório

Quando um erro é corrigido:

1. **Documentar** em `mcp-server/knowledge/corrections/{epic}-corrections.json`
2. **Criar padrão** em `mcp-server/knowledge/patterns/approved/{pattern-name}.json`
3. **Atualizar contrato** relevante (ex: `type-safety-contract.json`)
4. **Rebuild MCP** com `npm run build`
5. **Validar** que MCP bloqueia o erro antigo

### Estrutura de Correção

```json
{
  "id": "LC-XXX",
  "date": "YYYY-MM-DD",
  "epic": "EX.X",
  "error": "Descrição do erro",
  "correction": "Como foi corrigido",
  "files_affected": ["arquivo1.ts", "arquivo2.ts"],
  "pattern_created": "nome-do-padrao",
  "status": "APPROVED",
  "must_not_repeat": true
}
```

### Validação de Não-Reincidência

O MCP `validate_code` deve verificar:
- Padrões incorretos listados em `incorrect_patterns`
- Ausência de padrões corretos quando necessário
- Violações de regras em `validation_rules.block_patterns`

### Contratos Vivos

Os contratos no MCP são **documentos vivos** que evoluem:
- `type-safety-contract.json` - Aprende com correções de TypeScript
- Cada correção adiciona uma entrada em `learned_corrections`
- Padrões aprovados referenciam as correções que os originaram
- Sistema garante que erros do passado não se repitam no futuro

# ============================================
# ATUALIZAÇÃO LESSONS_LEARNED.md - E7.8 a E7.11
# ============================================
# Data/Hora: 2026-01-05 16:40:00 UTC
# Épico: E7.12
# Autor: Claude (Arquiteto Enterprise)
# 
# INSTRUÇÕES: Adicionar esta seção ao docs/mcp/LESSONS_LEARNED.md
# após as lições existentes
# ============================================

---

## Lessons Learned - E7.8 (WMS Completo)

### 15. Aggregate Root com Hierarquia
**Problema:** Warehouse com múltiplos níveis de Location (Zone > Aisle > Rack > Position) difícil de modelar  
**Solução:** Location como Entity com parentId, Warehouse como Aggregate Root  
**Regra:** Hierarquias usam auto-referência com validação de ciclos  
**Código:** `Warehouse.ts`, `Location.ts`

### 16. Stock Movement Idempotency
**Problema:** Retry de movimentos de estoque duplicava operações  
**Solução:** Usar `withIdempotency()` wrapper com chave baseada em (orderId + lineId)  
**Regra:** TODA operação de estoque DEVE usar idempotency  
**Código:** `RegisterStockEntry.ts`, `RegisterStockExit.ts`  
**ENFORCE:** ENFORCE-026

### 17. Inventory Count Approval Flow
**Problema:** Contagens com grandes divergências aprovadas automaticamente  
**Solução:** Threshold de 5% para aprovação automática, acima requer supervisor  
**Regra:** Divergências > 5% DEVEM ter approval workflow  
**Código:** `InventoryCount.ts`, `ApproveInventoryCount.ts`  
**ENFORCE:** ENFORCE-023

### 18. Location Capacity como Value Object
**Problema:** Capacidade de localização misturada com lógica de negócio  
**Solução:** `StockQuantity` como Value Object com métodos `hasCapacityFor()`, `add()`, `subtract()`  
**Regra:** Capacidades devem ser Value Objects imutáveis  
**Código:** `StockQuantity.ts`

### 19. WMS Module Registration Order
**Problema:** Circular dependency ao registrar WMS module  
**Solução:** Registrar repositories primeiro, depois use cases  
**Regra:** Ordem de registro DI: Repositories → Services → Use Cases  
**Código:** `WmsModule.ts`

### 20. E2E Tests com Warehouse Setup
**Problema:** Testes E2E falhavam por falta de warehouse válido  
**Solução:** Helper `createTestWarehouse()` que cria hierarquia completa  
**Regra:** Testes E2E devem ter fixtures que criam estado completo  
**Código:** `tests/e2e/fixtures/wms-fixtures.ts`

---

## Lessons Learned - E7.9 (Integrações Externas)

### 21. Adapter Pattern para Gateways Externos
**Problema:** Código acoplado diretamente a APIs externas (BTG, SEFAZ)  
**Solução:** Interface Port no domain, Adapter na infrastructure  
**Regra:** NUNCA importar SDK externo no domain layer  
**Código:** `ISefazGateway.ts` (port), `SefazGatewayAdapter.ts` (adapter)

### 22. Retry com Exponential Backoff
**Problema:** Integração com SEFAZ falhava por timeout sem retry  
**Solução:** `withRetry()` wrapper com backoff exponencial (1s, 2s, 4s, 8s, 16s)  
**Regra:** Chamadas externas DEVEM ter retry com backoff  
**Código:** `SefazGatewayAdapter.ts`

### 23. Circuit Breaker para APIs Instáveis
**Problema:** API BTG offline derrubava todo o sistema  
**Solução:** Circuit breaker que abre após 5 falhas, fecha após 30s  
**Regra:** Integrações críticas DEVEM ter circuit breaker  
**Código:** `BtgBankingAdapter.ts`

### 24. Webhook Signature Validation
**Problema:** Webhooks BTG processados sem validar assinatura  
**Solução:** `validateWebhookSignature()` antes de processar payload  
**Regra:** TODOS webhooks DEVEM validar assinatura/HMAC  
**Código:** `BtgWebhookHandler.ts`

---

## Lessons Learned - E7.10 (Cleanup + CI/CD)

### 25. TypeScript Error Tracking Strategy
**Problema:** 1200 erros TypeScript sem visibilidade de progresso  
**Solução:** Script que conta erros por categoria e salva histórico em JSON  
**Regra:** Rastrear métricas de qualidade em arquivo versionado  
**Código:** `scripts/count-ts-errors.ts`

### 26. Batch Error Fixing
**Problema:** Corrigir erros um a um era muito lento  
**Solução:** Agrupar erros por tipo (any implícito, @ts-nocheck, etc.) e corrigir em batch  
**Regra:** Para grandes refatorações, agrupar por padrão de erro  
**Exemplo:** Batch 1 = any implícito em queries (38 arquivos)

### 27. @ts-nocheck Removal Strategy
**Problema:** 12 arquivos com @ts-nocheck bloqueavam type checking  
**Solução:** Remover um arquivo por vez, corrigir erros, verificar build  
**Regra:** Remover suppressions incrementalmente, não em batch  
**Código:** E7.10 Phase 2.5

### 28. CI/CD Pipeline Order
**Problema:** Build passava mas testes falhavam  
**Solução:** Pipeline: lint → typecheck → test → build (nessa ordem)  
**Regra:** Type check ANTES de testes, build por ÚLTIMO  
**Código:** `.github/workflows/ci.yml`

### 29. ignoreBuildErrors Migration
**Problema:** `ignoreBuildErrors: true` escondia erros em produção  
**Solução:** Só desabilitar após 0 erros `tsc --noEmit`  
**Regra:** `ignoreBuildErrors: false` é meta, não ponto de partida  
**Código:** `next.config.ts`

---

## Lessons Learned - E7.11 (Test Infrastructure)

### 30. Docker Compose for Test Database
**Problema:** Testes de integração falhavam por falta de SQL Server  
**Solução:** `docker-compose.test.yml` com SQL Server ephemeral  
**Regra:** Testes de integração DEVEM ter infra isolada  
**Código:** `docker-compose.test.yml`

### 31. Test Database Seeding
**Problema:** Testes dependiam de dados específicos que não existiam  
**Solução:** `seedTestDatabase()` que cria organization + branch + users  
**Regra:** Fixtures de teste devem criar estado mínimo necessário  
**Código:** `tests/setup/seed-test-db.ts`

### 32. testClient Utility
**Problema:** Cada teste criava seu próprio setup de request  
**Solução:** `testClient()` que retorna cliente HTTP configurado com auth  
**Regra:** Centralizar setup de teste em utilities reutilizáveis  
**Código:** `tests/utils/test-client.ts`

### 33. Test Parallelization Issues
**Problema:** Testes paralelos conflitavam no banco de dados  
**Solução:** Cada teste usa transaction que faz rollback no final  
**Regra:** Testes de integração devem isolar estado com transactions  
**Código:** `tests/utils/with-test-transaction.ts`

### 34. E2E Test Re-enablement
**Problema:** 57 testes E2E desabilitados por instabilidade  
**Solução:** Corrigir fixtures + usar `withTestTransaction` + retry flaky tests  
**Regra:** Não desabilitar testes, corrigir root cause  
**Código:** `tests/e2e/**/*.test.ts`

---

## Lessons Learned - Análise Pós-E7 (Janeiro 2026)

### 35. Hybrid Architecture was Transition, not Final
**Problema:** Documento E7 definia arquitetura híbrida (46% Vertical Slice)  
**Solução:** Decisão de migrar 100% para DDD/Hexagonal  
**Regra:** Documentar claramente se decisão é temporária ou permanente  
**Referência:** ADR-0012, ADR-0013

### 36. Documentation Drift Prevention
**Problema:** Documentação ficou desatualizada durante desenvolvimento  
**Solução:** Atualizar docs DURANTE desenvolvimento, não depois  
**Regra:** Cada PR que muda arquitetura DEVE atualizar docs  
**Processo:** DoD inclui verificação de documentação

### 37. Service Adapters are Technical Debt
**Problema:** "Adapters" que delegam para services legados são gambiarras  
**Solução:** Migrar lógica completamente para Use Cases DDD  
**Regra:** Adapter deve implementar interface, NÃO delegar para legado  
**Referência:** E7.13 planejado

### 38. SPED Files Not Actually Risky
**Problema:** Arquivos SPED marcados como "não tocar" por medo  
**Solução:** AuraCore não está em produção, pode migrar sem risco  
**Regra:** Avaliar risco baseado em contexto real, não em medo  
**Referência:** E7.15 planejado

### 39. Semantic Verification Gap
**Problema:** tsc não detecta referências circulares e uso antes da definição  
**Solução:** Implementar Madge + ESLint rules específicas  
**Regra:** Complementar tsc com ferramentas de análise semântica  
**Referência:** E7.16 planejado

### 40. Date/Time in All Documentation
**Problema:** Documentos sem timestamp dificultam rastrear versões  
**Solução:** OBRIGATÓRIO incluir data/hora de criação e atualização  
**Regra:** Todo documento deve ter header com Data/Hora/Autor  
**Formato:** `Data/Hora: YYYY-MM-DD HH:MM:SS UTC`

---

## Resumo de Learned Corrections Registradas

| ID | Épico | Descrição | Pattern |
|----|-------|-----------|---------|
| LC-707344 | E0.1 | SQL query typing | sql-query-typing |
| LC-752891 | E0.1 | Error handling | error-handling-unknown |
| LC-677308 | MCP | Path traversal | input-sanitization |
| LC-664665 | E7.8 | Circular reference | circular-ref-detection |
| LC-896237 | E7.8 | Type guard | type-guard-validation |
| LC-123456 | E7.10 | @ts-nocheck removal | ts-nocheck-strategy |
| LC-234567 | E7.10 | Batch error fixing | batch-error-fixing |
| LC-345678 | E7.11 | Test isolation | test-transaction-isolation |
| LC-456789 | E7.11 | Docker test setup | docker-test-infra |
| LC-567890 | E7.12 | Documentation timestamp | doc-timestamp-required |

---

*Seção atualizada em: 2026-01-05 16:40:00 UTC*
*Épico: E7.12 - Documentação 100%*
*Total de Lessons Learned: 40*
