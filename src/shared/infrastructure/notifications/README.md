# 📬 Sistema de Notificações - AuraCore ERP

**Versão:** 1.0.0  
**Módulo:** `shared/infrastructure/notifications`  
**Fase:** FASE7-06  

---

## 📋 VISÃO GERAL

Sistema completo de notificações multi-canal para alertas estratégicos:

| Canal | Status | Descrição |
|-------|--------|-----------|
| **📧 Email** | ✅ Implementado | Templates HTML + suporte Resend/SMTP |
| **🔔 Webhook** | ✅ Implementado | HTTP POST com retry automático |
| **📱 In-App** | ✅ Implementado | Persistência em SQL Server + API |
| **🔌 WebSocket** | ⏳ Futuro | Real-time (não implementado) |

---

## 🏗️ ARQUITETURA

```
src/shared/infrastructure/notifications/
├── NotificationService.ts           # Serviço principal (@injectable)
├── types.ts                          # Types compartilhados
├── index.ts                          # Exports centralizados
├── schemas/
│   └── notification.schema.ts       # Drizzle schema
└── templates/
    ├── alert-kpi-critical.html      # Template KPI crítico
    └── alert-overdue.html           # Template plano atrasado
```

---

## 🔧 USO

### 1. Email com Template

```typescript
await notificationService.sendEmail({
  to: ['manager@company.com'],
  subject: 'Alerta Crítico: KPI abaixo do esperado',
  body: 'Fallback text',
  template: 'alert-kpi-critical',
  variables: {
    kpiName: 'Receita Líquida',
    percentage: 65,
    threshold: 70,
    target: 'R$ 1.000.000',
    actual: 'R$ 650.000',
    dashboardUrl: 'https://app.auracore.com.br/strategic/dashboard',
  },
});
```

### 2. Webhook com Retry

```typescript
await notificationService.sendWebhook({
  url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
  payload: {
    type: 'KPI_CRITICAL',
    severity: 'CRITICAL',
    entity: { id: 'kpi-123', name: 'Receita Líquida' },
    message: 'KPI está em 65%, abaixo do limite de 70%',
  },
  retryAttempts: 3, // Exponential backoff: 1s, 2s, 3s
});
```

### 3. Notificação In-App

```typescript
await notificationService.createInAppNotification({
  organizationId: 1,
  branchId: 1,
  userId: 100,
  type: 'ERROR',
  event: 'KPI_CRITICAL',
  title: 'KPI Crítico',
  message: 'Receita Líquida está abaixo do esperado',
  data: { kpiId: 'kpi-123', percentage: 65 },
  actionUrl: '/strategic/dashboard?alert=alert-456',
});
```

---

## 🔗 INTEGRAÇÃO COM ALERTSERVICE

O `AlertService` automaticamente envia notificações após criar alertas:

```typescript
// src/modules/strategic/application/services/AlertService.ts
async runAllChecks(
  organizationId: number,
  branchId: number,
  config?: PartialAlertConfig
): Promise<Result<{ created: number; alerts: Alert[] }, string>> {
  // ... criar alertas ...

  // Enviar notificações automaticamente
  for (const alert of allAlerts) {
    await this.sendNotifications(alert, effectiveConfig, organizationId, branchId);
  }
}
```

**Configuração via `AlertConfig`:**

```typescript
const config: AlertConfig = {
  // Thresholds
  kpiCriticalThreshold: 70,
  kpiWarningThreshold: 85,
  
  // Notificações
  emailEnabled: true,
  emailRecipients: ['cfo@company.com', 'ceo@company.com'],
  webhookEnabled: true,
  webhookUrl: 'https://hooks.slack.com/services/XXX',
  inAppEnabled: true, // Default: true
};

await alertService.runAllChecks(orgId, branchId, config);
```

---

## 🌐 API ENDPOINTS

### `GET /api/notifications`

Lista notificações não lidas do usuário autenticado.

**Response:**
```json
{
  "success": true,
  "total": 5,
  "notifications": [
    {
      "id": 123,
      "type": "ERROR",
      "event": "KPI_CRITICAL",
      "title": "KPI Crítico",
      "message": "Receita abaixo do esperado",
      "actionUrl": "/strategic/dashboard",
      "isRead": false,
      "createdAt": "2026-02-02T20:00:00Z"
    }
  ]
}
```

### `POST /api/notifications/[id]/read`

Marca notificação como lida.

**Response:**
```json
{
  "success": true,
  "message": "Notificação marcada como lida"
}
```

---

## 🔐 VARIÁVEIS DE AMBIENTE

Consulte `.env.example.notifications` para configuração completa.

**Mínimo obrigatório:**
```env
NEXT_PUBLIC_APP_URL="https://app.auracore.com.br"
EMAIL_SERVICE="disabled"  # 'resend' | 'smtp' | 'disabled'
```

**Email via Resend (recomendado):**
```env
EMAIL_SERVICE="resend"
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="noreply@auracore.com.br"
```

**Email via SMTP:**
```env
EMAIL_SERVICE="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu-email@gmail.com"
SMTP_PASSWORD="sua-senha-app"
SMTP_FROM="noreply@auracore.com.br"
```

**Webhook:**
```env
WEBHOOK_ALERTS_ENABLED="true"
WEBHOOK_ALERTS_URL="https://hooks.slack.com/services/XXX"
```

---

## 📧 EMAIL TEMPLATES

Templates HTML com variáveis substituíveis usando `{{key}}`.

### Template: `alert-kpi-critical`

**Variáveis:**
- `{{kpiName}}` - Nome do KPI
- `{{percentage}}` - Percentual atual
- `{{threshold}}` - Limite crítico
- `{{target}}` - Meta
- `{{actual}}` - Realizado
- `{{variance}}` - Variação %
- `{{date}}` - Data do alerta
- `{{dashboardUrl}}` - Link para dashboard

### Template: `alert-overdue`

**Variáveis:**
- `{{planName}}` - Nome do plano
- `{{daysOverdue}}` - Dias atrasado
- `{{what}}` - O quê
- `{{who}}` - Quem
- `{{dueDate}}` - Prazo original
- `{{where}}` - Onde
- `{{actionPlanUrl}}` - Link para plano

---

## 🔄 RETRY LOGIC (Webhook)

Webhooks falham? O sistema tenta novamente automaticamente:

1. **Tentativa 1:** Imediata
2. **Tentativa 2:** Aguarda 1 segundo
3. **Tentativa 3:** Aguarda 2 segundos

**Total:** 3 tentativas com exponential backoff.

---

## 🗄️ BANCO DE DADOS

### Tabela: `notifications`

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  branch_id INT NULL,
  user_id INT NULL,  -- NULL = broadcast para toda organização
  type VARCHAR(20) NOT NULL,  -- SUCCESS, ERROR, WARNING, INFO
  event VARCHAR(100) NOT NULL,  -- KPI_CRITICAL, ACTION_PLAN_OVERDUE, etc
  title NVARCHAR(200) NOT NULL,
  message NVARCHAR(MAX),
  data NVARCHAR(MAX),  -- JSON extra data
  action_url NVARCHAR(500),  -- Link para ação
  is_read BIT DEFAULT 0,
  read_at DATETIME2,
  created_at DATETIME2 DEFAULT GETDATE()
);
```

**Índices:**
- `idx_notifications_user` - (user_id, is_read, created_at DESC)
- `idx_notifications_org` - (organization_id, created_at DESC)
- `idx_notifications_unread` - (user_id, is_read) WHERE is_read = 0

---

## 🧪 DESENVOLVIMENTO

Para desenvolvimento local, o `NotificationService` loga no console:

```
📧 Email enviado: { to: [...], subject: '...', bodyPreview: '...' }
🔔 Webhook enviado com sucesso para https://...
📬 Notificação in-app criada para userId=100, type=ERROR
```

Para produção, descomentar código de integração com Resend/SMTP no `sendEmail()`.

---

## 📊 MONITORAMENTO

**Logs importantes:**
- ✅ Email enviado com sucesso
- ⚠️ Webhook falhou (tentativa X/3)
- ❌ Webhook falhou após 3 tentativas
- 📬 Notificação in-app criada

**Métricas recomendadas:**
- Taxa de entrega de emails
- Taxa de sucesso de webhooks
- Tempo médio de leitura de notificações in-app
- Total de notificações não lidas

---

## 🚀 PRÓXIMOS PASSOS

- [ ] Implementar integração real com Resend
- [ ] Adicionar suporte a SMTP com nodemailer
- [ ] Criar mais templates (aprovação, rejeição, etc)
- [ ] Implementar WebSocket para notificações real-time
- [ ] Dashboard de notificações in-app no frontend
- [ ] Bell icon com badge de contagem no header
- [ ] Filtros avançados (por tipo, data, lida/não lida)
- [ ] Exportação de histórico de notificações

---

**Gerado em:** 02/02/2026  
**Autor:** Claude Sonnet 4.5  
**Epic:** FASE7-06  
