# Contract — Type Guard Patterns

## Classificação
- **Tipo:** Padrão de Código
- **Prioridade:** ALTA
- **Aplicação:** Todo código TypeScript que manipula tipos unknown

## Contexto

Criado após bugs no Quick Win 4 (21/01/2026), onde casts inseguros (`as Record<string, string>`) foram usados sem validação de tipos em runtime.

**Problema:** TypeScript não faz validação em runtime. Casts com `as` apenas "enganam" o compilador, mas valores incorretos passam silenciosamente.

## Regras Obrigatórias

### TYPE-GUARD-001: Nunca usar cast `as` com unknown

```typescript
// ❌ INCORRETO - Cast inseguro
const data = props as Record<string, string>;
const value = data.field; // Pode ser undefined, number, etc.

// ✅ CORRETO - Type guard
function safeString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
const value = safeString(props.field);
```

### TYPE-GUARD-002: Criar funções extratoras type-safe

```typescript
// ✅ CORRETO - Função extratora
function extractUserData(data: unknown): { name: string; age: number } | null {
  if (typeof data !== 'object' || data === null) return null;
  
  const obj = data as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name : null;
  const age = typeof obj.age === 'number' ? obj.age : null;
  
  if (!name || age === null) return null;
  return { name, age };
}
```

### TYPE-GUARD-003: Usar Zod para validação complexa

```typescript
import { z } from 'zod';

const DocumentDataSchema = z.object({
  uf_emitente: z.string().optional(),
  uf_destinatario: z.string().optional(),
  cfop: z.string().optional(),
  ncm: z.string().optional(),
});

const result = DocumentDataSchema.safeParse(documentData);
if (result.success) {
  const { uf_emitente } = result.data;
  // Tipos garantidos em runtime
}
```

## Utilitários Disponíveis

Ver: `src/lib/utils/type-guards.ts`

- `safeString(value)` - Extrai string ou null
- `safeNumber(value)` - Extrai number ou null
- `safeBoolean(value)` - Extrai boolean ou null
- `safeObject(value)` - Extrai objeto ou null
- `safeArray(value, guard)` - Extrai array com type guard

## Padrões Proibidos

| Padrão | Por que é perigoso |
|--------|-------------------|
| `as any` | Desabilita completamente type checking |
| `as Record<string, string>` | Assume tipos sem verificar |
| `as unknown as T` | Double cast, ainda mais perigoso |
| `@ts-ignore` | Ignora erros ao invés de corrigir |

## Referências

- Incidente: Quick Win 4 - LegislationWidget (21/01/2026)
- Arquivo afetado: src/components/fiscal/LegislationWidget.tsx
- Correção: LC-QW4-002
- Utilitários: src/lib/utils/type-guards.ts
