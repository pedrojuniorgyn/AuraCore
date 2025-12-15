# Contract — SQL Server 2022 & Performance

## Regras
1. Paginação no banco (OFFSET/FETCH ou estratégia equivalente).
2. Evitar “select tudo + slice”.
3. Evitar LIKE '%x%' sem estratégia (índices/FTS/colunas).
4. Usar Query Store para regressão de plano e tuning.
5. Evitar SQL interpolado; preferir parametrização.

## Observabilidade mínima
- p95/p99 por endpoint
- taxa de erro por endpoint
- deadlocks / waits / timeouts no SQL Server
- pool de conexões (mssql)
