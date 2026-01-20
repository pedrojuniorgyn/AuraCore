# 📡 API Reference - Módulo Strategic

Documentação dos endpoints da API do módulo Strategic.

## Base URL

```
/api/strategic
```

## Autenticação

Todos os endpoints requerem autenticação via sessão Next-Auth. Headers são automaticamente gerenciados pelo cliente.

## Multi-Tenancy

Todos os endpoints filtram automaticamente por `organizationId` e `branchId` do usuário autenticado.

---

## Dashboard

### GET /api/strategic/dashboard/data

Retorna dados agregados do dashboard.

**Response:**

```json
{
  "healthScore": 72,
  "previousHealthScore": 68,
  "lastUpdate": "2026-01-20T10:30:00Z",
  "alerts": [
    {
      "id": "alert-1",
      "type": "kpi",
      "message": "OTD abaixo da meta",
      "severity": "critical",
      "kpiId": "kpi-123"
    }
  ],
  "perspectives": [
    {
      "name": "Financeiro",
      "total": 10,
      "achieved": 7,
      "onTrack": 2,
      "critical": 1
    }
  ],
  "actions": [
    {
      "id": "action-1",
      "title": "Revisar processo de expedição",
      "dueDate": "2026-01-25",
      "status": "in-progress",
      "priority": "high"
    }
  ],
  "trendData": [
    { "date": "2026-01-15", "value": 68 },
    { "date": "2026-01-16", "value": 70 },
    { "date": "2026-01-17", "value": 72 }
  ]
}
```

**Cache:** 60 segundos (tag: `strategic-dashboard`)

---

### GET /api/strategic/dashboard/layout

Retorna layout customizado do usuário.

**Response:**

```json
{
  "widgets": [
    { "i": "health-score", "type": "health-score", "x": 0, "y": 0, "w": 1, "h": 2 },
    { "i": "alerts", "type": "alerts", "x": 1, "y": 0, "w": 1, "h": 2 },
    { "i": "kpi-summary", "type": "kpi-summary", "x": 2, "y": 0, "w": 1, "h": 2 }
  ]
}
```

---

### PUT /api/strategic/dashboard/layout

Salva layout customizado do usuário.

**Request:**

```json
{
  "widgets": [
    { "i": "health-score", "type": "health-score", "x": 0, "y": 0, "w": 1, "h": 2 }
  ]
}
```

**Response:**

```json
{
  "success": true
}
```

---

## KPIs

### GET /api/strategic/kpis

Lista KPIs com paginação e filtros.

**Query Parameters:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | number | Página (default: 1) |
| `pageSize` | number | Itens por página (default: 20, max: 100) |
| `perspective` | string | Filtrar por perspectiva BSC |
| `status` | string | Filtrar por status (critical/warning/on-track/achieved) |
| `search` | string | Busca por nome ou código |

**Response:**

```json
{
  "items": [
    {
      "id": "kpi-123",
      "code": "OTD-001",
      "name": "Taxa de Entrega no Prazo",
      "perspective": "customer",
      "currentValue": 92,
      "targetValue": 95,
      "unit": "%",
      "status": "warning",
      "trend": "up",
      "lastMeasurement": "2026-01-20T08:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 20,
  "hasMore": true
}
```

**Cache:** 5 minutos (tag: `strategic-kpis`)

---

### GET /api/strategic/kpis/:id

Retorna detalhes de um KPI específico.

**Response:**

```json
{
  "id": "kpi-123",
  "code": "OTD-001",
  "name": "Taxa de Entrega no Prazo",
  "description": "Percentual de entregas realizadas no prazo acordado",
  "perspective": "customer",
  "currentValue": 92,
  "targetValue": 95,
  "minValue": 85,
  "maxValue": 100,
  "unit": "%",
  "frequency": "daily",
  "responsibleId": "user-456",
  "responsibleName": "João Silva",
  "status": "warning",
  "trend": "up",
  "measurements": [
    { "date": "2026-01-20", "value": 92 },
    { "date": "2026-01-19", "value": 90 },
    { "date": "2026-01-18", "value": 88 }
  ],
  "linkedGoals": [
    { "id": "goal-1", "name": "Excelência Operacional" }
  ],
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-20T08:00:00Z"
}
```

---

### POST /api/strategic/kpis

Cria novo KPI.

**Request:**

```json
{
  "code": "OTD-002",
  "name": "Taxa de Satisfação do Cliente",
  "description": "NPS mensal",
  "perspective": "customer",
  "targetValue": 70,
  "minValue": 0,
  "maxValue": 100,
  "unit": "pontos",
  "frequency": "monthly",
  "responsibleId": "user-789"
}
```

**Response:**

```json
{
  "id": "kpi-new",
  "code": "OTD-002",
  "name": "Taxa de Satisfação do Cliente",
  "status": "on-track",
  "createdAt": "2026-01-20T12:00:00Z"
}
```

**Status:** 201 Created

---

### PUT /api/strategic/kpis/:id

Atualiza KPI existente.

---

### POST /api/strategic/kpis/:id/measurements

Registra nova medição para um KPI.

**Request:**

```json
{
  "value": 93,
  "date": "2026-01-20",
  "notes": "Melhoria após treinamento da equipe"
}
```

---

### DELETE /api/strategic/kpis/:id

Soft delete de KPI.

---

## Planos de Ação

### GET /api/strategic/action-plans

Lista planos de ação.

**Query Parameters:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | number | Página |
| `pageSize` | number | Itens por página |
| `status` | string | pending/in-progress/completed/overdue |
| `priority` | string | low/medium/high/critical |
| `responsibleId` | string | Filtrar por responsável |

**Response:**

```json
{
  "items": [
    {
      "id": "plan-1",
      "title": "Melhorar processo de expedição",
      "status": "in-progress",
      "priority": "high",
      "progress": 60,
      "dueDate": "2026-02-28",
      "responsibleName": "Maria Santos",
      "linkedKpis": ["OTD-001"]
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 20
}
```

---

### POST /api/strategic/action-plans

Cria novo plano de ação com metodologia 5W2H.

**Request:**

```json
{
  "title": "Implementar rastreamento em tempo real",
  "what": "Sistema de GPS para frota",
  "why": "Reduzir atrasos e melhorar visibilidade",
  "where": "Centro de Distribuição SP",
  "when": "2026-02-28",
  "who": "user-123",
  "how": "Integrar sistema GPS ao dashboard de monitoramento",
  "howMuch": 50000,
  "priority": "high",
  "linkedKpiIds": ["kpi-123"]
}
```

---

### PUT /api/strategic/action-plans/:id/status

Atualiza status do plano.

**Request:**

```json
{
  "status": "completed",
  "completionNotes": "Implementação finalizada com sucesso"
}
```

---

## PDCA

### GET /api/strategic/pdca

Lista ciclos PDCA.

---

### POST /api/strategic/pdca

Cria novo ciclo PDCA.

**Request:**

```json
{
  "title": "Redução de custos operacionais",
  "objective": "Reduzir custos em 15%",
  "linkedKpiIds": ["kpi-456"]
}
```

---

### PUT /api/strategic/pdca/:id/phase

Avança fase do ciclo PDCA.

**Request:**

```json
{
  "phase": "do",
  "notes": "Iniciando execução das ações planejadas"
}
```

**Fases válidas:** `plan` → `do` → `check` → `act`

---

## Relatórios

### GET /api/strategic/reports

Lista relatórios configurados.

---

### POST /api/strategic/reports

Cria configuração de relatório.

**Request:**

```json
{
  "name": "Relatório Semanal de KPIs",
  "type": "pdf",
  "frequency": "weekly",
  "dayOfWeek": 1,
  "recipients": ["gestor@empresa.com", "diretor@empresa.com"],
  "sections": ["health-score", "kpi-summary", "action-plans"]
}
```

---

### POST /api/strategic/reports/:id/generate

Gera relatório sob demanda.

**Response:**

```json
{
  "success": true,
  "fileUrl": "/api/strategic/reports/downloads/report-123.pdf",
  "generatedAt": "2026-01-20T12:00:00Z"
}
```

---

## Integrações

### GET /api/strategic/integrations

Lista integrações configuradas.

**Response:**

```json
{
  "integrations": [
    {
      "id": "int-1",
      "type": "slack",
      "name": "Slack - Canal Estratégia",
      "isEnabled": true,
      "webhookUrl": "https://hooks.slack.com/...",
      "channel": "#estrategia",
      "lastSync": "2026-01-20T10:00:00Z"
    }
  ]
}
```

---

### PUT /api/strategic/integrations/:id

Atualiza configuração de integração.

---

### POST /api/strategic/integrations/:id/test

Testa conexão da integração.

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Conflito (ex: código duplicado) |
| 422 | Unprocessable Entity - Validação falhou |
| 500 | Internal Server Error |

**Formato de erro:**

```json
{
  "error": "Descrição do erro",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "targetValue", "message": "Deve ser maior que zero" }
  ]
}
```
