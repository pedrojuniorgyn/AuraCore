# Integrações Externas

**Status:** ✅ Implementado  
**Data:** 2026-02-03  
**Módulo:** Strategic  
**Complexidade:** Média

---

## 📋 VISÃO GERAL

Sistema completo de integrações com ferramentas externas para o módulo estratégico, seguindo arquitetura DDD/Hexagonal.

### Integrações Disponíveis

1. **Slack** - Notificações em tempo real sobre eventos estratégicos
2. **Power BI** - Export de dados em formato otimizado para análise
3. **Webhooks** - Integração customizada com sistemas externos

### Características

- 🔔 **Notificações em Tempo Real:** Eventos críticos notificados automaticamente
- 📊 **Export Power BI:** Dados estruturados para análise avançada
- 🔌 **Webhooks Customizáveis:** Envio de eventos para qualquer sistema
- 🏗️ **DDD-Compliant:** Services em application/, types em shared/
- 🔒 **Multi-tenancy:** Filtragem por organizationId + branchId
- 📝 **Type-Safe:** Interfaces TypeScript completas

---

## 🏗️ ARQUITETURA

### Camadas DDD

```
src/
├── modules/strategic/
│   ├── application/
│   │   └── services/
│   │       └── integrations/
│   │           └── SlackNotificationService.ts    # ← Service DDD
│   └── infrastructure/
│       └── di/
│           └── StrategicModule.ts                 # ← DI registration
├── lib/
│   └── integrations/
│       ├── slack.ts                                # ← Adapter Slack
│       └── integration-types.ts                    # ← Types compartilhados
└── app/api/
    ├── integrations/slack/notify/route.ts         # ← Slack API
    └── analytics/export/powerbi/route.ts          # ← Power BI API
```

### Componentes

| Componente | Responsabilidade | Camada |
|----|-----|---|
| `SlackNotificationService` | Orquestração de notificações | Application |
| `slack.ts` | Adapter para API do Slack | Infrastructure |
| `/api/integrations/slack/notify` | HTTP endpoint | Presentation |
| `/api/analytics/export/powerbi` | Export de dados | Presentation |

---

## 🔔 SLACK INTEGRATION

### Features

- ✅ Notificações de KPIs críticos
- ✅ Alertas de planos de ação atrasados
- ✅ Notificações de metas atingidas
- ✅ Formatação de mensagens (compact, detailed, rich)
- ✅ Suporte a Slack Blocks API
- ✅ Webhooks Incoming

### API Endpoint

```
POST /api/integrations/slack/notify
```

### Request Body (Genérico)

```typescript
{
  webhookUrl: string;               // URL do webhook Slack
  eventType: IntegrationEventType;  // Tipo de evento
  data: Record<string, unknown>;    // Dados do evento
  messageFormat?: 'compact' | 'detailed' | 'rich';
}
```

### Eventos Suportados

| Evento | Descrição | Ícone |
|--------|-----------|-------|
| `kpi.critical` | KPI atingiu valor crítico | 🚨 |
| `kpi.warning` | KPI em estado de atenção | ⚠️ |
| `kpi.target_achieved` | Meta do KPI atingida | 🎯 |
| `action_plan.overdue` | Plano de ação atrasado | ⏰ |
| `action_plan.completed` | Plano concluído | ✅ |
| `goal.achieved` | Meta estratégica atingida | 🏆 |
| `report.generated` | Relatório gerado | 📊 |

### Exemplos de Uso

#### 1. Notificação Genérica

```bash
curl -X POST http://localhost:3000/api/integrations/slack/notify \
  -H "Content-Type: application/json" \
  -H "Cookie: x-branch-id=1" \
  -d '{
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "eventType": "kpi.critical",
    "data": {
      "description": "KPI Receita está crítico",
      "message": "Valor atual: R$ 850k | Meta: R$ 1M",
      "link": "http://localhost:3000/strategic/kpis/abc123"
    },
    "messageFormat": "detailed"
  }'
```

#### 2. Notificação de KPI Crítico (Tipada)

```bash
curl -X POST 'http://localhost:3000/api/integrations/slack/notify?action=kpi-critical' \
  -H "Content-Type: application/json" \
  -H "Cookie: x-branch-id=1" \
  -d '{
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "kpiId": "kpi-uuid-here"
  }'
```

#### 3. Notificação de Plano Atrasado

```bash
curl -X POST 'http://localhost:3000/api/integrations/slack/notify?action=action-plan-overdue' \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "actionPlanId": "plan-uuid-here"
  }'
```

### Uso no Código (Service)

```typescript
import { SlackNotificationService } from '@/modules/strategic/application/services/integrations/SlackNotificationService';

// Resolver do DI
const service = container.resolve<SlackNotificationService>(
  STRATEGIC_TOKENS.SlackNotificationService
);

// Notificar KPI crítico
const result = await service.notifyKPICritical(
  kpiId,
  'https://hooks.slack.com/...',
  organizationId,
  branchId
);

if (Result.isOk(result)) {
  console.log('Notificação enviada:', result.value.sentAt);
}
```

### Formato das Mensagens

#### Compact
```
🚨 Alerta Crítico: KPI Receita está crítico
```

#### Detailed (Slack Blocks)
```
┌─────────────────────────────────────────┐
│ 🚨 Alerta Crítico                       │
├─────────────────────────────────────────┤
│ KPI Receita está crítico                │
│ Valor atual: R$ 850k | Meta: R$ 1M     │
│                                         │
│ [Ver detalhes →]                        │
└─────────────────────────────────────────┘
```

#### Rich (Attachments)
```
┌─────────────────────────────────────────┐
│ 🚨 KPI Crítico                          │
├─────────────────────────────────────────┤
│ KPI: REV-Q1                             │
│ Nome: Receita Bruta                     │
│ Atual: R$ 850k                          │
│ Meta: R$ 1M                             │
│                                         │
│ AuraCore Strategic • há 2 minutos       │
└─────────────────────────────────────────┘
```

---

## 📊 POWER BI INTEGRATION

### Features

- ✅ Export de KPIs completos
- ✅ Export de Metas Estratégicas
- ✅ Export de Estratégias
- ✅ Export de Planos de Ação
- ✅ Metadados (timestamp, contadores)
- ✅ Formato otimizado para Power BI

### API Endpoint

```
GET /api/analytics/export/powerbi
```

### Response Schema

```typescript
interface PowerBIExport {
  metadata: {
    exportedAt: string;
    organizationId: number;
    branchId: number;
    version: string;
    recordCounts: {
      kpis: number;
      goals: number;
      strategies: number;
      actionPlans: number;
    };
  };
  kpis: PowerBIKPI[];
  goals: PowerBIGoal[];
  strategies: PowerBIStrategy[];
  actionPlans: PowerBIActionPlan[];
}
```

### Exemplo de Request

```bash
curl -X GET http://localhost:3000/api/analytics/export/powerbi \
  -H "Cookie: x-branch-id=1" \
  -o powerbi_export.json
```

### Uso no Power BI

1. **Abrir Power BI Desktop**
2. **Obter Dados** → Web
3. **URL:** `https://your-app.com/api/analytics/export/powerbi`
4. **Adicionar Headers:**
   - `Cookie: x-branch-id=YOUR_BRANCH_ID`
5. **Carregar Dados**
6. **Criar Relacionamentos:**
   - `kpis.goalId` → `goals.id`
   - `goals.strategyId` → `strategies.id`
   - `actionPlans.goalId` → `goals.id`

### Dashboards Sugeridos (Power BI)

#### 1. BSC Dashboard
- **KPIs por Perspectiva** (tabela)
- **Taxa de Atingimento** (gauge)
- **Distribuição de Status** (donut)
- **Tendência Mensal** (line chart)

#### 2. Performance Dashboard
- **Top 10 KPIs** (bar chart)
- **Mapa de Calor** (matrix)
- **Evolução Temporal** (area chart)

#### 3. Execução Dashboard
- **Planos por Status** (stacked bar)
- **Taxa de Conclusão** (KPI card)
- **Planos Atrasados** (table)

---

## 🔌 WEBHOOKS

### Features

- ✅ Webhooks customizáveis
- ✅ Retry policy (3 ou 5 tentativas)
- ✅ Headers customizados
- ✅ Suporte a POST/PUT
- ✅ Secret para assinatura

### API Endpoints

```
GET /api/strategic/integrations/webhook   # Listar webhooks
POST /api/strategic/integrations/webhook  # Criar webhook
```

### Criar Webhook

```bash
curl -X POST http://localhost:3000/api/strategic/integrations/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "name": "KPI Alerts to External System",
    "url": "https://api.example.com/webhooks/aura",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN",
      "X-Custom-Header": "value"
    },
    "events": ["kpi.critical", "kpi.warning"],
    "retryPolicy": "3",
    "secret": "your-secret-key"
  }'
```

### Payload Enviado

```typescript
{
  event: 'kpi.critical';
  timestamp: '2026-02-03T13:30:00Z';
  organizationId: 1;
  data: {
    kpiId: 'abc-123';
    kpiCode: 'REV-Q1';
    kpiName: 'Receita Q1';
    currentValue: 850000;
    targetValue: 1000000;
    status: 'RED';
  };
  metadata: {
    triggeredBy: 'user-123';
    url: 'https://app.com/strategic/kpis/abc-123';
  };
}
```

---

## ✅ VALIDAÇÃO

### Testes Manuais

```bash
# 1. Testar Slack (genérico)
curl -X POST http://localhost:3000/api/integrations/slack/notify \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "YOUR_SLACK_WEBHOOK",
    "eventType": "kpi.critical",
    "data": {"description": "Test notification"}
  }'

# 2. Testar Slack (KPI específico)
curl -X POST 'http://localhost:3000/api/integrations/slack/notify?action=kpi-critical' \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "YOUR_WEBHOOK", "kpiId": "YOUR_KPI_ID"}'

# 3. Testar Power BI
curl http://localhost:3000/api/analytics/export/powerbi

# 4. Listar webhooks
curl http://localhost:3000/api/strategic/integrations/webhook
```

### Checklist
- [ ] Slack notificação genérica funciona
- [ ] Slack KPI crítico funciona
- [ ] Slack plano atrasado funciona
- [ ] Power BI export retorna JSON válido
- [ ] Power BI contém todos os campos
- [ ] Webhooks são listados corretamente
- [ ] Novo webhook pode ser criado

---

## 🚀 PRÓXIMOS PASSOS

### TODO Imediato
- [ ] Adicionar queue (Redis/BullMQ) para notificações assíncronas
- [ ] Implementar retry automático para Slack
- [ ] Cache de exports Power BI (evitar regenerar)
- [ ] Logs de integração no banco de dados

### TODO Futuro
- [ ] Google Sheets sync bidirecional
- [ ] Microsoft Teams integration
- [ ] Email notifications (SMTP)
- [ ] Push notifications (browser)
- [ ] Discord integration
- [ ] Tableau export
- [ ] API rate limiting por organização

---

## 📚 REFERÊNCIAS

- **Slack API:** https://api.slack.com/messaging/webhooks
- **Power BI REST API:** https://learn.microsoft.com/en-us/rest/api/power-bi/
- **Webhooks Best Practices:** https://webhooks.fyi
- **ADR-0015:** Arquitetura DDD/Hexagonal
- **E8.4:** Épico Strategic Module

---

**Gerado por:** AgenteAura ⚡  
**Última atualização:** 2026-02-03
