# AuraCore — Painel de Gestão (Épicos → Entregas → DoD → Riscos → KPIs)

## 1) Objetivo
Este painel transforma a arquitetura/documentação existente em um **instrumento de gestão**:
- épicos e entregas incrementais (sem big‑bang)
- critérios de pronto (DoD) e checklists de validação
- riscos e mitigação
- KPIs para medir evolução e estabilidade

Fontes primárias:
- Roadmap Ondas 5A→9: `_documentation/planning/ROADMAP_ONDAS_5A_A_9_EXECUTIVO.md`
- Execução viva: `_documentation/reports/ONDAS_5PLUS_EXECUCAO_LOG.md`
- Arquitetura canônica: `docs/architecture/INDEX.md`

---

## 2) KPIs globais (sempre medir)

### 2.1 SLOs de aplicação (API)
- **Latência p95/p99** por endpoint crítico (Financeiro/Fiscal/TMS)
- **Taxa de erro 5xx** por endpoint e por domínio
- **Taxa de erro 4xx** por endpoint (indicador de UX e validação)
- **Tempo de build/deploy** e taxa de rollback

### 2.2 SQL Server (saúde e regressão)
- **deadlocks**, **timeouts**, **waits** (Query Store)
- queries top por custo (CPU/IO) e por p95
- pool de conexões (saturação)

### 2.3 Integridade/ERP
- duplicidade evitada por idempotência (hits/miss/in_progress)
- “estado parcial” detectado (incidentes)
- reconciliação fiscal/financeira (KPIs por módulo conforme maturidade)

---

## 3) Épicos (com entregas e checkpoints)

> Nota: cada épico deve sempre respeitar:
> - Contracts (`docs/architecture/contracts/*`)
> - ADRs (`docs/architecture/adr/*`)
> - DoD único: `docs/architecture/contracts/DELIVERY_DOD.md`

### Épico E1 — Observabilidade e Operação (Onda 5A)
**Objetivo**: medir antes de mexer pesado; reduzir dependência de terminal/SSH.

**Entregas**:
- logs estruturados JSON (requestId + duração + tenant)
- buffer de requests lentos + endpoint admin de diagnóstico
- server‑timing + correlação por requestId

**Riscos**:
- ruído de logs / vazamento de dados sensíveis em produção

**Mitigações**:
- padronizar campos logáveis; remover PII; limitar payloads

**KPIs**:
- p95/p99 por rota crítica antes/depois
- volume de 5xx por endpoint

**Checkpoints**:
- endpoint de diagnóstico acessível de forma segura
- correlação `requestId` ponta‑a‑ponta

---

### Épico E2 — Idempotência nas integrações (Onda 5B)
**Objetivo**: garantir “efeito único” em cenários de retry/duplicação.

**Entregas**:
- tabela e utilitário de idempotência em SQL Server
- aplicar em rotas de risco: webhooks, remessas, DDA sync

**Riscos**:
- chaves presas em `IN_PROGRESS`
- crescimento de tabela sem retenção

**Mitigações**:
- TTL + reuso de linhas expiradas
- finalize best‑effort + logs

**KPIs**:
- `idempotency.hit/miss/in_progress` por rota
- incidentes de duplicidade (meta: zero)

---

### Épico E3 — Document Pipeline (Onda 6)
**Objetivo**: padronizar upload/armazenamento/processamento assíncrono com reprocesso.

**Entregas**:
- storage externo (S3/MinIO) + metadados no SQL
- job queue + worker tick
- monitor UI + retry/requeue seguro

**Riscos**:
- job stuck, duplicidade em reprocesso, falhas de storage

**Mitigações**:
- states bem definidos, reaper, idempotência nos passos críticos

**KPIs**:
- tempo médio/p95 de processamento por jobType
- taxa de falha e tempo de recuperação

---

### Épico E4 — Tenancy + Branch scoping hardening (contínuo)
**Objetivo**: evitar bugs sistêmicos de scoping (x‑branch‑id ausente, branchId no body, fallback 1).

**Entregas**:
- cookie HttpOnly de filial + middleware injetando `x-branch-id`
- helper `resolveBranchIdOrThrow` e política “writes: header manda”
- varredura incremental em rotas críticas (Financeiro/Fiscal)

**Riscos**:
- rotas legadas com comportamento divergente

**Mitigações**:
- rollout por lotes + logs de regressão + checklist DoD

**KPIs**:
- redução de 500 por “missing branch”
- cobertura de rotas críticas aderentes ao padrão

---

### Épico E5 — Financeiro/Contábil: integridade e transações (contínuo)
**Objetivo**: garantir consistência em fluxos multi‑step (ERP core).

**Entregas**:
- padronizar `withMssqlTransaction` onde houver 2+ writes
- padronizar optimistic locking em entidades críticas
- padronizar regras de lançamento/estorno (diagramas/ADR)

**Riscos**:
- estado parcial em falhas
- race conditions em numeração/seq

**Mitigações**:
- transações + locks + idempotência

**KPIs**:
- incidentes de inconsistência (meta: reduzir a zero)
- deadlocks/timeouts por endpoints críticos

---

### Épico E6 — Auditoria interna v2 (GlobalTCL → AuditFinDB)
**Objetivo**: trazer o módulo de auditoria para dentro do AuraCore usando o padrão “jobs + worker”.

**Entregas (faseamento MVP)**:
- MVP‑0: base env/pools + RBAC
- MVP‑1: fila `audit_jobs` + claim/lock + reaper
- MVP‑2: migrate schema do AuditFinDB
- MVP‑3: snapshot (extract/raw/facts/findings)
- MVP‑4: UI SSRM de resultados

**Riscos**:
- custo de snapshot/IO, gargalo SQL, credenciais e scoping por filial

**Mitigações**:
- scoping por filial + janelas de execução + benchmarks
- store reconstrutível por run

**KPIs**:
- tempo de snapshot p95
- tamanho do store e custo de queries SSRM

---

### Épico E7 — Performance contínua SQL Server + SSRM (Onda 8)
**Objetivo**: performance previsível (p95/p99) guiada por dados do SQL.

**Entregas**:
- baseline Query Store + top queries
- índices por workload (com rollback)
- SSRM nas telas de maior volume

**Riscos**:
- regressão de plano/índice, aumento de IO

**Mitigações**:
- medição antes/depois + feature flags + rollback

**KPIs**:
- redução de p95/p99 por tela/endpoint
- top queries com custo reduzido

---

### Épico E8 — Segurança avançada e governança (Onda 9)
**Objetivo**: hardening e governança operacional (prod).

**Entregas**:
- padronizar contratos de erro (inclui 503 para módulos não configurados)
- reforçar RBAC e políticas admin (runbook)
- retenção/limpeza (idempotência/logs/jobs)

**Riscos**:
- endpoints operacionais expostos sem gate

**Mitigações**:
- ADRs + runbooks + tokens internos + bloqueio por ambiente

**KPIs**:
- tentativas 401/403 em admin ops
- incidentes de segurança (meta: zero)

---

## 4) Cadência e governança (processo)
- Qualquer mudança de contrato/invariante → **ADR**.
- Qualquer incidente em produção → registrar em `docs/architecture/runbooks/RUNBOOK_INCIDENTS.md`.
- Cada PR relevante deve atualizar o log de execução (se aplicável) e o domínio correspondente.

