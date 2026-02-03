# DIAGNÓSTICO ARQUITETURAL — AuraCore ERP
**Versão:** 1.0  
**Data:** 02/02/2026  
**Projeto:** `/Users/pedrolemes/aura_core`

> Metodologia: **evidence-based** (nada de achismo). Tudo abaixo foi levantado via varredura do código + comandos shell.

---

## 1. RESUMO EXECUTIVO

### Veredito geral (% real de migração DDD)
O projeto é **arquiteturalmente híbrido**. Existe uma base **DDD/Hexagonal bem estabelecida no módulo `strategic`** e parcialmente em `wms`, `tms`, `documents`, enquanto `financial`, `fiscal` e principalmente `accounting` aparecem como **migração incompleta** (camadas faltando/zeradas). Alguns módulos (`commercial`, `fleet`, `knowledge`, `integrations`) parecem **"thin modules"** (DI + ports/gateways) sem materialização completa de Domain/Application/Infra.

**Estimativa de migração efetiva para o padrão ADR-0015:** **~35–45%** do código segue o desenho completo (Domain→Ports→Application→Infra→DI), com o restante em padrões mistos (incluindo código legado em `src/services/`).

### Top 5 riscos críticos
1. **Multi-tenancy inconsistente nas APIs**: 27 rotas `route.ts` **sem** marcadores (`getTenantContext|organizationId|branchId`). Em ERP isso vira risco de **vazamento cross-tenant**.
2. **`src/services/` grande e ativo (39 arquivos)**: permanece como "core" legado importado por adapters atuais (**25 imports encontrados**). Isso mantém acoplamento e inviabiliza 100% DDD (ADR-0015).
3. **Infra incompleta em módulos-chave**:
   - `financial`: 0 repos/mappers/schemas (apesar de ter entities/ports) → alto risco de "arquitetura de papel".
   - `accounting`: 0 commands/queries/repos/mappers/schemas → módulo parece não operacional ou não migrado.
4. **TypeScript não compila limpo**: **39 erros TS** (inclui API routes + queries estratégicas + testes). Isso degrada refactor seguro e CI.
5. **Output ports com multi-tenancy ausente em integrações/serviços**: muitos ports de gateway (ex.: `ISefazService`, `IVectorStore`) não carregam contexto de tenant — risco de implementação "single-tenant" por acidente.

### Top 5 pontos positivos
1. `strategic` é **o melhor exemplo de DDD/Hexagonal** no repo: tem entities, VOs, domain services, ports, commands/queries, infra (repos/mappers/schemas) e DI robustos.
2. Alto uso de `getTenantContext` nas rotas: **399/433 (~92%)** possuem marcador de multi-tenancy.
3. `strategic` / `tms` / `documents` / `wms` possuem **infra Drizzle** (schemas/mappers/repos) e DI consistente.
4. Repositórios Drizzle em módulos maduros implementam interface e são injectable (ex.: `wms`, `strategic`, `tms`, `documents`).
5. ADRs existem e são claros (ADR-0015/0020/0021/0022), servindo como baseline para fechar o gap.

---

## 2. MÉTRICAS QUANTITATIVAS

### Tabela de Conformidade DDD por Módulo
> Score calculado por peso relativo (camadas presentes) usando `strategic` como baseline (100%).

| Módulo | Entities | VOs | Ports In | Ports Out | Commands | Queries | Repos | Mappers | Schemas | DI | Score |
|--------|----------|-----|----------|-----------|----------|---------|-------|---------|---------|----|------:|
| strategic | 16 | 9 | 19 | 17 | 22 | 13 | 17 | 16 | 23 | 3 | 100% |
| financial | 7 | 9 | 18 | 9 | 2 | 0 | 0 | 0 | 0 | 2 | 37% |
| fiscal | 3 | 9 | 24 | 14 | 6 | 2 | 0 | 0 | 2 | 2 | 52% |
| accounting | 3 | 3 | 7 | 4 | 0 | 0 | 0 | 0 | 0 | 2 | 14% |
| tms | 6 | 7 | 6 | 6 | 4 | 3 | 4 | 4 | 4 | 1 | 28% |
| wms | 4 | 4 | 18 | 6 | 0 | 0 | 5 | 5 | 5 | 1 | 33% |
| documents | 3 | 5 | 4 | 4 | 3 | 2 | 3 | 3 | 3 | 1 | 19% |
| contracts | 0 | 0 | 2 | 1 | 4 | 0 | 0 | 0 | 0 | 3 | 9% |
| commercial | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 2% |
| fleet | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 2% |
| knowledge | 0 | 0 | 0 | 3 | 2 | 2 | 0 | 0 | 0 | 3 | 7% |
| integrations | 0 | 5 | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 1 | 12% |

### Métricas de API Routes

| Métrica | Quantidade | % |
|---------|------------|---:|
| Total de Rotas | 433 | 100% |
| Rotas via Use Case/DI | 144 | 33.3% |
| Rotas com acesso direto DB | 28 | 6.5% |
| Rotas com getTenantContext | 399 | 92.1% |
| Rotas com validação Zod | 114 | 26.3% |

**Rotas sem marcador de multi-tenancy (27):**
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/health/embeddings/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/admin/migrations/0033-idempotency/route.ts`
- `src/app/api/admin/cache/stats/route.ts`
- `src/app/api/admin/roles/route.ts`
- `src/app/api/admin/diagnostics/endpoints/route.ts`
- `src/app/api/admin/diagnostics/requests/route.ts`
- `src/app/api/admin/diagnostics/route.ts`
- `src/app/api/admin/ops/health/latest/route.ts`
- `src/app/api/admin/ops/health/history/route.ts`
- `src/app/api/admin/ops/health/run/route.ts`
- `src/app/api/admin/branches/migrate/route.ts`
- `src/app/api/strategic/pdca/[id]/route.ts`
- `src/app/api/strategic/achievements/route.ts`
- `src/app/api/strategic/leaderboard/route.ts`
- `src/app/api/strategic/permissions/route.ts`
- `src/app/api/strategic/points/route.ts`
- `src/app/api/strategic/war-room/stream/route.ts`
- `src/app/api/strategic/notifications/read-all/route.ts`
- `src/app/api/strategic/notifications/route.ts`
- `src/app/api/agents/health/route.ts`
- `src/app/api/docs/route.ts`
- `src/app/api/v2/financial/payables/route.ts`
- `src/app/api/v2/financial/payables/[id]/cancel/route.ts`
- `src/app/api/v2/financial/payables/[id]/pay/route.ts`
- `src/app/api/v2/financial/payables/[id]/route.ts`

### Código Legado

| Categoria | Quantidade |
|-----------|-----------:|
| Services em `src/services/` | 39 |
| Imports de services legados | 25 |
| Violações domain→infra | 0 |
| Violações application→db | 4 |
| Uso de `as any` | 1 |
| Erros TypeScript | 39 |

---

## 3. ANÁLISE DETALHADA POR MÓDULO

> Observação: a seção abaixo é **estritamente baseada no que existe no repositório** (contagens + padrões detectados). Onde faltam artefatos, o gap é real.

### STRATEGIC
**Score DDD:** 100%

**Domain Layer:**
- Entities (16): `Strategy`, `StrategicGoal`, `KPI`, `ActionPlan`, `ActionPlanFollowUp`, `IdeaBox`, `WarRoomMeeting`, `SwotItem`, etc.
- Value Objects (9): `BSCPerspective`, `GoalStatus`, `ExecutionStatus`, `PDCACycle`, etc.
- Domain Services (6): `GoalCascadeService`, `KPICalculatorService`, `AgendaGeneratorService`, `ApprovalWorkflowService`, etc.
- Domain Events: presentes em várias entities (ex.: `Strategy`, `StrategicGoal`, `WarRoomMeeting`, etc.), mas **não em todas**.

**Ports:**
- Input Ports (19): padrão ok na maioria; `index.ts` (barrel) marca como “padrão incorreto” no grep (esperado).
- Output Ports (17): repositórios com multi-tenancy **majoritariamente ok**; `index.ts` novamente aparece como “sem multi-tenancy” (barrel).

**Application Layer:**
- Commands (22): maioria com Result Pattern + DI; parte com `TenantContext` explícito, parte não.
- Queries (13): maioria ok; `GetBSCDashboardQuery.ts` precisa revisão (marcado como ⚠️ pelo grep).

**Infrastructure Layer:**
- Schemas (23): boa cobertura, mas existem **schemas sem organizationId/branchId** (ex.: `bsc-perspective.schema.ts`, `action-plan-follow-up.schema.ts`, `kpi-history.schema.ts`, `index.ts`).
- Mappers (16): mappers OK; `index.ts` dos mappers é “métodos faltando” (barrel).
- Repositories (17): Drizzle repos implementam interface e são injectable; `index.ts` não é repo (barrel).
- DI (3): existe e registra repos/use cases/integrations.

**API Routes:**
- Total (no app): `strategic` 135 rotas.

**Bugs/Issues Identificados:**
1. **[BUG-SEC-001] CRÍTICO** — rotas estratégicas específicas sem marcador de multi-tenancy (ex.: `strategic/pdca/[id]`, achievements/leaderboard/permissions/points/notifications).
2. **[BUG-ARCH-002] ALTO** — schemas sem `organizationId/branchId` em tabelas relevantes (risco de dados globais).
3. **[BUG-TS-003] ALTO** — erros TS em queries (`GetDrilldownQuery`) indicando tipos inconsistentes e provável drift entre DTOs e queries.

---

### FINANCIAL
**Score DDD:** 37%

**Domain Layer:**
- Entities (7) e VOs (9) existem.
- Domain Services (9) existem.

**Ports:**
- Input Ports (18) / Output Ports (9) existem.

**Application Layer:**
- Commands (2) existem; Queries (0).

**Infrastructure Layer:**
- Schemas/Mappers/Repos: **0** (contagem por camada). Isso é um red flag: ou está em outro lugar, ou o módulo ainda não tem persistência DDD na estrutura esperada.
- DI (2) existe (indicando intenção de módulo).

**Bugs/Issues Identificados:**
1. **[BUG-ARCH-004] ALTO** — módulo com Domain/Ports mas sem infraestrutura de persistência na pasta padrão (ADR-0015).

---

### FISCAL
**Score DDD:** 52%

**Domain Layer:**
- Entities (3), VOs (9), Domain Services (22) — muito conteúdo.
- Alguns "domain services" apresentam estado (ex.: `SefazDocumentProcessor` guarda parser; `TaxCreditCalculator` seta `this.name` por ser Error).

**Ports:**
- Input Ports (24) e Output Ports (14) existem.
- Vários output ports não carregam multi-tenancy (gates/serviços) — esperado em integrações, mas precisa padrão.

**Infrastructure Layer:**
- Schemas (2) apenas.
- Repos/Mappers: 0.
- DI (2) existe.

**Bugs/Issues Identificados:**
1. **[BUG-ARCH-005] ALTO** — fiscal com infra parcial (schemas existem, mas repos/mappers zerados), contrariando ADR-0015.
2. **[BUG-ARCH-006] MÉDIO** — serviços de domínio com estado (ou falsos positives por classes Error), revisar o que é realmente Domain Service.

---

### ACCOUNTING
**Score DDD:** 14%

- Domain existe (entities/VOs/ports/services), mas Application (commands/queries) e Infra (repos/mappers/schemas) estão zerados na estrutura padrão.
- DI existe.

**Bugs/Issues Identificados:**
1. **[BUG-ARCH-007] ALTO** — módulo essencial do ERP sem materialização de camadas (risco de backlog oculto / feature incompleta).

---

### TMS
**Score DDD:** 28%

- Entities (6) / VOs (7) / ports in/out (6/6) OK.
- Commands (4) / Queries (3) OK.
- Infra (repos/mappers/schemas) presente (4/4/4), DI presente.

**Bugs/Issues Identificados:**
1. **[BUG-ARCH-008] MÉDIO** — Domain Services 0 (pode estar ok, mas validar se lógica de negócio está indo para Application/Infra indevidamente).

---

### WMS
**Score DDD:** 33%

- Entities/VOs/ports OK.
- Commands/Queries estão zerados na contagem por camada (mas há use-cases em `application/use-cases` fora do padrão `application/commands|queries` → conflito com ADR-0015).
- Infra e DI presentes.

**Bugs/Issues Identificados:**
1. **[BUG-ARCH-009] MÉDIO** — WMS usa `application/use-cases` (fora do padrão ADR-0015 que exige `commands/queries`).

---

### DOCUMENTS
**Score DDD:** 19%

- Entities/VOs/ports e infra presentes.
- Commands/queries existem.
- Multi-tenancy em `IStorageProvider` (port) marcado como ausente (faz sentido, mas precisa decisão clara: storage é por tenant?).

**Bugs/Issues Identificados:**
1. **[BUG-SEC-010] ALTO** — `IStorageProvider` sem contrato explícito de tenant pode vazar caminho/bucket se adapter não isolar.

---

### CONTRACTS
**Score DDD:** 9%

- Sem entities/VOs; tem domain services (5) + ports (input 2 / output 1) + commands (4) e DI.
- Parece módulo de análise (RAG/Docling) mais do que ERP clássico.

---

### COMMERCIAL
**Score DDD:** 2%

- Apenas output ports (2) + DI (1). Sem domain/application.

---

### FLEET
**Score DDD:** 2%

- Apenas output ports (2) + DI (1). Sem domain/application.

---

### KNOWLEDGE
**Score DDD:** 7%

- Domain services (3), output ports (3), commands (2) e queries (2), DI (3).
- Sem entities/VOs.

---

### INTEGRATIONS
**Score DDD:** 12%

- VOs (5) e output ports (12), DI (1). Sem entities/application/infra de persistência.
- DI tem lógica de mocks/real adapters com flags (bom para safety, mas precisa governança).

---

## 4. BUGS E ISSUES CONSOLIDADOS

### Críticos (P0) - Segurança/Dados
| ID | Bug | Módulo | Arquivo | Impacto |
|----|-----|--------|---------|---------|
| BUG-SEC-001 | Rotas sem multi-tenancy marker | API | múltiplos `route.ts` listados acima | risco de vazamento cross-tenant |

### Altos (P1) - Funcionalidade
| ID | Bug | Módulo | Arquivo | Impacto |
|----|-----|--------|---------|---------|
| BUG-ARCH-004 | Financial sem repos/mappers/schemas na estrutura DDD | financial | `src/modules/financial/*` | módulo pode não persistir via arquitetura padrão |
| BUG-ARCH-005 | Fiscal infra parcial (schemas sem repos/mappers) | fiscal | `src/modules/fiscal/*` | manutenção difícil + risco de bypass de camadas |
| BUG-TS-003 | TS errors em queries estratégicas (drilldown) | strategic | `GetDrilldownQuery.ts` | build/CI quebrado; regressões |

### Médios (P2) - Manutenibilidade
| ID | Bug | Módulo | Arquivo | Impacto |
|----|-----|--------|---------|---------|
| BUG-ARCH-009 | WMS usa `application/use-cases` fora de `commands/queries` | wms | `src/modules/wms/application/use-cases/*` | drift com ADR-0015 |
| BUG-LEG-011 | `src/services/` permanece grande e importado | vários | `src/services/*` + adapters | acoplamento/duplicidade de lógica |

---

## 5. GAP ANALYSIS: PLANEJADO vs ATUAL

### ADR-0015 (100% DDD)
| Requisito | Meta | Atual | Gap |
|-----------|------|-------|-----|
| Estrutura por módulo completa (domain/application/infrastructure) | 100% | parcial (módulos variam de 2% a 100%) | alto |
| Remover/migrar `src/services/` | 0 | 39 arquivos + 25 imports | alto |
| Commands/Queries padronizados | sim | misto (`use-cases/`, `commands/`, `queries/`) | médio |
| Infra completa (schemas/mappers/repos) | sim | faltante em `financial`, parcial em `fiscal` | alto |
| Multi-tenancy em toda query/rota | sim | 92% com marker; 27 rotas sem | médio/alto |

### ADR-0020 (Strategic Module)
| Componente | Planejado | Implementado | % |
|------------|-----------|--------------|---:|
| Entities principais (Strategy/Goal/KPI/ActionPlan/FollowUp/IdeaBox/WarRoom/Swot) | sim | sim (16 entities) | ~90–100% |
| Ports/Use Cases (commands/queries) | sim | sim (22/13) | alto |
| Integrations com Financial/TMS/WMS para KPIs | sim | existe DI tokens + adapters | parcial |

### ADR-0021 (BSC)
| Componente | Planejado | Implementado | % |
|------------|-----------|--------------|---:|
| Perspectivas fixas (FIN/CLI/INT/LRN) como VO | sim | existe `BSCPerspective` | alto |
| Modelo de dados Strategy→Goals→KPIs→History | sim | existem schemas e entities | alto |
| Relações causa-efeito e mapa estratégico | sim | presença de queries e swot/strategy | parcial (confirmar UI/flow) |

### ADR-0022 (Follow-up 3G)
| Componente | Planejado | Implementado | % |
|------------|-----------|--------------|---:|
| Entity ActionPlanFollowUp com 3G fields | sim | existe `ActionPlanFollowUp` + schema | médio/alto |
| Evidências e reproposição | sim | há comandos (repropose/execute follow up) | médio |

---

## 6. MAPA DE CORRELAÇÕES

```mermaid
flowchart LR
  subgraph Strategic[Strategic]
    S1[Commands/Queries]
    S2[Domain Entities/VOs]
    S3[Repos/Mappers/Schemas]
  end

  subgraph Financial[Financial]
    F2[Domain + Ports]
    F3[DI]
  end

  subgraph TMS[TMS]
    T2[Domain + Ports]
    T3[Infra Drizzle]
  end

  subgraph WMS[WMS]
    W2[Domain + Ports]
    W3[Infra Drizzle]
  end

  subgraph Services[src/services (legacy)]
    L1[Engines/Adapters]
  end

  Strategic -->|KPI adapters| Financial
  Strategic -->|KPI adapters| TMS
  Strategic -->|KPI adapters| WMS
  Financial -->|Adapters importam| Services
  TMS -->|Adapters importam| Services
  WMS -->|Adapters importam| Services
```

---

## 7. CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 0: Quick Wins (Semana 1)
| Tarefa | Módulo | Horas | Prioridade |
|--------|--------|------:|------------|
| Corrigir 27 rotas sem multi-tenancy marker (ou justificar exceção) | API | 6–12h | P0 |
| Padronizar `index.ts` barrels para não aparecerem como falsos negativos nas métricas (opcional) | geral | 1–2h | P2 |
| Inventariar e classificar `src/services/` (o que migra, o que vira adapter, o que aposenta) | geral | 6–10h | P1 |
| Reduzir TS errors (começar pelos que quebram build: routes + drilldown query) | strategic/API | 8–16h | P1 |

### Fase 1: Infra Missing (Semanas 2–3)
| Tarefa | Módulo | Horas | Prioridade |
|--------|--------|------:|------------|
| Implementar `financial` infra padrão (schemas/mappers/repos) ou mover para local correto + registrar em DI | financial | 24–60h | P1 |
| Completar `fiscal` infra (repos/mappers) ou declarar padrão alternativo formal (ADR) | fiscal | 24–80h | P1 |
| Normalizar WMS para `application/commands` e `application/queries` (mover `use-cases/`) | wms | 12–24h | P2 |

### Resumo do Cronograma
| Fase | Semanas | Horas | Entregável |
|------|---------|------:|------------|
| Fase 0 | 1 | 21–40h | segurança multi-tenant + base de refactor |
| Fase 1 | 2–3 | 60–164h | módulos core alinhados ao ADR-0015 |

---

## 8. RECOMENDAÇÕES FINAIS

### Priorização MoSCoW
- **MUST:**
  - Garantir multi-tenancy em 100% das rotas (ou ADR de exceção + hardening)
  - Reduzir dependência ativa de `src/services/` (migrar engines críticas)
  - Consertar TS errors (build/CI) para permitir evolução segura
- **SHOULD:**
  - Completar infraestrutura DDD do `financial` e `fiscal` (ou formalizar arquitetura alternativa)
  - Normalizar WMS e Accounting conforme ADR-0015
- **COULD:**
  - Criar métricas automáticas (script) para score DDD por módulo em CI
  - Cobertura mínima por módulo (target por camada)
- **WONT (por agora):**
  - Event sourcing/CQRS completo (não é pré-requisito para fechar o padrão ADR-0015)

### Riscos e Mitigações
| Risco | Probabilidade | Impacto | Mitigação |
|------|---------------|---------|----------|
| Vazamento cross-tenant por rota sem guard | Média | Crítico | bloquear via middleware/guard + checklist PR |
| Refactor travado por TS errors | Alta | Alto | corrigir build primeiro; depois refactor |
| Migração de `src/services/` quebrar integrações | Média | Alto | estratégia strangler: ports + adapters + testes |

### Métricas de Sucesso
| Fase | Critério de Aceite |
|------|--------------------|
| Fase 0 | 0 rotas sem multi-tenancy marker (ou lista justificada), TS errors < 5 |
| Fase 1 | `financial` e `fiscal` com infra/DI aderente ou ADR definindo exceção; redução imports de `src/services` em >50% |

---

## Apêndice — Evidências (Logs)
- Execução principal: `_documentation/reports/_work/diag_20260202.commands.log`
- Continuação (tsc/tests/docs): `_documentation/reports/_work/diag_20260202.tail2.log`
