# ADR 0001 — SQL Server 2022 como único banco suportado

## Status
Aceito

## Contexto
AuraCore é um ERP enterprise e opera exclusivamente com SQL Server 2022 (Linux/Container ou host). Drizzle é usado com dialect `mssql` e driver `node-mssql`.

## Decisão
- O sistema assume **somente SQL Server 2022**.
- SQL deve ser 100% compatível com SQL Server.
- Não serão adicionadas compatibilidades com PostgreSQL/MySQL/SQLite.

## Consequências
- Migrações e queries devem respeitar limitações/recursos do SQL Server (OFFSET/FETCH, Query Store, etc.).
- Padrões de retorno (ex.: sem `.returning()` como dependência) devem ser ajustados ao SQL Server.
