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

## Checklist Pré-Commit

Antes de cada commit, verificar:
- [ ] Zero uso de `any` (usar `unknown`)
- [ ] Array.isArray() antes de métodos array
- [ ] Validar propriedades antes de acessar
- [ ] Try-catch em handlers MCP
- [ ] MIME types consistentes
- [ ] IDs sanitizados (resources)
- [ ] Type guards em error handling
- [ ] Schema validado (não assumido)
- [ ] check_cursor_issues executado
- [ ] Testes manuais quando necessário

