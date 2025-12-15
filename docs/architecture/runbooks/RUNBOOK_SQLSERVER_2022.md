# Runbook — SQL Server 2022 (Linux) + Performance/Manutenção

## Objetivo
Ter um kit mínimo para performance, estabilidade e troubleshooting do SQL Server 2022 em Linux (container/host).

## Checklist de configuração (infra)
- TLS:
  - Se `DB_ENCRYPT=true` e `DB_HOST` for IP, usar `DB_SERVERNAME` (SNI).
- Pool mssql:
  - dimensionar `pool.max` por replica (cada replica tem seu pool).
  - monitorar timeouts e saturação (fila de conexões).
- Health:
  - healthcheck SQL: `SELECT 1`
  - health app: `/api/health` (não toca DB)

## Observabilidade SQL (mínimo)
### 1) Query Store (recomendado)
- Ligar Query Store para:
  - detectar regressão de plano
  - comparar “antes/depois” de deploy
- Rotina:
  - analisar top queries por duração/CPU/reads
  - investigar queries que “mudaram de plano”

### 2) Deadlocks e waits
- Habilitar Extended Events para:
  - deadlocks
  - timeouts
  - waits principais
- Em incidentes:
  - coletar deadlock graph
  - identificar tabela/índice envolvido
  - corrigir com índice / reordenação / transação curta

### 3) Ferramentas práticas
- sp_WhoIsActive (se disponível) para:
  - bloqueios
  - queries longas
  - sessões em espera

## Guidelines de query (para o app)
- Paginação:
  - usar OFFSET/FETCH (SQL Server) e ORDER BY determinístico.
  - evitar “select tudo + slice”.
- Busca:
  - evitar LIKE '%x%' sem estratégia.
  - considerar índices apropriados e, se necessário, full-text search (FTS).
- Soft delete:
  - índices devem considerar `deleted_at` quando for filtro padrão.
- Multi-tenant:
  - índices frequentemente precisam começar por `organization_id`.

## Troubleshooting rápido (padrão)
1) App ok (`/api/health`)?
2) SQL ok (`SELECT 1`)?
3) Erros p95/p99 subiram?
4) Query Store: top queries por duração/reads
5) Deadlocks: existe evento?
6) Pool mssql saturado? (muitas conexões em uso / timeouts)
7) Mitigação:
   - reduzir carga (temporário)
   - índice cirúrgico
   - fix de paginação
   - reduzir transações longas

## Pós-incidente (obrigatório)
- Registrar:
  - query culpada
  - plano antes/depois
  - índice/alteração aplicada
  - ADR se mudou estratégia
