## 🔭 Onda 5A — Observabilidade mínima (Coolify + SQL Server)

### Objetivo
Dar visibilidade operacional para executar as próximas ondas com segurança:
- latência (duração por request)
- erros (4xx/5xx) e rotas problemáticas
- correlação por `requestId`

---

## O que foi implementado (baseline)

### 1) Logs estruturados (JSON)
- Formato JSON (1 linha por evento), adequado para **logs de container** e agregação.
- Campos principais:
  - `ts`, `level`, `msg`, `service`, `env`
  - `requestId`, `method`, `path`, `status`, `durationMs`
  - `organizationId`, `branchId`, `userId` (quando disponíveis)

### 2) Instrumentação transversal em wrappers de API
Cobertura imediata nas rotas que usam:
- `withPermission(req, permission, handler)`
- `withAuth(req, handler)`

Eventos de log:
- `api.request` (info)
- `api.unauthorized` (warn)
- `api.forbidden` (warn)
- `api.error` (error)

### 3) Buffer in-memory de requests (para triagem rápida)
- Guarda as últimas ocorrências e permite listar os **mais lentos**.
- Observação: por ser in-memory, **reseta** ao reiniciar o container ou escalar réplicas.

### 4) Endpoint admin de diagnóstico
- `GET /api/admin/diagnostics/requests`
- Query params:
  - `limit` (default 50, max 500)
  - `minMs` (default 200)
  - `sinceMinutes` (default 30)

---

## Como validar em produção (Coolify)

### Validar logs
1. Executar operações comuns no sistema (login, navegação, ações em APIs admin).
2. Verificar logs do serviço no Coolify e filtrar por `requestId` / `api.request`.

### Validar endpoint de diagnóstico
Chamar:
- `/api/admin/diagnostics/requests?minMs=200&sinceMinutes=30&limit=50`

Resultado esperado:
- Lista com `durationMs` ordenada do maior para o menor.

---

## Próximos passos desta onda (hardening)
- Propagar `x-request-id` na resposta (para o frontend e troubleshooting). ✅
- Adicionar `Server-Timing: app;dur=<ms>` (facilita inspeção em devtools). ✅
- Definir “slow threshold” configurável (ex.: `OBS_SLOW_MS`) e logar `api.slow`. ✅

### Variáveis de ambiente
- `OBS_SLOW_MS` (opcional): a partir de quantos ms um request vira `api.slow` (default: 1500)

---

## Considerações específicas (Linux + Coolify + SQL Server)
- **Logs JSON** são o melhor “MVP” de observabilidade em container sem stack externa (ELK/Datadog).
- **In-memory buffer** é intencionalmente simples para diagnóstico rápido; para histórico, usar agregador de logs.
- **SQL Server**: próxima etapa é usar esses sinais para escolher as queries/rotas com maior impacto antes de mexer em índices/SSRM.

