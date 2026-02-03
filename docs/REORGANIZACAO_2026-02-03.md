# 🔍 Análise Completa - Reorganização de Documentos

## 📊 Situação Atual

**Raiz do projeto:** 164 itens (muitos desnecessários)  
**Pasta docs/ existente:** Estrutura organizada com subpastas  
**Problema:** ~80 arquivos .md na raiz poluindo o projeto  

---

## ✅ Arquivos que DEVEM Permanecer na Raiz

### Configuração Essencial do Projeto
- ✅ `package.json` - Configuração npm
- ✅ `package-lock.json` - Lock de dependências
- ✅ `tsconfig.json` - Configuração TypeScript
- ✅ `tsconfig.tsbuildinfo` - Build cache TS
- ✅ `next.config.ts` - Configuração Next.js
- ✅ `next-env.d.ts` - Types do Next.js
- ✅ `tailwind.config.ts` - Configuração Tailwind
- ✅ `postcss.config.mjs` - Configuração PostCSS
- ✅ `drizzle.config.ts` - Configuração Drizzle ORM
- ✅ `middleware.ts` - Middleware Next.js
- ✅ `vitest.config.ts` - Configuração Vitest
- ✅ `playwright.config.ts` - Configuração Playwright
- ✅ `eslint.config.mjs` - Configuração ESLint
- ✅ `components.json` - Configuração shadcn/ui
- ✅ `cliff.toml` - Changelog generator
- ✅ `catalog-info.yaml` - Backstage catalog

### README e Documentação Principal
- ✅ `README.md` - Documentação principal do projeto (MANTER NA RAIZ)

### Arquivos de Ambiente
- ✅ `.env` - Variáveis de ambiente
- ✅ `.gitignore` - Regras git
- ✅ `.eslintignore` - Regras ESLint
- ✅ `.npmrc` - Configuração npm
- ✅ `.nvmrc` - Versão Node
- ✅ `.rebuild-trigger` - Trigger de rebuild

### Arquivos Docker
- ✅ `Dockerfile` - Build de imagem
- ✅ `docker-compose.yml` - Orquestração local
- ✅ `docker-compose.dev.yml` - Dev environment
- ✅ `docker-compose.test.yml` - Test environment
- ✅ `docker-compose.coolify.yml` - Produção Coolify

### Logs de Build (Temporários - Podem ser Deletados)
- 🗑️ `build-errors.log` - **DELETAR** (temporário)
- 🗑️ `typecheck-errors.log` - **DELETAR** (temporário)
- 🗑️ `typecheck-output.log` - **DELETAR** (temporário)

### Scripts de Projeto
- ✅ `run-migration-0032.ts` - Script de migração
- ✅ `run-quick-migration.ts` - Script de migração
- ✅ `test-db-connection.js` - Script de teste
- ✅ `seed-test-goal.sql` - Seed SQL
- ✅ `create-idempotency-table-simple.sql` - SQL setup

---

## 📁 Arquivos Específicos do Workspace Clawd

**NÃO MOVER** - São gerenciados pelo Clawd:

- ✅ `AGENTS.md` - Configuração do agente (Clawd)
- ✅ `BOOTSTRAP.md` - Bootstrap do agente (Clawd)
- ✅ `SOUL.md` - Personalidade do agente (Clawd)
- ✅ `TOOLS.md` - Ferramentas do agente (Clawd)
- ✅ `USER.md` - Info do usuário (Clawd)
- ✅ `CLAUDE.md` - Config Claude (Clawd)

---

## 🚚 Arquivos para MOVER para `docs/`

### 📂 docs/bugs/ (Bug Reports & Resoluções)

```bash
# Bugs Resolvidos
BUG_FIX_userId.md → docs/bugs/BUG-001-userId-schema-mismatch.md
BUG_SWOT_500_RESOLUTION.md → docs/bugs/BUG-SWOT-500-entity-payload.md
BUG_FIX_CACHE_INVALIDATION.md → docs/bugs/BUG-cache-invalidation.md
BUG_FIX_CONSOLE_LOG.md → docs/bugs/BUG-console-log-leak.md

# Análises de Bugs
BUG_ANALYSIS_STRATEGIC_UI.md → docs/bugs/strategic-ui-analysis.md
STRATEGIC_BUGS_ACTION_PLAN.md → docs/bugs/strategic-ui-action-plan.md

# Bug Fixes Consolidados
BUGFIXES_CONSOLIDATED_FINAL.md → docs/bugs/consolidado-final.md
BUGFIXES_CRITICAL_REPORT.md → docs/bugs/critical-report.md
BUGFIX_BUG1_BUG2_REPORT.md → docs/bugs/bug1-bug2-report.md
BUGFIX_RACE_CONDITION_REPORT.md → docs/bugs/race-condition.md
BUGFIX_REPORT.md → docs/bugs/bugfix-report.md
BUGFIX_NEXT_PWA_CONFIG.md → docs/bugs/next-pwa-config.md
PLAYWRIGHT_MIGRATION_BUGFIX.md → docs/bugs/playwright-migration.md
```

### 📂 docs/setup/ (Guias de Setup e Configuração)

```bash
# Redis Setup
REDIS_SETUP_FINAL.md → docs/setup/redis-setup.md
REDIS_SETUP_COMMANDS.md → docs/setup/redis-commands.md
COOLIFY_REDIS_CONFIG.md → docs/setup/coolify-redis.md

# Coolify
DIAGNOSTICO_COOLIFY.md → docs/setup/diagnostico-coolify.md
COMANDO_RAPIDO_DIAGNOSTICO.md → docs/setup/comando-diagnostico.md
REBUILD_STATUS.md → docs/setup/rebuild-status.md

# Configurações
INSTRUCOES_MIGRATION_CLASS.md → docs/setup/migration-class.md
CORRECAO_IMPORTS_COMPLETA.md → docs/setup/correcao-imports.md
RESULTADO_FINAL_CRUD.md → docs/setup/crud-resultado.md
BTG_ENV_VARS.txt → docs/setup/btg-env-vars.md (renomear .txt para .md)
```

### 📂 docs/fases/ (Análises de Fases/Sprints)

```bash
# Fase BugFix Strategic
PROMPTS_BUGFIX_STRATEGIC_CRIADOS.md → docs/fases/bugfix-strategic/README.md

# Task Reports
TASK02_CACHE_SERVICE_FINAL.md → docs/fases/redis/task02-cache-service.md
TASK02_RELATORIOS_PDF_COMPLETO.md → docs/fases/relatorios/task02-pdf.md
TASK02_REPORT.md → docs/fases/tasks/task02-report.md
TASK03_REPORT.md → docs/fases/tasks/task03-report.md
TASK04_RELATORIO.md → docs/fases/tasks/task04-relatorio.md
TASK05_RELATORIO.md → docs/fases/tasks/task05-relatorio.md
TASK06_RELATORIO.md → docs/fases/tasks/task06-relatorio.md
TASK07_DIAGNOSTICO.md → docs/fases/tasks/task07-diagnostico.md
TASK07_SUMMARY.md → docs/fases/tasks/task07-summary.md
TASK07_VISUAL_REPORT.md → docs/fases/tasks/task07-visual.md
TASK08_FINAL_REPORT.md → docs/fases/tasks/task08-final.md
TASK09_FINAL_REPORT.md → docs/fases/tasks/task09-final.md

# Consolidated Tasks
TASKS_01_02_FINAL_REPORT.md → docs/fases/tasks/tasks-01-02-final.md
TASKS_07_08_09_CONSOLIDATED_REPORT.md → docs/fases/tasks/tasks-07-09-consolidated.md
TASK_01_PERFORMANCE_SUMMARY.md → docs/fases/performance/task01-summary.md
TASK_02_PWA_SUMMARY.md → docs/fases/pwa/task02-summary.md
TASK_03_MOBILE_RECOMMENDATION.md → docs/fases/mobile/task03-recommendation.md
```

### 📂 docs/relatorios/ (Relatórios Executivos)

```bash
RELATORIO_CONSOLIDADO_COMPLETO.md → docs/relatorios/2026-02-03-consolidado.md
RELATORIO_README.md → docs/relatorios/README.md
relatorio-executivo-auracore.html → docs/relatorios/2026-02-03-executivo.html
```

### 📂 docs/performance/ (Performance & UX)

```bash
UX_PERFORMANCE_IMPROVEMENTS.md → docs/performance/ux-improvements.md
```

### 📂 docs/architecture/ (Arquitetura Legada - E7.x)

```bash
# Épicos E7.x
E7.10_BREAKING_CHANGE_WARNING.md → docs/architecture/e7/E7.10-breaking-change.md
E7.10_FASE1_TYPESCRIPT_ERRORS_RESOLVED.md → docs/architecture/e7/E7.10-fase1-typescript.md
E7.10_FASE2.5_FINAL_REPORT.md → docs/architecture/e7/E7.10-fase2.5-final.md
E7.10_FASE2_TESTS_RESOLVED.md → docs/architecture/e7/E7.10-fase2-tests.md
E7.10_ISSUE_CRITICA_RESOLVIDA.md → docs/architecture/e7/E7.10-issue-critica.md
E7.11_FASE1_MSSQL_SCHEMA_FIXED.md → docs/architecture/e7/E7.11-fase1-mssql.md
E7.11_FASE2_AUTH_INTEGRATION_COMPLETE.md → docs/architecture/e7/E7.11-fase2-auth.md
E7.12_FASE1_FIX_DUPLICATE_FILES.md → docs/architecture/e7/E7.12-fase1-duplicates.md
E7.12_FASE1_RELATORIO.md → docs/architecture/e7/E7.12-fase1-relatorio.md
E7.12_FASE2_RELATORIO.md → docs/architecture/e7/E7.12-fase2-relatorio.md
E7.12_RELATORIO_CONSOLIDADO.md → docs/architecture/e7/E7.12-consolidado.md
E7.13_FINAL_REPORT.md → docs/architecture/e7/E7.13-final.md
E7.14_CRIACAO_COMPLETA.md → docs/architecture/e7/E7.14-criacao.md
E7.14_FINAL_REPORT.md → docs/architecture/e7/E7.14-final.md
E7.14_RELATORIO_FINAL.md → docs/architecture/e7/E7.14-relatorio-final.md
E7.15_RELATORIO_FINAL.md → docs/architecture/e7/E7.15-final.md
```

### 📂 docs/planning/ (Planejamento Geral)

```bash
PLANEJAMENTO_AGNO_AURACORE_V2.md → docs/planning/agno-auracore-v2.md
frontend-analysis-report-20260120-021632.md → docs/planning/frontend-analysis-20260120.md
```

### 📂 docs/audit/ (Auditoria & Segurança)

```bash
RESUMO_AUDITORIA_SEGURANCA.md → docs/audit/resumo-seguranca.md
```

### 📂 docs/technical-debt/ (Débito Técnico)

```bash
CONTEXT_E0.1.md. → docs/technical-debt/context-e0.1.md (remover ponto final)
```

### 📂 docs/misc/ (Guias Gerais)

```bash
COMO_SALVAR_E_FECHAR_CURSOR.md → docs/misc/como-salvar-cursor.md
CONTINUACAO_13_12_2025.md → docs/misc/continuacao-13-12-2025.md
```

### 📂 docs/ag-grid/ (AG Grid Específico)

```bash
AGGRID_ERRORS_FIX.md → docs/ag-grid/errors-fix.md
AGGRID_FIXES_APPLIED.md → docs/ag-grid/fixes-applied.md
AGGRID_TRIAL_RESUMO.md → docs/ag-grid/trial-resumo.md
```

### 📂 docs/reports/ (Relatórios de Sessão/Status)

```bash
RELATORIO_SESSAO_E7.16.md → docs/reports/sessao-e7.16.md
RELATORIO_STATUS_AURACORE.md → docs/reports/status-auracore.md
```

---

## 🗑️ Arquivos para DELETAR (Temporários/Obsoletos)

```bash
# Scripts temporários
generate-pdf.js (temporário, não é mais necessário)

# Logs de build
build-errors.log
typecheck-errors.log
typecheck-output.log

# Arquivo de estrutura
project-structure.txt (pode ser regenerado)

# Arquivo oculto Mac
.DS_Store
```

---

## 📂 Estrutura Final de `docs/`

```
docs/
├── README.md (índice geral - criar)
│
├── bugs/
│   ├── README.md (índice de bugs)
│   ├── BUG-001-userId-schema-mismatch.md
│   ├── BUG-SWOT-500-entity-payload.md
│   ├── BUG-cache-invalidation.md
│   ├── strategic-ui-analysis.md
│   ├── strategic-ui-action-plan.md
│   └── ... (outros bugs)
│
├── setup/
│   ├── README.md (índice de guias)
│   ├── redis-setup.md
│   ├── redis-commands.md
│   ├── coolify-redis.md
│   └── ... (outros guias)
│
├── fases/
│   ├── README.md (índice de fases)
│   ├── bugfix-strategic/
│   │   └── README.md
│   ├── redis/
│   ├── tasks/
│   ├── performance/
│   ├── pwa/
│   └── mobile/
│
├── relatorios/
│   ├── README.md
│   ├── 2026-02-03-consolidado.md
│   └── 2026-02-03-executivo.html
│
├── architecture/
│   ├── e7/ (épicos legados E7.x)
│   └── ... (existing structure)
│
├── ag-grid/
│   ├── errors-fix.md
│   ├── fixes-applied.md
│   └── trial-resumo.md
│
├── performance/
│   └── ux-improvements.md
│
├── planning/
│   └── agno-auracore-v2.md
│
├── audit/
│   └── resumo-seguranca.md
│
├── misc/
│   └── como-salvar-cursor.md
│
└── (existing folders: agent, agents, api, database, etc.)
```

---

## 📊 Estatísticas

### Arquivos na Raiz Atual
- **Arquivos .md:** ~80
- **Arquivos essenciais (config):** ~30
- **Scripts shell:** ~15
- **Logs/temp:** ~5

### Após Reorganização
- **Arquivos .md na raiz:** 6 (apenas Clawd workspace)
- **Arquivos essenciais mantidos:** ~30
- **Arquivos movidos para docs/:** ~80
- **Arquivos deletados:** ~5

---

## ✅ Ações a Executar

1. **Criar subpastas em docs/**
   - `docs/bugs/`
   - `docs/setup/`
   - `docs/fases/bugfix-strategic/`
   - `docs/fases/redis/`
   - `docs/fases/tasks/`
   - `docs/fases/performance/`
   - `docs/fases/pwa/`
   - `docs/fases/mobile/`
   - `docs/relatorios/`
   - `docs/ag-grid/`
   - `docs/architecture/e7/`
   - `docs/misc/`

2. **Criar READMEs de índice**
   - `docs/README.md`
   - `docs/bugs/README.md`
   - `docs/setup/README.md`
   - `docs/fases/README.md`
   - `docs/relatorios/README.md`

3. **Mover arquivos** (executar comandos mv)

4. **Deletar arquivos temporários**

5. **Commit da reorganização**

---

## ⚠️ Verificação de Segurança

**NUNCA MOVER:**
- ✅ Arquivos de configuração (package.json, tsconfig.json, etc.)
- ✅ Arquivos do Clawd (AGENTS.md, SOUL.md, etc.)
- ✅ Scripts SQL de setup
- ✅ README.md principal do projeto
- ✅ Dockerfiles
- ✅ .env e arquivos de configuração

**APENAS MOVER:**
- ✅ Arquivos de documentação (.md de análises, relatórios, bugs)
- ✅ Relatórios HTML de execução
- ✅ Scripts de geração temporária (generate-pdf.js)

---

**Status:** ✅ Análise completa  
**Risco:** 🟢 BAIXO (apenas documentação será movida)  
**Aguardando aprovação para executar**
