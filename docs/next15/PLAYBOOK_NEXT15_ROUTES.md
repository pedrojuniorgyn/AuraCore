# Next 15 Routes Playbook (Wave 0)

Documento interno para padronizar rotas API na migração para Next 15 e servir como kit reutilizável (accounting/tms/fiscal/financial). Foco: segurança, validação previsível e testes mínimos obrigatórios.

## 1. PR Gate Checklist
- **Greps obrigatórios**: `rg "NextRequest" src/app/api` = 0; `rg "params: { id: string }" src/app/api` = 0; `rg "console\.log" tests` = 0.
- **Testes**: `npm test -- --run <arquivo>.test.ts` deve passar (inclua o arquivo do módulo alterado).
- **Escopo**: `git diff --name-only origin/main..HEAD` limitado ao módulo + testes correspondentes.
- **Histórico limpo**: `git log --oneline origin/main..HEAD` deve exibir apenas commits do módulo/PR.
- **Validações rápidas**: `npx tsc --noEmit` opcional nesta wave, mas recomendado antes de abrir PR.

## 2. Templates de Código (copiar/colar)

### 2.1 Handler Next 15 com params como Promise
```ts
import { z } from 'zod';

const idSchema = z.object({
  id: z.string().trim().uuid('Invalid action plan id'),
});

const dateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid date',
  })
  .transform((value) => new Date(value));

const bodySchema = z.object({
  dueDate: dateSchema.optional(),
  title: z.string().trim().min(1, 'Title is required'),
});

const safeJson = async <T>(req: Request): Promise<T> => {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const params = await context.params;
  const { id } = idSchema.parse(params);

  const tenant = await getTenantContext();
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = bodySchema.parse(await safeJson<typeof bodySchema._type>(req));

  const result = await withDI(container.resolve(UpdateActionPlanUseCase))({
    id,
    tenant,
    body,
  });

  if (result.isFail()) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.statusCode ?? 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result.value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
```

### 2.2 Helpers isolados
- **safeJson (inline)**: usar try/catch único para `request.json()`, retornando 400 `{ error: 'Invalid JSON body' }`.
- **idSchema padrão**: `z.object({ id: z.string().trim().uuid('Invalid <entity> id') })`.
- **dateSchema padrão (string → Date)**:
```ts
const dateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date' })
  .transform((value) => new Date(value));
```
- **Respostas padrão**:
  - 400 Bad Request: `new Response(JSON.stringify({ error: '<message>' }), { status: 400, headers })`
  - 401 Unauthorized: `{ error: 'Unauthorized' }`
  - 404 Not Found: `{ error: '<Entity> not found' }`

## 3. Template de Testes (Vitest)

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/module/[id]/route';

const makeReq = ({ json, url = 'https://app.test/api/module/uuid' }: { json?: unknown; url?: string }) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json === undefined ? undefined : JSON.stringify(json),
  });

const getTenantContext = vi.fn();
const resolve = vi.fn();
const container = { resolve };

vi.mock('@/shared/tenant', () => ({ getTenantContext }));
vi.mock('@/shared/di/with-di', () => ({ withDI: (fn: unknown) => fn }));
vi.mock('@/shared/container', () => ({ container }));

describe('POST /api/module/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolve.mockReset();
    getTenantContext.mockResolvedValue({ organizationId: 1, branchId: 1 });
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await POST(new Request('https://app.test/api/module/uuid', { method: 'POST', body: 'not-json' }), {
      params: Promise.resolve({ id: crypto.randomUUID() }),
    } as never);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 for invalid uuid', async () => {
    const res = await POST(makeReq({ json: { title: 'ok' } }), {
      params: Promise.resolve({ id: 'bad-id' }),
    } as never);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid module id' });
  });

  it('returns 401 when tenant is missing', async () => {
    getTenantContext.mockResolvedValueOnce(null);

    const res = await POST(makeReq({ json: { title: 'ok' } }), {
      params: Promise.resolve({ id: crypto.randomUUID() }),
    } as never);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 200 on happy path', async () => {
    resolve.mockReturnValue({ isFail: () => false, value: { ok: true } });

    const res = await POST(makeReq({ json: { title: 'ok' } }), {
      params: Promise.resolve({ id: crypto.randomUUID() }),
    } as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

Notas:
- Mocks mínimos: `getTenantContext`, `container.resolve`, `withDI` devem ser controláveis em cada teste.
- `makeReq` simplifica criação de `Request` com `content-type` correto.
- Assert padrão: status + payload exact match.

## 4. Do / Don’t (anti-bugs)
- Não chamar `request.json()` mais de uma vez; leia uma vez com try/catch.
- Não usar `NextRequest` ou `params: { id: string }` síncrono; use `Request` e `params: Promise<...>` com `await`.
- Não aceitar `id` sem validação `z.string().trim().uuid('Invalid <entity> id')`.
- Registrar “UI contract” no ticket/PR quando a validação divergir da UI; alinhar mensagens.
- Padronizar mensagens em inglês para erros de API.

## 5. Padrão oficial de mensagens de erro
- JSON inválido: `{ error: 'Invalid JSON body' }`
- UUID inválido: `{ error: 'Invalid <entity> id' }`
- Unauthorized: `{ error: 'Unauthorized' }`
- Not found: `{ error: '<Entity> not found' }`
