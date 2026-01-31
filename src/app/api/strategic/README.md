# Strategic Module API v2

## Overview
API para gestão estratégica enterprise com BSC, PDCA, GEROT.

## Authentication
Todas as rotas requerem Bearer token no header:
```
Authorization: Bearer <token>
```

## Multi-tenancy
Todas as operações são automaticamente filtradas por:
- organizationId (extraído do token)
- branchId (extraído do token)

## Endpoints

### Strategy
- `GET /api/strategic/strategies` - Listar
- `POST /api/strategic/strategies` - Criar
- `GET /api/strategic/strategies/:id` - Detalhes
- `POST /api/strategic/strategies/:id/activate` - Ativar
- `GET /api/strategic/strategies/:id/versions` - Versões (Task 04)
- `POST /api/strategic/strategies/:id/versions` - Criar versão (Task 04)

### Goals (BSC)
- `GET /api/strategic/goals` - Listar
- `POST /api/strategic/goals` - Criar
- `GET /api/strategic/goals/:id` - Detalhes
- `POST /api/strategic/goals/:id/cascade` - Cascatear
- `GET /api/strategic/goals/tree` - Árvore hierárquica

### KPIs
- `GET /api/strategic/kpis` - Listar
- `POST /api/strategic/kpis` - Criar
- `GET /api/strategic/kpis/:id` - Detalhes
- `POST /api/strategic/kpis/:id/value` - Registrar valor
- `GET /api/strategic/kpis/:id/history` - Histórico

### Action Plans (5W2H/PDCA)
- `GET /api/strategic/action-plans` - Listar
- `POST /api/strategic/action-plans` - Criar
- `GET /api/strategic/action-plans/:id` - Detalhes
- `PATCH /api/strategic/action-plans/:id/status` - Atualizar status
- `POST /api/strategic/action-plans/:id/follow-up` - Registrar follow-up
- `GET /api/strategic/action-plans/kanban` - Kanban view

### GEROT
- `GET /api/strategic/control-items` - Itens de Controle
- `GET /api/strategic/verification-items` - Itens de Verificação
- `GET /api/strategic/anomalies` - Anomalias
- `POST /api/strategic/anomalies/:id/analyze` - Análise 5 Porquês

### Standard Procedures
- `GET /api/strategic/standard-procedures` - Listar
- `POST /api/strategic/standard-procedures` - Criar
- `POST /api/strategic/standard-procedures/:id/approve` - Aprovar
- `POST /api/strategic/standard-procedures/:id/revision` - Nova revisão

### Analytics (Fase 4)
- `GET /api/strategic/dashboard/bsc` - Dashboard BSC (Task 05)
- `GET /api/strategic/analytics/time-intelligence` - Time Intelligence (Task 02)
- `GET /api/strategic/analytics/variance` - Variance Analysis (Task 03)
- `GET /api/strategic/audit-history` - Audit Trail

## Error Responses
```json
{
  "error": "Error message",
  "details": { ... }
}
```

## Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Fase 4 Features

### Task 01: SQL Views
Views SQL otimizadas para performance:
- `vw_strategic_goals_summary` - Resumo por perspectiva
- `vw_kpi_performance` - Performance de KPIs
- `vw_action_plans_kanban` - Kanban de planos
- `vw_control_items_status` - Status de controle
- `vw_anomalies_summary` - Resumo de anomalias

### Task 02: Time Intelligence
Análises temporais com comparações período-a-período:
```
GET /api/strategic/analytics/time-intelligence?metric=kpi&entityId={uuid}&period=MTD&comparison=MoM
```
- Períodos: YTD, MTD, QTD
- Comparações: YoY, MoM, QoQ

### Task 03: Variance Analysis
Análise ACTUAL vs BUDGET vs FORECAST:
```
GET /api/strategic/analytics/variance?year=2026&month=1
POST /api/strategic/analytics/variance
```
- Status: FAVORABLE, ACCEPTABLE, UNFAVORABLE
- Variância percentual automática

### Task 04: Strategy Versioning
Versionamento de estratégia para planejamento:
```
POST /api/strategic/strategies/{id}/versions
{
  "versionType": "BUDGET",
  "versionName": "Orçamento 2026"
}
```
- Tipos: ACTUAL, BUDGET, FORECAST, SCENARIO
- Lock/unlock mechanism
- Promote to actual

### Task 05: Dashboard BSC Completo
Dashboard executivo integrando todas as features:
```
GET /api/strategic/dashboard/bsc?period=YTD&comparison=YoY
```
- Perspectivas BSC
- KPIs top/bottom performers
- Action Plans com tendências
- GEROT status
- Variance summary

## Documentation
- Swagger UI: `/docs`
- OpenAPI Spec: `/api/docs`
