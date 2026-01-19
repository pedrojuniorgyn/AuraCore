# API Reference - Módulo Strategic

## Base URL

```
/api/strategic
```

## Autenticação

Todas as rotas requerem autenticação via NextAuth.js.

```
Header: Authorization: Bearer <token>
Cookie: next-auth.session-token
```

## Multi-Tenancy

Todas as rotas filtram automaticamente por:
- `organizationId`: Da sessão do usuário
- `branchId`: Da sessão do usuário

---

## Strategies

### GET /strategies

Lista estratégias da organização.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| status | string | No | - | Filtrar por status (DRAFT, ACTIVE, ARCHIVED) |
| page | number | No | 1 | Página |
| pageSize | number | No | 20 | Itens por página (max: 100) |

**Response 200:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Planejamento Estratégico 2026",
      "vision": "Ser referência em logística...",
      "mission": "Entregar excelência...",
      "values": ["Integridade", "Inovação", "Excelência"],
      "status": "ACTIVE",
      "startDate": "2026-01-01",
      "endDate": "2026-12-31",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### POST /strategies

Cria nova estratégia.

**Request Body:**

```json
{
  "name": "Planejamento Estratégico 2026",
  "vision": "Ser referência em logística na América Latina",
  "mission": "Entregar excelência operacional com inovação",
  "values": ["Integridade", "Inovação", "Excelência"],
  "startDate": "2026-01-01",
  "endDate": "2026-12-31"
}
```

**Response 201:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Planejamento Estratégico 2026",
  "status": "DRAFT"
}
```

### GET /strategies/:id

Retorna detalhes de uma estratégia.

### PUT /strategies/:id

Atualiza estratégia.

### POST /strategies/:id/activate

Ativa estratégia (muda status de DRAFT para ACTIVE).

**Response 200:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ACTIVE",
  "activatedAt": "2026-01-20T14:30:00Z"
}
```

### POST /strategies/:id/archive

Arquiva estratégia.

---

## Goals (Objetivos Estratégicos)

### GET /goals

Lista objetivos estratégicos.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| strategyId | string | No | Filtrar por estratégia |
| perspectiveCode | string | No | FIN, CLI, INT, LRN |
| cascadeLevel | string | No | CEO, DIRECTOR, MANAGER, TEAM |
| status | string | No | Filtrar por status |
| parentGoalId | string | No | Filtrar por meta pai |
| ownerUserId | string | No | Filtrar por responsável |
| page | number | No | Página (default: 1) |
| pageSize | number | No | Itens por página (default: 20) |

**Response 200:**

```json
{
  "items": [
    {
      "id": "goal-uuid",
      "code": "FIN-001",
      "description": "Aumentar EBITDA em 15%",
      "perspectiveCode": "FIN",
      "perspectiveName": "Financeira",
      "cascadeLevel": "CEO",
      "targetValue": 15,
      "currentValue": 11.2,
      "progress": 74.67,
      "unit": "%",
      "weight": 40,
      "status": "ON_TRACK",
      "ownerUserId": "user-uuid",
      "ownerName": "João Silva",
      "startDate": "2026-01-01",
      "dueDate": "2026-12-31"
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 20
}
```

### POST /goals

Cria novo objetivo.

**Request Body:**

```json
{
  "strategyId": "strategy-uuid",
  "perspectiveCode": "FIN",
  "parentGoalId": null,
  "description": "Aumentar EBITDA em 15%",
  "cascadeLevel": "CEO",
  "targetValue": 15,
  "unit": "%",
  "weight": 40,
  "ownerUserId": "user-uuid",
  "ownerBranchId": 1,
  "startDate": "2026-01-01",
  "dueDate": "2026-12-31"
}
```

**Response 201:**

```json
{
  "id": "goal-uuid",
  "code": "FIN-001",
  "description": "Aumentar EBITDA em 15%",
  "status": "NOT_STARTED"
}
```

### PUT /goals/:id

Atualiza objetivo.

### PUT /goals/:id/progress

Atualiza progresso do objetivo.

**Request Body:**

```json
{
  "currentValue": 12.5
}
```

### POST /goals/:id/link-cause-effect

Vincula relação causa-efeito entre objetivos.

**Request Body:**

```json
{
  "effectGoalId": "uuid-da-meta-efeito"
}
```

**Response 201:**

```json
{
  "causeGoalId": "uuid-causa",
  "effectGoalId": "uuid-efeito",
  "createdAt": "2026-01-20T14:30:00Z"
}
```

### POST /goals/:id/cascade

Desdobra meta para nível inferior.

**Request Body:**

```json
{
  "childGoals": [
    {
      "description": "Aumentar receita Filial SP em 20%",
      "ownerUserId": "user-uuid-1",
      "ownerBranchId": 2,
      "weight": 40,
      "targetValue": 20
    },
    {
      "description": "Aumentar receita Filial RJ em 15%",
      "ownerUserId": "user-uuid-2",
      "ownerBranchId": 3,
      "weight": 30,
      "targetValue": 15
    },
    {
      "description": "Reduzir custos operacionais em 10%",
      "ownerUserId": "user-uuid-3",
      "ownerBranchId": 1,
      "weight": 30,
      "targetValue": 10
    }
  ]
}
```

**Response 201:**

```json
{
  "parentGoalId": "parent-uuid",
  "childGoals": [
    { "id": "child-1-uuid", "code": "FIN-001-01" },
    { "id": "child-2-uuid", "code": "FIN-001-02" },
    { "id": "child-3-uuid", "code": "FIN-001-03" }
  ]
}
```

### GET /goals/:id/map-position

Retorna posição no mapa estratégico.

### PUT /goals/:id/map-position

Atualiza posição no mapa.

**Request Body:**

```json
{
  "x": 250,
  "y": 100
}
```

---

## KPIs

### GET /kpis

Lista indicadores.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| goalId | string | No | Filtrar por objetivo |
| sourceType | string | No | MANUAL, FINANCIAL, TMS, WMS |
| status | string | No | GREEN, YELLOW, RED |
| page | number | No | Página |
| pageSize | number | No | Itens por página |

### POST /kpis

Cria novo indicador.

**Request Body:**

```json
{
  "goalId": "goal-uuid",
  "code": "FIN-EBITDA",
  "name": "EBITDA",
  "description": "Earnings Before Interest, Taxes, Depreciation, and Amortization",
  "unit": "R$",
  "polarity": "UP",
  "targetValue": 5000000,
  "alertThreshold": 10,
  "criticalThreshold": 20,
  "sourceType": "FINANCIAL",
  "sourceConfig": {
    "kpiCode": "FIN_EBITDA"
  },
  "frequency": "MONTHLY"
}
```

### PUT /kpis/:id

Atualiza indicador.

### PUT /kpis/:id/value

Atualiza valor do KPI (para KPIs manuais).

**Request Body:**

```json
{
  "value": 4750000,
  "periodDate": "2026-01-31",
  "notes": "Fechamento mensal"
}
```

**Response 200:**

```json
{
  "id": "kpi-uuid",
  "previousValue": 4500000,
  "newValue": 4750000,
  "status": "YELLOW",
  "variancePercent": -5.0
}
```

### GET /kpis/:id/history

Retorna histórico do KPI.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| periods | number | No | Número de períodos (default: 12) |

**Response 200:**

```json
{
  "kpiId": "kpi-uuid",
  "kpiCode": "FIN-EBITDA",
  "history": [
    { "value": 4200000, "date": "2025-11-30", "status": "YELLOW" },
    { "value": 4500000, "date": "2025-12-31", "status": "GREEN" },
    { "value": 4750000, "date": "2026-01-31", "status": "YELLOW" }
  ],
  "trend": "UP",
  "predictedValue": 5100000
}
```

---

## Action Plans (Planos de Ação)

### GET /action-plans

Lista planos de ação.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| goalId | string | No | Filtrar por objetivo |
| pdcaCycle | string | No | PLAN, DO, CHECK, ACT |
| status | string | No | OPEN, CLOSED |
| isOverdue | boolean | No | Filtrar atrasados |
| responsibleUserId | string | No | Filtrar por responsável |

### POST /action-plans

Cria plano de ação 5W2H.

**Request Body:**

```json
{
  "goalId": "goal-uuid",
  "what": "Implementar novo sistema de rastreamento GPS",
  "why": "Melhorar visibilidade das entregas e reduzir reclamações",
  "where": "Filial São Paulo",
  "whenStart": "2026-02-01",
  "whenEnd": "2026-03-31",
  "who": "user-uuid",
  "how": "1. Selecionar fornecedor\n2. Implementar integração\n3. Treinar equipe\n4. Go-live",
  "howMuchAmount": 50000,
  "howMuchCurrency": "BRL"
}
```

**Response 201:**

```json
{
  "id": "action-plan-uuid",
  "code": "AP-2026-042",
  "pdcaCycle": "PLAN",
  "status": "OPEN"
}
```

### GET /action-plans/:id

Retorna detalhes do plano.

### PUT /action-plans/:id

Atualiza plano.

### PUT /action-plans/:id/progress

Atualiza progresso.

**Request Body:**

```json
{
  "completionPercent": 45
}
```

### POST /action-plans/:id/advance-pdca

Avança ciclo PDCA.

**Response 200:**

```json
{
  "id": "action-plan-uuid",
  "previousCycle": "PLAN",
  "currentCycle": "DO",
  "advancedAt": "2026-02-10T09:00:00Z"
}
```

### GET /action-plans/:id/timeline

Retorna timeline de reproposições.

**Response 200:**

```json
{
  "actionPlanId": "current-uuid",
  "timeline": [
    {
      "id": "original-uuid",
      "code": "AP-2026-042",
      "repropositionNumber": 0,
      "status": "CLOSED",
      "outcome": "FAILURE",
      "closedAt": "2026-03-15"
    },
    {
      "id": "reprop-1-uuid",
      "code": "AP-2026-042-R1",
      "repropositionNumber": 1,
      "status": "CLOSED",
      "outcome": "FAILURE",
      "closedAt": "2026-04-20"
    },
    {
      "id": "current-uuid",
      "code": "AP-2026-042-R2",
      "repropositionNumber": 2,
      "status": "OPEN",
      "pdcaCycle": "DO"
    }
  ],
  "accumulatedCost": 85000
}
```

### POST /action-plans/:id/close

Fecha plano de ação.

**Request Body:**

```json
{
  "outcome": "SUCCESS",
  "notes": "Implementação concluída com sucesso"
}
```

---

## Follow-ups

### GET /action-plans/:id/follow-ups

Lista follow-ups do plano.

**Response 200:**

```json
{
  "actionPlanId": "action-plan-uuid",
  "followUps": [
    {
      "id": "follow-up-uuid",
      "followUpNumber": 1,
      "followUpDate": "2026-02-15",
      "gembaLocal": "Galpão 3 - Doca de expedição",
      "gembutsuObservation": "Sistema de etiquetas funcionando parcialmente",
      "genjitsuData": "7 de 10 pedidos com etiqueta correta",
      "executionStatus": "EXECUTED_PARTIAL",
      "executionPercent": 70,
      "problemsObserved": "Impressora de etiquetas com defeito intermitente",
      "problemSeverity": "MEDIUM",
      "requiresNewPlan": false,
      "verifiedBy": "user-uuid",
      "verifiedAt": "2026-02-15T14:30:00Z",
      "evidenceUrls": ["https://storage.../photo1.jpg"]
    }
  ]
}
```

### POST /action-plans/:id/follow-ups

Registra follow-up 3G.

**Request Body:**

```json
{
  "followUpDate": "2026-02-15",
  "gembaLocal": "Galpão 3 - Doca de expedição",
  "gembutsuObservation": "Sistema de etiquetas não estava funcionando",
  "genjitsuData": "3 de 10 pedidos sem etiqueta correta",
  "executionStatus": "EXECUTED_PARTIAL",
  "executionPercent": 70,
  "problemsObserved": "Impressora de etiquetas com defeito",
  "problemSeverity": "MEDIUM",
  "requiresNewPlan": true,
  "newPlanDescription": "Substituir impressora de etiquetas e treinar operadores",
  "newPlanAssignedTo": "user-uuid-2"
}
```

**Response 201:**

```json
{
  "followUpId": "follow-up-uuid",
  "followUpNumber": 2,
  "repropositionCreated": true,
  "newActionPlanId": "new-plan-uuid",
  "newActionPlanCode": "AP-2026-042-R1"
}
```

### POST /action-plans/:id/repropose

Cria reproposição manualmente.

**Request Body:**

```json
{
  "reason": "Prazo insuficiente para conclusão",
  "assignedTo": "user-uuid",
  "newWhenEnd": "2026-04-30"
}
```

---

## Ideas (Banco de Ideias)

### GET /ideas

Lista ideias.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | No | DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CONVERTED |
| category | string | No | Filtrar por categoria |
| submittedBy | string | No | Filtrar por autor |
| urgency | string | No | LOW, MEDIUM, HIGH |
| importance | string | No | LOW, MEDIUM, HIGH |

### POST /ideas

Submete nova ideia.

**Request Body:**

```json
{
  "title": "Implementar chatbot para atendimento ao cliente",
  "description": "Usar IA para responder dúvidas frequentes e liberar equipe para casos complexos",
  "category": "INNOVATION",
  "urgency": "MEDIUM",
  "importance": "HIGH",
  "estimatedImpact": "HIGH",
  "estimatedCostAmount": 25000,
  "estimatedCostCurrency": "BRL",
  "estimatedBenefitAmount": 100000,
  "estimatedBenefitCurrency": "BRL"
}
```

**Response 201:**

```json
{
  "id": "idea-uuid",
  "code": "IDEA-2026-015",
  "status": "SUBMITTED"
}
```

### PUT /ideas/:id/review

Analisa ideia (aprovar/rejeitar).

**Request Body:**

```json
{
  "approved": true,
  "notes": "Excelente ideia. Aprovar para implementação no Q2."
}
```

### POST /ideas/:id/convert

Converte ideia aprovada.

**Request Body:**

```json
{
  "convertTo": "ACTION_PLAN",
  "additionalData": {
    "goalId": "goal-uuid",
    "whenStart": "2026-04-01",
    "whenEnd": "2026-06-30",
    "who": "user-uuid"
  }
}
```

**Response 201:**

```json
{
  "ideaId": "idea-uuid",
  "convertedTo": "ACTION_PLAN",
  "convertedEntityId": "action-plan-uuid",
  "convertedEntityCode": "AP-2026-055"
}
```

---

## War Room

### GET /war-room/dashboard

Retorna dados do dashboard (snapshot).

**Response 200:**

```json
{
  "kpis": [
    {
      "id": "kpi-uuid",
      "code": "FIN-EBITDA",
      "name": "EBITDA",
      "currentValue": 4750000,
      "targetValue": 5000000,
      "status": "YELLOW",
      "trend": "UP",
      "variancePercent": -5.0
    }
  ],
  "alerts": [
    {
      "id": "alert-uuid",
      "type": "KPI_CRITICAL",
      "severity": "HIGH",
      "message": "OTD Filial SP abaixo de 90% há 5 dias",
      "entityId": "kpi-uuid-2",
      "createdAt": "2026-01-20T10:00:00Z"
    }
  ],
  "overduePlans": 3,
  "goalsAtRisk": 2
}
```

### GET /war-room/stream

SSE stream para atualizações real-time.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| meetingId | string | No | ID da reunião (se em reunião) |

**Response:** SSE Stream

```
event: INITIAL_STATE
data: {"kpis": [...], "alerts": [...], "participants": [...]}

event: KPI_UPDATE
data: {"kpiId": "uuid", "value": 95.5, "status": "GREEN"}

event: ALERT
data: {"type": "KPI_CRITICAL", "message": "...", "severity": "HIGH"}

event: PARTICIPANT_JOIN
data: {"userId": "uuid", "name": "João Silva"}

event: DECISION_RECORDED
data: {"decisionId": "uuid", "text": "Aprovar investimento..."}
```

---

## Meetings (Reuniões)

### GET /meetings

Lista reuniões.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| strategyId | string | No | Filtrar por estratégia |
| meetingType | string | No | BOARD, DIRECTOR, MANAGER |
| status | string | No | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| from | string | No | Data início (ISO) |
| to | string | No | Data fim (ISO) |

### POST /meetings

Agenda reunião.

**Request Body:**

```json
{
  "strategyId": "strategy-uuid",
  "meetingType": "DIRECTOR",
  "title": "Reunião de Acompanhamento - Janeiro",
  "description": "Revisão mensal de KPIs e planos de ação",
  "scheduledAt": "2026-01-25T14:00:00Z",
  "scheduledDuration": 60
}
```

### GET /meetings/generate-agenda

Gera pauta automática.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| meetingType | string | Yes | BOARD, DIRECTOR, MANAGER |
| meetingDate | string | Yes | Data da reunião (ISO) |

**Response 200:**

```json
{
  "items": [
    {
      "type": "FIXED",
      "title": "Abertura",
      "description": "Boas-vindas e validação de presença",
      "duration": 5,
      "order": 1
    },
    {
      "type": "AUTOMATIC",
      "title": "⚠️ KPI OTD-SP em estado crítico",
      "description": "OTD está em vermelho há 5 dias",
      "sourceType": "KPI_ALERT",
      "sourceEntityId": "kpi-uuid",
      "duration": 10,
      "order": 2
    }
  ],
  "totalDuration": 55,
  "generatedAt": "2026-01-24T10:00:00Z"
}
```

### POST /meetings/:id/start

Inicia reunião.

**Response 200:**

```json
{
  "meetingId": "meeting-uuid",
  "status": "IN_PROGRESS",
  "startedAt": "2026-01-25T14:02:00Z"
}
```

### POST /meetings/:id/advance-agenda

Avança para próximo item da pauta.

### POST /meetings/:id/decisions

Registra decisão.

**Request Body:**

```json
{
  "text": "Aprovar investimento de R$ 50.000 em novo sistema de rastreamento",
  "responsibleUserId": "user-uuid",
  "dueDate": "2026-02-28"
}
```

### POST /meetings/:id/end

Encerra reunião.

### GET /meetings/:id/minutes

Retorna ata da reunião.

**Response 200:**

```json
{
  "meetingId": "meeting-uuid",
  "title": "Reunião de Acompanhamento - Janeiro",
  "date": "2026-01-25",
  "duration": 58,
  "participants": [
    { "name": "João Silva", "role": "CHAIR" },
    { "name": "Maria Santos", "role": "PARTICIPANT" }
  ],
  "agendaItems": [
    { "title": "Abertura", "status": "COMPLETED" },
    { "title": "KPI OTD-SP", "status": "COMPLETED" }
  ],
  "decisions": [
    {
      "text": "Aprovar investimento de R$ 50.000...",
      "responsible": "Pedro Jr.",
      "dueDate": "2026-02-28"
    }
  ],
  "generatedAt": "2026-01-25T15:05:00Z"
}
```

---

## SWOT

### GET /swot-analyses

Lista análises SWOT.

### POST /swot-analyses

Cria nova análise.

**Request Body:**

```json
{
  "strategyId": "strategy-uuid",
  "title": "Análise SWOT Q1 2026"
}
```

### POST /swot-analyses/:id/items

Adiciona item.

**Request Body:**

```json
{
  "quadrant": "STRENGTH",
  "text": "Equipe técnica altamente qualificada",
  "impact": 8
}
```

### PUT /swot-analyses/:id/items/:itemId/priority

Atualiza prioridade.

**Request Body:**

```json
{
  "priority": 1
}
```

### POST /swot-analyses/:id/complete

Finaliza análise.

### POST /swot-analyses/:id/convert-to-plans

Converte itens em planos de ação.

**Request Body:**

```json
{
  "items": [
    { "itemId": "item-1-uuid", "goalId": "goal-uuid" },
    { "itemId": "item-2-uuid", "goalId": "goal-uuid" }
  ]
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Campo 'description' é obrigatório",
  "details": [
    { "field": "description", "message": "Required" }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "UNAUTHORIZED",
  "message": "Sessão expirada"
}
```

### 403 Forbidden

```json
{
  "error": "FORBIDDEN",
  "message": "Sem permissão para strategic:goal:cascade"
}
```

### 404 Not Found

```json
{
  "error": "NOT_FOUND",
  "message": "Objetivo não encontrado",
  "entityType": "StrategicGoal",
  "entityId": "goal-uuid"
}
```

### 409 Conflict

```json
{
  "error": "CONFLICT",
  "message": "Limite de 3 reproposições atingido"
}
```

### 500 Internal Server Error

```json
{
  "error": "INTERNAL_ERROR",
  "message": "Erro interno do servidor",
  "traceId": "abc123"
}
```
