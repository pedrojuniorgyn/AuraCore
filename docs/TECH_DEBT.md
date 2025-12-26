# Technical Debt - AuraCore

## Code Quality Issues

### 1. Replace any with unknown in API Routes

**Severity:** MEDIUM
**Priority:** LOW
**Effort:** 1-2h

**Description:**
Varios arquivos de API routes usam `catch (error: any)` em vez de `catch (error: unknown)`.

**Files:**
- src/app/api/financial/billing/[id]/generate-boleto/route.ts (linha 94-95)
- src/app/api/financial/billing/[id]/send-email/route.ts (linha 134-135)

**Solution:**
Substituir `error: any` por `error: unknown` e adicionar type guards apropriados.

**Example:**
```typescript
// ANTES:
catch (error: any) {
  console.error(error.message);
}

// DEPOIS:
catch (error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : 'Unknown error';
  console.error(message);
}
```

**Status:** Documented (not blocking)
**Created:** 2025-12-26
**Phase:** Future refactoring

---

## Next Steps

- [ ] Complete MCP Server (Fase 2)
- [ ] Review and prioritize tech debt
- [ ] Address high-priority items
- [ ] Gradual refactoring

