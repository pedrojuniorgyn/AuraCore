## 🎯 Roadmap Executivo — Ondas 5A a 9 (Incremental, sem big-bang)

**Contexto de execução**  
- Deploy: **Linux via Coolify (containers)**  
- Banco: **SQL Server 2022 em Linux**  
- Objetivo: **performance, previsibilidade, estabilidade e manutenção** sem reescrever o sistema.

---

## 📌 Regras do roadmap (não negociáveis)
- **Incremental**: cada onda entrega valor real, com rollback simples.
- **Sem big-bang refactor**: mudanças por “fatias” e pontos de alto ROI.
- **Container-first**: nada que dependa de filesystem local para dados críticos.
- **SQL Server-first**: otimizações guiadas por Query Store/planos, sem “achismo”.
- **Segurança/tenancy**: qualquer nova rota/feature já nasce com `organizationId` + scoping por filial quando aplicável.

---

## 🧭 Ordem de execução (segura e realista)
1. **Onda 5A — Observabilidade mínima e SLO** (medir antes de mexer pesado)
2. **Onda 5B — Idempotência nas integrações** (efeito único / anti-duplicação)
3. **Onda 6 — Document Pipeline (upload + monitor + jobs)**
4. **Onda 7 — Drizzle por tabela + Usecases + contratos**
5. **Onda 8 — Performance contínua SQL Server + SSRM no core**
6. **Onda 9 — Segurança avançada & governança**

---

## Onda 5A — Observabilidade mínima e SLO

### Objetivo
Criar **visibilidade operacional** (latência, erros, rotas mais lentas) em produção (Coolify) para orientar as próximas ondas.

### Entregas (tarefas)
- **Logs estruturados JSON** (compatível com agregadores/CLI do Coolify)
  - `requestId` (correlation), `method`, `path`, `status`, `durationMs`
  - tenant fields quando disponíveis: `organizationId`, `branchId`, `userId`
- **Instrumentação transversal** em wrappers de API (ex.: `withPermission`, `withAuth`)
- **Buffer de “requests lentos”** (in-memory) para diagnóstico rápido pós-deploy
- **Endpoint admin de diagnóstico** (seguro) para listar requests mais lentos
- **Continuação 5A (hardening)**:
  - Propagar `x-request-id` na resposta
  - Adicionar `Server-Timing: app;dur=...`
  - “Slow log” com threshold configurável (ex.: `OBS_SLOW_MS`)

### Critérios de pronto (DoD)
- Logs JSON aparecem no container e são **correlacionáveis** por `requestId`.
- Existe um caminho simples para identificar “top 50 mais lentos” sem acessar SQL.
- Não altera o comportamento funcional das rotas (somente observabilidade).

### Checklist de validação (Coolify)
- **Funcional**
  - Login, navegação principal, telas críticas continuam operando.
- **Observabilidade**
  - Ver logs JSON no runtime e filtrar por `requestId`.
  - `GET /api/admin/diagnostics/requests?minMs=200&sinceMinutes=30&limit=50` retorna itens.
- **Estabilidade**
  - Sem aumento relevante de erro 5xx após deploy.

### Estimativa (realista)
- **S** (1–2 dias) para baseline + ajustes de headers (dependendo do volume de rotas fora do guard).

---

## Onda 5B — Idempotência nas integrações (efeito único)

### Objetivo
Garantir que integrações e ações críticas tenham **efeito único** mesmo com:
- retries automáticos (proxy, cliente, Coolify)
- webhooks duplicados
- cliques repetidos no frontend
- reprocessamentos pós-timeout

### Decisão técnica recomendada
- **Idempotência persistida no SQL** (não in-memory), para funcionar em scale-out.
- Interface padrão:
  - Header `Idempotency-Key` (ou equivalente) + escopo por rota/tenant
  - Registro de status: `IN_PROGRESS` → `SUCCEEDED` / `FAILED`
  - TTL/expiração para evitar crescimento infinito

### Entregas (tarefas)
- Criar tabela `idempotency_keys` (idempotente) com índice único por `(organization_id, scope, key)`
- Criar utilitário `withIdempotency(...)` (ou wrapper similar) com:
  - lock transacional no SQL (evitar corrida)
  - retorno consistente quando a chave já foi usada
- Aplicar primeiro onde o risco é maior:
  - **BTG webhook** (duplicações são comuns)
  - **Geração de remessas/boletos** (efeito financeiro)
  - **Sync/ingest DDA** (reprocessamento seguro)
- Registrar nos logs (5A) os eventos: `idempotency.hit`, `idempotency.miss`, `idempotency.in_progress`

### Critérios de pronto (DoD)
- Repetir a mesma chamada com o mesmo `Idempotency-Key` **não duplica** efeitos no banco.
- Retorno para “hit” é previsível (ex.: 200 com referência do processamento anterior ou 409/202 padronizado).
- Observabilidade consegue provar “efeito único” (logs + auditoria).

### Checklist de validação
- Enviar o mesmo webhook 3x → 1 execução real, 2 hits.
- Simular timeout e retry → sem duplicação.
- Testar em ambiente Coolify com 2 réplicas (se aplicável).

### Estimativa
- **M** (2–5 dias), variando com quantas rotas críticas entram no primeiro lote.

---

## Onda 6 — Document Pipeline (upload + monitor + jobs)

### Objetivo
Padronizar e estabilizar o ciclo de vida de documentos (fiscais e não fiscais) com:
upload, storage externo, fila de processamento, status, logs e reprocesso.

### Entregas (tarefas)
- Componente único de upload (UI) + monitor padrão (status/erros/reprocessar)
- Storage externo (S3/MinIO) para arquivos (SQL guarda só metadados)
- Tabelas de jobs/documentos com estados (QUEUED/RUNNING/SUCCEEDED/FAILED)
- Migrar 1 fluxo fiscal e 1 não fiscal como pilotos

### DoD
- Upload e processamento sobrevivem a restart de container.
- Monitor permite reprocessar sem duplicar efeitos (encaixa com 5B).

### Estimativa
- **L** (1–2 semanas), com pilotos bem escolhidos.

---

## Onda 7 — Drizzle por tabela + Usecases + contratos

### Objetivo
Reduzir acoplamento e regressões: schema mais modular e regras de domínio reusáveis.

### Entregas (tarefas)
- 1 arquivo de schema por tabela (sem quebrar imports: camada compat)
- “Usecases internos” (serviços) para reuso entre rotas/telas
- Contratos (zod) consistentes por domínio + testes de contrato mínimos (smoke)

### Estimativa
- **M/L** (1–2 semanas), em lotes por domínio.

---

## Onda 8 — Performance contínua SQL Server + SSRM no core

### Objetivo
Performance previsível com base em dados reais (Query Store) e UI escalável.

### Entregas (tarefas)
- Baseline Query Store + top queries (p95/p99)
- Índices orientados ao workload (com rollback)
- SSRM nas telas do core de maior volume

### Estimativa
- **L** (2–4 semanas), por prioridade de telas.

---

## Onda 9 — Segurança avançada & governança

### Objetivo
Governança operacional e segurança enterprise (auditoria, trilhas, retenção, políticas).

### Entregas (tarefas)
- Auditoria padronizada (quem/quando/o quê) nos pontos críticos
- Políticas de retenção e limpeza (inclui dados temporários de idempotência/logs)
- Hardening de permissões e runbooks de incidentes

### Estimativa
- **M/L** (1–3 semanas), dependendo do escopo regulatório.

---

## ✅ Checkpoints globais por onda (sempre)
- **Funcional**: smoke tests de login, usuários, filiais, financeiro (pagar/receber), fiscal (ações essenciais), integrações críticas.
- **Performance**: medir 5 endpoints top e comparar p95/p99 (antes/depois).
- **Estabilidade**: taxa de erro por endpoint (4xx/5xx), timeouts, deadlocks, rollback readiness.







