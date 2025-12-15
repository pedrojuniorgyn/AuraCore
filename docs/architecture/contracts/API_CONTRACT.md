# Contract — API (Route Handlers)

## Classificação de endpoints
A) Produto (UI)
B) Operacional (Admin/Job)
C) Público (Webhook/Health)

## Regras (A)
- Auth + Tenant Context obrigatórios
- RBAC por operação sensível
- Zod em payload
- 409 para optimistic lock
- Transação para multi-step write
- Paginação no SQL Server (sem slice)

## Regras (B)
- Tudo do tipo A, mais:
- Hard gate (permissão forte + segredo operacional)
- Bloqueio por ambiente (produção OFF por padrão)
- Logs “quem rodou / quando / o quê”

## Regras (C)
- Health: não toca DB
- Webhook: assinatura + idempotência + transação + SQL parametrizado
