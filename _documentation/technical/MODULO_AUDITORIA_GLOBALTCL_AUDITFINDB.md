# Módulo de Auditoria (GlobalTCL → AuditFinDB) — Planejado e Realizado (14/12 → 23/12)

## 0) Objetivo (por que isso existe)
O Módulo de Auditoria foi desenhado para permitir **auditoria financeira de 36 meses dentro do produto**, com:
- **fonte de verdade no legado** (GlobalTCL, read-only)
- **materialização em banco de auditoria** (AuditFinDB) via **snapshots/ETL**
- **UI com SSRM (Server-Side Row Model)** para operar grandes volumes sem “Excel como fluxo principal”.

Este documento consolida:
- o **planejamento** acordado no chat (14/12–23/12)
- a **implementação** realizada (com referência a commits/paths)
- a **operação** (env vars, scripts SQL, bootstrap, execução de snapshot, segurança)

---

## 1) Arquitetura (visão macro)

### 1.1 Bancos envolvidos
- **Legacy DB (GlobalTCL)** — *somente leitura*
  - fonte de verdade
  - usuário recomendado: `globaltcl_ro` com `SELECT` nas tabelas/views necessárias
- **Audit DB (AuditFinDB)** — *read/write*
  - armazena `audit_snapshot_runs`, raws, fatos derivados e findings (regras)
  - usuário recomendado: `auditfin_rw` (ou equivalente) com permissões **apenas** no AuditFinDB
- **AuraCore DB** (quando o módulo esteve “dentro” do ERP novo)
  - tenants/branches/usuários/RBAC/branch scoping
  - fornece identidade e controle de acesso

### 1.2 Duas estratégias implementadas no período

#### A) Auditoria “dentro do AuraCore” (17/12–22/12)
Implementação no `aura_core` com UI e APIs sob:
- UI: `src/app/(dashboard)/auditoria/*`
- API: `src/app/api/admin/audit/*`
- ETL/infra: `src/lib/audit/*`

**Commits de referência (aura_core)**:
- `8e62d65` (ETL inicial + snapshots)
- `afe44e9` (menu + tela snapshots)
- `21c46f9` (snapshots premium SSRM)
- `86b7af0` (módulo completo: UI + APIs + SSRM + docs/ADR)

#### B) Auditoria como app separado (Audit TCL: API + UI separados)
Implementação fora do `aura_core`, em `/Users/pedrolemes/audit-tcl/`:
- **Audit API** (Next.js App Router, TypeScript): `/Users/pedrolemes/audit-tcl/src/app/api/*`
- **Audit UI** (Next.js separado, com proxy para API): `/Users/pedrolemes/audit-tcl/audit-ui/`

**Arquivos-base (audit-tcl)**:
- Planejamento: `/Users/pedrolemes/audit-tcl/PLANEJAMENTO_AUDIT_TCL.md`
- README (endpoints P0 + exemplos): `/Users/pedrolemes/audit-tcl/README.md`
- Runbook de operação local: `/Users/pedrolemes/audit-tcl/RUNBOOK.md`
- SQL init:
  - `/Users/pedrolemes/audit-tcl/sql/auditdb_init.sql` (auth + runs)
  - `/Users/pedrolemes/audit-tcl/sql/auditdb_etl_init.sql` (raw + facts + findings + índices)

---

## 2) Fonte de verdade (GlobalTCL) — premissas e modelo relacional confirmados

> Fonte: `PLANEJAMENTO_AUDIT_TCL.md` + validações no chat.

### 2.1 Classificação Pagar/Receber (oficial no legado)
- A classificação oficial é por `PlanoContasContabil.codigo_tipo_operacao`:
  - `1` ⇒ **Recebimento**
  - `!= 1` ⇒ **Pagamento**

### 2.2 Cadeia “auditável” (principal)

Encadeamento do legado que direciona o ETL:

`Compras` (documento)  
→ `Compras.IDMovimento`  
→ `movimentos` (título)  
→ `movimentos_detalhe` (parcela)  
→ `pagamentos` / `pagamentos_detalhe`  
→ `movimento_bancario` (data_real/valor/conciliado)

### 2.3 Status pago/aberto (inferido)
No legado, não existe um “status pago” explícito confiável para parcela; inferimos por:
- `movimento_bancario.data_real`:
  - preenchida ⇒ pago (e então `CONCILIADA` ou `PENDENTE_CONCILIACAO` conforme `boolConciliado`)
  - nula ⇒ aberto/vencido (ou anomalias)

### 2.4 Valor pago efetivo
- `movimento_bancario.valor` representa o **valor efetivo pago** da parcela.
- Juros/tarifas viram **novos lançamentos** (novas linhas) em trilha própria (não “diferença” no pagamento principal).

---

## 3) AuditFinDB — modelo físico (mínimo P0)

> Fonte: `/Users/pedrolemes/audit-tcl/sql/auditdb_etl_init.sql` e planejamento.

### 3.1 Controle de execução
- `dbo.audit_snapshot_runs`
  - `run_id` (uniqueidentifier)
  - `status`, `started_at`, `finished_at`
  - `period_start`, `period_end`
  - `error_message`

### 3.2 Raw tables (imutáveis por run)
P0 (exemplos):
- `dbo.audit_raw_movimentos`
- `dbo.audit_raw_movimentos_detalhe`
- `dbo.audit_raw_compras`
- `dbo.audit_raw_pagamentos`
- `dbo.audit_raw_pagamentos_detalhe`
- `dbo.audit_raw_movimento_bancario`

### 3.3 Fatos derivados (UI)
P0 planejado (e base da UI):
- `dbo.audit_fact_parcelas` (**1 linha por parcela** / `movimentos_detalhe`)
- (opcional/evolução): `dbo.audit_fact_cashflow_daily` (fluxo de caixa diário)

### 3.4 Findings (regras)
- `dbo.audit_findings`
  - `run_id`, `rule_code`, `severity`
  - `entity_type`, `entity_id`
  - `message`, `evidence_json`, `created_at`

### 3.5 Regras P0 (findings)
Regras que foram definidas como “entrega imediata” no planejamento:
- `PAGA_SEM_DATA_REAL`
- `SEM_VINCULO_BANCARIO`
- `PENDENTE_CONCILIACAO`
- `VALOR_PAGO_DIVERGENTE`
- `ORFAOS`

---

## 4) Snapshot/ETL — fluxo e operação

### 4.1 Período padrão
Padrão acordado: **36 meses** (mês atual + 35 anteriores).

### 4.2 Execução e logs
O snapshot:
- cria um `run_id`
- extrai do GlobalTCL (recorte principal por **vencimento**)
- faz bulk insert nas raws
- transforma para fatos (`audit_fact_parcelas`) e calcula findings (`audit_findings`)
- grava métricas e status em `audit_snapshot_runs`

### 4.3 Stale runs (“pendurados”)
No `aura_core`, o endpoint de listagem de snapshots tinha limpeza preventiva de runs `RUNNING/QUEUED` antigas (provável recycle/redeploy).
Isso aparece no histórico do arquivo:
- commit referência: `604f8de` em `src/app/api/admin/audit/snapshots/route.ts`
- variável: `AUDIT_SNAPSHOT_STALE_MINUTES` (default 120)

---

## 5) Segurança e acesso (token + RBAC)

### 5.1 Audit TCL (app separado)
- Auth próprio no AuditFinDB:
  - `audit_users` com roles `ADMIN`, `AUDITOR`, `VIEWER`
- Bootstrap 1x:
  - `POST /api/admin/bootstrap` com `x-bootstrap-token`
- Sessão:
  - `POST /api/auth/login` (cookie)
  - `GET /api/auth/me`

### 5.2 AuraCore (quando o módulo esteve interno)
Proteção via RBAC (`withPermission`) com permissões do domínio:
- `audit.read`
- `audit.run`
- `audit.migrate`

E para automação controlada no Coolify/infra:
- token via header `x-audit-token` validado contra env `AUDIT_SNAPSHOT_HTTP_TOKEN`
- decisão formalizada no histórico (ADR):
  - commit referência: `86b7af0`
  - arquivo: `docs/architecture/adr/0007-audit-ops-http-token.md`

---

## 6) Endpoints e telas — inventário

### 6.1 Audit TCL (app separado)

#### Endpoints P0 (Audit API)
Fonte: `/Users/pedrolemes/audit-tcl/README.md`
- `GET /api/health`
- `POST /api/admin/bootstrap`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/admin/snapshots/run`
- `GET /api/admin/snapshots`
- `GET /api/dashboard`
- `GET /api/parcelas`
- `GET /api/parcelas/:id`

#### Telas P0 (Audit UI)
Paths (audit-ui):
- `audit-ui/src/app/(dashboard)/dashboard/page.tsx`
- `audit-ui/src/app/(dashboard)/parcelas/page.tsx`
- `audit-ui/src/app/(dashboard)/parcelas/[id]/page.tsx`

### 6.2 AuraCore (módulo interno no período)

#### Telas
Criadas no commit `86b7af0`:
- `/auditoria` (`src/app/(dashboard)/auditoria/page.tsx`)
- `/auditoria/snapshots`
- `/auditoria/contas-pagar`
- `/auditoria/contas-receber`
- `/auditoria/conciliacao`
- `/auditoria/cashflow`
- `/auditoria/findings`
- `/auditoria/parcelas`

#### APIs
Criadas no commit `86b7af0` e evoluções:
- `/api/admin/audit/snapshots/*`
- `/api/admin/audit/parcelas/*`
- `/api/admin/audit/findings/*`
- `/api/admin/audit/cashflow/*`
- `/api/admin/audit/legacy/*`

---

## 7) Configuração (env vars) — sem segredos

### 7.1 Audit TCL (app separado)
Fonte: `/Users/pedrolemes/audit-tcl/env.example`

**Legacy (GlobalTCL)**:
- `LEGACY_DB_SERVER`
- `LEGACY_DB_SERVERNAME` (SNI, quando `*_ENCRYPT=true`)
- `LEGACY_DB_PORT`
- `LEGACY_DB_DATABASE=GlobalTCL`
- `LEGACY_DB_USER`
- `LEGACY_DB_PASSWORD`
- `LEGACY_DB_ENCRYPT`
- `LEGACY_DB_TRUST_SERVER_CERTIFICATE`

**Audit (AuditFinDB)**:
- `AUDIT_DB_SERVER`
- `AUDIT_DB_SERVERNAME`
- `AUDIT_DB_PORT`
- `AUDIT_DB_DATABASE=AuditFinDB`
- `AUDIT_DB_USER`
- `AUDIT_DB_PASSWORD`
- `AUDIT_DB_ENCRYPT`
- `AUDIT_DB_TRUST_SERVER_CERTIFICATE`

**Auth**:
- `AUTH_JWT_SECRET`
- `AUTH_TOKEN_TTL_SECONDS`
- `AUTH_PASSWORD_PEPPER`
- `BOOTSTRAP_TOKEN`

### 7.2 Coolify / Linux vs SQL Server Windows
Foi validado no chat que **não há impedimento** em ter:
- app Next.js/Node no Linux (Coolify)
- SQL Server (GlobalTCL/AuditFinDB) em Windows Server

O protocolo TDS (porta 1433) é independente de OS; cuidados ficam em TLS/SNI/TrustServerCertificate.

---

## 8) Integração com o ERP novo (AuraCore) — filial “legado”
Para scoping por filial no ETL/queries, foi definido o uso de um código do legado:
- `CodigoEmpresaFilial` (GlobalTCL)
- mapeado para a filial do AuraCore via campo do tipo “código legado da filial”

No chat, isso foi usado para permitir:
- selecionar runs/snapshots por filial
- filtrar o ETL para reduzir custo e aumentar confiabilidade

---

## 9) Troubleshooting (lições do período)

### 9.1 Divergência de colunas no legado
Caso real documentado no chat:
- no GlobalTCL a coluna era `numero_conta_bancaria` (não `numero_conta`)
- foi necessário mapear a extração para gravar no AuditFinDB com o nome esperado.

### 9.2 Evitar “estado parcial”
Padrões reforçados no período:
- transações em operações multi-step
- idempotência (23/12) para endpoints de alto risco/integração
- limpeza de “runs pendurados” (snapshot) em caso de recycle/redeploy

---

## 10) Referências rápidas
- Retrospectiva geral 14/12→23/12: `RETROSPECTIVA_2025-12-14_A_2025-12-23.md`
- Planejamento audit-tcl: `/Users/pedrolemes/audit-tcl/PLANEJAMENTO_AUDIT_TCL.md`
- README audit-tcl: `/Users/pedrolemes/audit-tcl/README.md`
- Runbook audit-tcl: `/Users/pedrolemes/audit-tcl/RUNBOOK.md`
