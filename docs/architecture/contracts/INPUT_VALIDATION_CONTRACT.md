# Input Validation Contract

**Versão:** 1.0.0  
**Data:** 2026-01-23  
**Autor:** Claude Agent  
**Épico:** P1.B - Notifications Bug Fixes Round 3

---

## Visão Geral

Este contrato define o padrão obrigatório para validação de input em API Routes do AuraCore.

**Princípio:** Route valida → Service processa (assume input válido)

---

## Regras Obrigatórias

### INPUT-VAL-001: Validação com Zod Obrigatória

**Toda API Route DEVE validar input com Zod ANTES de processar.**

```typescript
// ✅ CORRETO
const schema = z.object({ 
  notificationId: z.number().int().positive()
});

const validation = schema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    { error: "Dados inválidos", details: validation.error.flatten() },
    { status: 400 }
  );
}

const { notificationId } = validation.data; // Tipo garantido
```

```typescript
// ❌ INCORRETO
const { notificationId } = body; // Tipo unknown, pode ser qualquer coisa
await service.process(Number(notificationId)); // Conversão defensiva esconde bugs
```

---

### INPUT-VAL-002: Services Não Fazem Conversão Defensiva

**Services NUNCA devem fazer conversão de tipos. Input já foi validado pelo Route.**

```typescript
// ✅ CORRETO (Service)
async markAsRead(notificationId: number, userId: string): Promise<void> {
  // Assume notificationId já é number (Route validou)
  await db.update(...).where(eq(notifications.id, notificationId));
}
```

```typescript
// ❌ INCORRETO (Service)
async markAsRead(notificationId: number, userId: string): Promise<void> {
  // Conversão defensiva esconde bugs de validação
  await db.update(...).where(eq(notifications.id, Number(notificationId)));
}
```

---

### INPUT-VAL-003: Error Response Padrão

**Erros de validação DEVEM retornar 400 com detalhes estruturados.**

```typescript
if (!validation.success) {
  return NextResponse.json(
    { 
      error: "Dados inválidos",
      details: validation.error.flatten().fieldErrors 
    },
    { status: 400 }
  );
}
```

**Formato de resposta:**
```json
{
  "error": "Dados inválidos",
  "details": {
    "notificationId": ["Expected number, received string"]
  }
}
```

---

### INPUT-VAL-004: Schemas Documentados

**Todo Zod schema DEVE ter JSDoc explicando os campos.**

```typescript
/**
 * Schema para marcar notificação como lida
 * @field notificationId - ID da notificação (number, obrigatório se markAll=false)
 * @field markAll - Se true, marca todas como lidas
 */
const MarkNotificationSchema = z.object({
  notificationId: z.number().int().positive().optional(),
  markAll: z.boolean().optional(),
}).refine(...);
```

---

## Benefícios

| Benefício | Descrição |
|-----------|-----------|
| **Type Safety** | TypeScript garante tipos corretos após validação |
| **Error Messages** | Mensagens claras para o cliente |
| **Separation of Concerns** | Route valida, Service processa |
| **Testabilidade** | Services testáveis sem mocks de validação |
| **Segurança** | Inputs malformados rejeitados na borda |

---

## Anti-Patterns

### AP-INPUT-001: Conversão Defensiva no Service

**Problema:** Service faz `Number()` ou `String()` em parâmetros.

**Causa Raiz:** Route não validou input corretamente.

**Solução:** Adicionar validação Zod no Route.

---

### AP-INPUT-002: Validação Manual

**Problema:** Código usa `if (!notificationId || typeof notificationId !== 'number')`.

**Causa Raiz:** Desconhecimento do Zod.

**Solução:** Usar Zod schema com `.refine()` para validações complexas.

---

### AP-INPUT-003: Parse Sem SafeParse

**Problema:** `schema.parse(body)` pode lançar exceção.

**Causa Raiz:** Parse síncrono sem try/catch.

**Solução:** Usar `schema.safeParse(body)` que retorna Result.

---

## Exemplo Completo

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// 1. Definir Schema
const CreateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "user"]).default("user"),
});

// 2. Usar no Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 3. Validar com safeParse
    const validation = CreateUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // 4. Dados validados e tipados
    const { name, email, role } = validation.data;
    
    // 5. Service processa (assume válido)
    await userService.create({ name, email, role });
    
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    // ...
  }
}
```

---

## Checklist de Revisão

Antes de fazer merge de código com API Routes, verificar:

- [ ] Todos endpoints POST/PUT/PATCH têm Zod schema
- [ ] Schema usa `safeParse()`, não `parse()`
- [ ] Error response segue padrão (400, error, details)
- [ ] Services não fazem conversão defensiva
- [ ] Schema tem JSDoc documentando campos

---

## Referências

- [Zod Documentation](https://zod.dev)
- ADR-0003: userId is UUID string
- type-safety.json (MCP Contract)
- API_ERROR_HANDLING_CONTRACT.md
