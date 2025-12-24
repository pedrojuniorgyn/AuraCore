# Runbook — Auditoria interna v2 (Operação)

## 1) Objetivo
Guia operacional para configurar e operar o módulo **Auditoria interna v2** no AuraCore, com foco em:
- configuração segura (Coolify/env)
- conectividade MSSQL (TLS/SNI)
- RBAC mínimo (`audit.*`)
- observabilidade e resposta a incidentes

Referência de domínio: `docs/architecture/domains/AUDITORIA_V2.md`.

---

## 2) Pré‑requisitos
- AuraCore em execução e conectado ao **AuraCore DB** (SQL Server).
- Acesso de rede do container do AuraCore para:
  - **GlobalTCL** (porta 1433)
  - **AuditFinDB** (porta 1433)
- Contas MSSQL dedicadas:
  - `globaltcl_ro`: **somente SELECT** nas tabelas/views necessárias.
  - `auditfin_rw`: permissões **apenas** no banco `AuditFinDB` (CREATE/ALTER/INSERT/UPDATE/DELETE conforme necessidade do ETL).

---

## 3) Configuração (Coolify / env vars)

### 3.1 Feature flag
- `AUDIT_MODULE_ENABLED=true`

### 3.2 Conexão Legacy (GlobalTCL RO)
- `AUDIT_LEGACY_DB_SERVER`
- `AUDIT_LEGACY_DB_PORT` (opcional; default `1433`)
- `AUDIT_LEGACY_DB_DATABASE=GlobalTCL`
- `AUDIT_LEGACY_DB_USER`
- `AUDIT_LEGACY_DB_PASSWORD`
- `AUDIT_LEGACY_DB_ENCRYPT=true|false`
- `AUDIT_LEGACY_DB_TRUST_SERVER_CERTIFICATE=true|false`
- `AUDIT_LEGACY_DB_SERVERNAME` (SNI; obrigatório se `*_SERVER` for IP e `*_ENCRYPT=true`)

### 3.3 Conexão Store (AuditFinDB RW)
- `AUDIT_STORE_DB_SERVER`
- `AUDIT_STORE_DB_PORT` (opcional; default `1433`)
- `AUDIT_STORE_DB_DATABASE=AuditFinDB`
- `AUDIT_STORE_DB_USER`
- `AUDIT_STORE_DB_PASSWORD`
- `AUDIT_STORE_DB_ENCRYPT=true|false`
- `AUDIT_STORE_DB_TRUST_SERVER_CERTIFICATE=true|false`
- `AUDIT_STORE_DB_SERVERNAME` (SNI; obrigatório se `*_SERVER` for IP e `*_ENCRYPT=true`)

---

## 4) Validação de conectividade (TLS/SNI)

### 4.1 Sintoma típico (SNI)
Quando o SQL Server exige TLS e você usa IP como host:
- `*_ENCRYPT=true` + `*_SERVER=<IP>` sem `*_SERVERNAME` causa falha.

Regra (enterprise):
- Se o host for IP e TLS estiver ligado, **sempre** configurar `*_SERVERNAME` com o hostname do certificado.

### 4.2 Sintoma típico (TrustServerCertificate)
Ambientes com certificado self‑signed / CA não confiável:
- `*_TRUST_SERVER_CERTIFICATE=true` (somente quando necessário)

Recomendação:
- Preferir TLS válido (CA) e `*_TRUST_SERVER_CERTIFICATE=false`.

---

## 5) RBAC (permissões)

### 5.1 Permissões mínimas
- `audit.read`
- `audit.run`
- `audit.migrate`
- `audit.admin`

### 5.2 Seed
Script idempotente:
- `scripts/seed-permissions.ts`

> Operação: em ambientes novos, execute o seed para garantir os slugs `audit.*` antes de liberar telas/rotas.

---

## 6) Observabilidade (mínimo recomendável)

### 6.1 Métricas (counters/timers)
- `audit.jobs.queued` (gauge)
- `audit.jobs.running` (gauge)
- `audit.jobs.succeeded` / `audit.jobs.failed` (counter)
- `audit.job.duration_ms` por `jobType` (timer/histogram)
- `audit.snapshot.rows_raw` / `audit.snapshot.rows_fact` / `audit.snapshot.rows_findings` (counter)

### 6.2 Logs estruturados
Todo job deve logar:
- `job_id`, `job_type`, `organization_id`, `branch_id`
- `attempts`, `locked_by`
- tempo por step e status final

---

## 7) Procedimentos de incidente

### 7.1 Jobs presos em RUNNING (stale)
Sintomas:
- status `RUNNING` por muito tempo sem progresso
- fila não anda (workers “pulam” jobs lockados)

Ação recomendada:
- executar **reaper**: marcar `RUNNING` com `locked_at` muito antigo como `QUEUED` novamente e limpar lock.

Checklist:
- confirmar se houve redeploy/crash no período
- confirmar se há concorrência (múltiplas réplicas) e se `locked_by` mudou
- verificar logs do worker para erro recorrente

### 7.2 Falhas repetidas (FAILED em loop)
Sintomas:
- `attempts` crescendo rapidamente
- `last_error` com erro de permissão/timeout

Ação recomendada:
- corrigir causa raiz (permissões, rede, schema)
- aplicar backoff aumentando `next_run_at`
- opcionalmente reduzir `max_attempts` por jobType

### 7.3 Store schema divergente (migrate necessário)
Sintomas:
- erros de `invalid object name` no AuditFinDB

Ação recomendada:
- executar job `AUDIT_MIGRATE_SCHEMA` com idempotência
- reexecutar `AUDIT_SNAPSHOT_RUN`

---

## 8) Segurança operacional
- Credenciais de `GlobalTCL` devem ser **read‑only**.
- `AuditFinDB` deve ser isolado (usuário restrito ao banco).
- Jobs sempre carregam `organization_id` do contexto; nunca aceitar `organizationId` livre do body.
- `branch_id` deve ser resolvido via `x-branch-id` + validação (sem fallback silencioso para 1).

