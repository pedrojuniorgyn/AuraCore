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

