# ADR 0006 — Paginação e busca no SQL Server (sem slice)

## Status
Aceito

## Contexto
Existem endpoints que fazem select completo e paginam com `.slice()`. Em volume ERP, isso degrada performance.

## Decisão
- Paginação deve ocorrer no SQL Server (OFFSET/FETCH ou estratégia equivalente), sempre com ORDER BY determinístico.
- Busca com LIKE '%x%' deve ter estratégia (índices/FTS), evitando full scans involuntários.

## Consequências
- Reduz consumo de memória/CPU no Node.
- Estabiliza latência (p95/p99) em produção.
