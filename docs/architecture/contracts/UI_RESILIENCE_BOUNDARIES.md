# Contract — UI Resilience em Boundaries (UIR-001..UIR-006)

**Propósito:** Garantir que as fronteiras de UI (páginas, handlers de API e hooks expostos) sejam resilientes a latência, falhas e dados ausentes, sem exigir o mesmo nível em componentes internos.

**Escopo (onde se aplica):**
- Páginas Next.js (`src/app/**/page.tsx` e variantes).
- Route handlers (`src/app/api/**/route.ts` e sub-rotas).
- Hooks compartilhados com UI (`src/hooks/**`).

**Fora de escopo:** Componentes internos, services, domain/application. Esses seguem seus próprios contratos.

## Regras (UIR-001..UIR-006)

| ID | Tipo | Regra | Evidência mínima |
|----|------|-------|------------------|
| UIR-001 | MUST | Boundary exibe estado de carregamento visível enquanto dados não chegaram. | Skeleton/placeholder ou spinner renderizado antes de dados. |
| UIR-002 | MUST | Boundary trata erros de rede/servidor com fallback amigável e CTA (retry ou suporte). | `try/catch` ou error boundary com botão de retry. |
| UIR-003 | MUST | Boundary não acessa dados indefinidos: valida/guarda nulos antes de renderizar. | `if (!data) return <Loading />` ou zod `safeParse`. |
| UIR-004 | SHOULD | Conteúdos críticos usam placeholders resilientes (skeletons/listas) para evitar flash vazio. | Skeleton em listas/cards ou `suspense fallback`. |
| UIR-005 | SHOULD | Interações críticas oferecem retry/backoff ou instruções claras de reenvio. | `retry` handler, `revalidatePath`, toast com retry. |
| UIR-006 | MUST | Boundary registra erro em logger/telemetry sem vazar dado sensível. | `logger.error`/`metrics` com redaction aplicada. |

## Checklist rápido por boundary

- [ ] Loading state implementado (UIR-001).
- [ ] Fluxo de erro com mensagem e CTA (UIR-002).
- [ ] Guards para `undefined/null` antes de acessar campos (UIR-003).
- [ ] (SHOULD) Skeleton/placeholder para listas/cards (UIR-004).
- [ ] (SHOULD) Retry/backoff nas ações críticas (UIR-005).
- [ ] Log seguro de erro (sem PII) (UIR-006).

## Notas de implementação

- Priorizar `Suspense fallback` ou skeleton em componentes server/client para UIR-001/004.
- Para APIs, retornar erro estruturado e consumir no boundary com toast/fallback.
- Para hooks, sempre propagar estado `{ data, isLoading, error, retry }`.
- Se o módulo já tem observabilidade, reutilizar o logger/telemetry central.
