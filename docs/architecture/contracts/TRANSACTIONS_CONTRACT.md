# Contract — Transações (atomicidade)

## Quando é obrigatório usar transação
- Qualquer fluxo com 2+ writes que devem ser consistentes:
  - Baixa (contas a pagar/receber)
  - Geração/estorno de lançamento contábil
  - Finalização de faturamento + criação de título
  - Webhook com múltiplos efeitos
  - Numeração + criação (MAX+1 deve ser substituído por abordagem concorrência-safe)

## Anti-regressão
- Criar header e linhas em tabelas diferentes sem commit/rollback.
- “check then insert” sem proteção contra concorrência.
