# Contract — Erros

## Status codes padrão
- 400: validação / regra de negócio
- 401: não autenticado
- 403: sem permissão / sem acesso à filial
- 404: não encontrado (inclui “não pertence ao tenant”)
- 409: conflito de versão (optimistic lock)
- 500: erro interno (sem stack em produção)

## Payload mínimo recomendado
- 400: { error, code?, details?, errors? }
- 409: { error, code: "VERSION_CONFLICT", currentVersion, sentVersion }
