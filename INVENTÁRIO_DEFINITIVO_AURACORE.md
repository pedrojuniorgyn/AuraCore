# 📋 INVENTÁRIO DEFINITIVO - AURACORE ENTERPRISE

**Data:** 08/12/2025  
**Versão:** 2.0 (Refinado)  
**Análise:** Crítica Profunda + Gaps Identificados + Roadmap Integrado

---

## 🎯 **METODOLOGIA DE ANÁLISE**

Para cada módulo, analisei:
1. ✅ **O que está implementado** (confirmado)
2. ❌ **O que você disse que falta** (seu planejamento)
3. 🔴 **Gaps críticos que você NÃO mencionou** (descobertos)
4. 🔧 **Melhorias técnicas necessárias** (arquitetura)
5. 📊 **Prioridade real** (negócio vs técnico)

---

## 1️⃣ **MÓDULO: CORE & INFRAESTRUTURA**

### **✅ O QUE ESTÁ BOM (Confirmado):**

| Funcionalidade | Status | Qualidade | Observação |
|----------------|--------|-----------|------------|
| Multi-Tenancy | ✅ 100% | ⭐⭐⭐⭐⭐ | Robusto, production-ready |
| Branch Scoping | ✅ 100% | ⭐⭐⭐⭐⭐ | Middleware funcional |
| Auth Híbrida | ✅ 100% | ⭐⭐⭐⭐ | Google + Credentials OK |
| Auditoria Básica | ✅ 80% | ⭐⭐⭐ | Falta audit_logs detalhado |
| Soft Delete | ✅ 100% | ⭐⭐⭐⭐⭐ | Global, bem implementado |
| Certificado A1 | ✅ 100% | ⭐⭐⭐⭐ | Funcional, falta validações |

---

### **🔴 GAPS CRÍTICOS (Que você NÃO mencionou):**

#### **GAP #1: Sistema de Permissões (RBAC) - CRÍTICO!**

**Problema:**
```
❌ Atualmente: Todos os usuários têm acesso TOTAL
❌ Gerente financeiro pode emitir CTe
❌ Operador TMS pode ver DRE
❌ Não há controle granular de ações
```

**Impacto:** 🔴 **ALTO**
- Risco de segurança (usuário deletar dados críticos)
- Não atende SOC 2 / ISO 27001
- Não escalável para crescimento

**Solução Técnica:**

```typescript
// Schema necessário:

export const roles = mssqlTable("roles", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  name: nvarchar("name", { length: 100 }).notNull(),
  // ADMIN, MANAGER, OPERATOR, VIEWER, FINANCIAL, COMMERCIAL
  
  description: nvarchar("description", { length: 500 }),
  isSystemRole: nvarchar("is_system_role", { length: 1 }).default("N"),
  // Roles de sistema não podem ser editadas
  
  ...enterpriseBase,
});

export const permissions = mssqlTable("permissions", {
  id: int("id").primaryKey().identity(),
  
  module: nvarchar("module", { length: 50 }).notNull(),
  // FINANCIAL, TMS, FLEET, COMMERCIAL, FISCAL
  
  resource: nvarchar("resource", { length: 50 }).notNull(),
  // accounts_payable, trips, vehicles, quotes, cte_header
  
  action: nvarchar("action", { length: 20 }).notNull(),
  // CREATE, READ, UPDATE, DELETE, APPROVE, CANCEL, EXPORT
  
  code: nvarchar("code", { length: 100 }).notNull().unique(),
  // Ex: "financial.accounts_payable.create"
  
  description: nvarchar("description", { length: 500 }),
});

export const rolePermissions = mssqlTable("role_permissions", {
  roleId: int("role_id").notNull(),
  permissionId: int("permission_id").notNull(),
  
  createdAt: datetime2("created_at").default(new Date()),
}, (t) => ([
  primaryKey({ columns: [t.roleId, t.permissionId] }),
]));

export const userRoles = mssqlTable("user_roles", {
  userId: nvarchar("user_id", { length: 255 }).notNull(),
  roleId: int("role_id").notNull(),
  branchId: int("branch_id"), // Opcional: role por filial
  
  createdAt: datetime2("created_at").default(new Date()),
}, (t) => ([
  primaryKey({ columns: [t.userId, t.roleId] }),
]));
```

**Middleware de Autorização:**

```typescript
// src/middleware/authorization.ts

export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await getServerSession(req);
    const userId = session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    // Buscar permissões do usuário
    const hasPermission = await checkUserPermission(userId, permissionCode);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: "Sem permissão",
        required: permissionCode 
      });
    }
    
    next();
  };
}

// Uso:
// app.post("/api/financial/accounts-payable", 
//   requirePermission("financial.accounts_payable.create"),
//   handler
// );
```

**Prioridade:** 🔴 **ALTA** (Implementar na Fase 2)

---

#### **GAP #2: Configurações por Organização - MÉDIO**

**Problema:**
```
❌ Logo da empresa hardcoded
❌ Timezone fixo (America/Sao_Paulo)
❌ Formato de data não personalizável
❌ Cores do tema não customizáveis
```

**Solução:**

```typescript
export const organizationSettings = mssqlTable("organization_settings", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull().unique(),
  
  // Branding
  companyLogo: nvarchar("company_logo", { length: 500 }),
  primaryColor: nvarchar("primary_color", { length: 7 }).default("#4F46E5"),
  secondaryColor: nvarchar("secondary_color", { length: 7 }).default("#10B981"),
  
  // Regional
  timezone: nvarchar("timezone", { length: 50 }).default("America/Sao_Paulo"),
  locale: nvarchar("locale", { length: 10 }).default("pt-BR"),
  currency: nvarchar("currency", { length: 3 }).default("BRL"),
  dateFormat: nvarchar("date_format", { length: 20 }).default("DD/MM/YYYY"),
  timeFormat: nvarchar("time_format", { length: 10 }).default("HH:mm"),
  
  // Fiscal
  taxRegime: nvarchar("tax_regime", { length: 20 }), // SIMPLES, REAL, PRESUMIDO
  defaultCfop: nvarchar("default_cfop", { length: 4 }),
  issRate: decimal("iss_rate", { precision: 5, scale: 2 }), // % ISS
  
  // Operacional
  defaultFreightTableId: int("default_freight_table_id"),
  defaultPaymentTermDays: int("default_payment_term_days").default(30),
  defaultInvoiceDueDays: int("default_invoice_due_days").default(30),
  
  // Emails
  smtpHost: nvarchar("smtp_host", { length: 255 }),
  smtpPort: int("smtp_port").default(587),
  smtpUser: nvarchar("smtp_user", { length: 255 }),
  smtpPassword: nvarchar("smtp_password", { length: 255 }), // Criptografado!
  emailFrom: nvarchar("email_from", { length: 255 }),
  
  ...enterpriseBase,
});
```

**Prioridade:** 🟡 **MÉDIA** (Fase 2)

---

#### **GAP #3: Sistema de Notificações - MÉDIO**

**Problema:**
```
❌ Usuário não recebe avisos de:
  - CTe rejeitado pela Sefaz
  - Viagem atrasada
  - Conta a pagar vencendo
  - Certificado expirando
  - CNH de motorista vencendo
```

**Solução:**

```typescript
export const notifications = mssqlTable("notifications", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  userId: nvarchar("user_id", { length: 255 }), // Null = broadcast
  
  type: nvarchar("type", { length: 50 }).notNull(),
  // INFO, WARNING, ERROR, SUCCESS
  
  category: nvarchar("category", { length: 50 }).notNull(),
  // FISCAL, FINANCIAL, TMS, FLEET, SYSTEM
  
  title: nvarchar("title", { length: 255 }).notNull(),
  message: nvarchar("message", { length: "max" }).notNull(),
  
  // Link para a tela relevante
  actionUrl: nvarchar("action_url", { length: 500 }),
  actionLabel: nvarchar("action_label", { length: 100 }),
  
  // Leitura
  isRead: nvarchar("is_read", { length: 1 }).default("N"),
  readAt: datetime2("read_at"),
  
  createdAt: datetime2("created_at").default(new Date()),
});

// Serviço de notificação:

export class NotificationService {
  static async notify(params: {
    userId: string;
    category: string;
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    await db.insert(notifications).values({
      organizationId: params.organizationId,
      userId: params.userId,
      category: params.category,
      type: "INFO",
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
    });
    
    // TODO: Enviar email se configurado
    // TODO: Push notification se app mobile
  }
}

// Uso:
await NotificationService.notify({
  userId: "user123",
  category: "FISCAL",
  title: "CTe Rejeitado",
  message: "CTe #123 foi rejeitado pela Sefaz: Erro 999",
  actionUrl: "/fiscal/cte/123",
});
```

**Prioridade:** 🟡 **MÉDIA** (Fase 2)

---

#### **GAP #4: Logs de Acesso (LGPD) - VOCÊ MENCIONOU!**

**Crítica:** ✅ Você identificou corretamente!

**Complemento Técnico:**

```typescript
export const accessLogs = mssqlTable("access_logs", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  userId: nvarchar("user_id", { length: 255 }).notNull(),
  
  action: nvarchar("action", { length: 50 }).notNull(),
  // VIEW, DOWNLOAD, EXPORT, PRINT
  
  resource: nvarchar("resource", { length: 100 }).notNull(),
  // "driver:123", "vehicle:456", "invoice:789"
  
  resourceType: nvarchar("resource_type", { length: 50 }).notNull(),
  // DRIVER, VEHICLE, INVOICE, TRIP, etc
  
  ipAddress: nvarchar("ip_address", { length: 45 }),
  userAgent: nvarchar("user_agent", { length: 500 }),
  
  // LGPD: Dados acessados
  sensitiveData: nvarchar("sensitive_data", { length: 1 }).default("N"),
  // S = CPF, CNH, Salário, etc
  
  createdAt: datetime2("created_at").default(new Date()),
});

// Index para busca rápida
CREATE INDEX idx_access_logs_user_date 
ON access_logs(user_id, created_at DESC);

CREATE INDEX idx_access_logs_resource 
ON access_logs(resource_type, created_at DESC);
```

**Prioridade:** 🟡 **MÉDIA** (LGPD compliance)

---

#### **GAP #5: Backup Automático - VOCÊ NÃO MENCIONOU!**

**Problema:**
```
❌ Sem rotina de backup automático
❌ Risco de perda de dados
❌ Sem disaster recovery plan
```

**Solução:**

```bash
# Script de backup diário (cron job)

#!/bin/bash
# /scripts/backup-daily.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/aura_erp"
DB_NAME="aura_erp"

# Backup do banco
sqlcmd -S localhost -U sa -Q \
  "BACKUP DATABASE [$DB_NAME] \
   TO DISK='$BACKUP_DIR/db_$DATE.bak' \
   WITH COMPRESSION, STATS=10"

# Backup de arquivos (certificados, uploads)
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" \
  /var/www/aura_core/uploads \
  /var/www/aura_core/.env

# Enviar para S3/cloud (opcional)
aws s3 cp "$BACKUP_DIR/db_$DATE.bak" \
  s3://aura-backups/daily/

# Limpar backups antigos (>30 dias)
find $BACKUP_DIR -name "db_*.bak" -mtime +30 -delete

echo "✅ Backup concluído: $DATE"
```

```cron
# Adicionar ao crontab:
# 0 2 * * * /scripts/backup-daily.sh >> /var/log/backup.log 2>&1
```

**Prioridade:** 🔴 **ALTA** (Segurança de dados!)

---

### **📊 RESUMO MÓDULO 1:**

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Multi-tenancy | ✅ 100% | - | - |
| **RBAC** | ❌ 0% | 🔴 ALTA | 10-12h |
| **Configurações Org** | ❌ 0% | 🟡 MÉDIA | 4-6h |
| **Notificações** | ❌ 0% | 🟡 MÉDIA | 8-10h |
| **Logs LGPD** | ❌ 0% | 🟡 MÉDIA | 4-6h |
| **Backup** | ❌ 0% | 🔴 ALTA | 2-3h |
| Assinaturas SaaS | ❌ 0% | 🟢 BAIXA | 16-20h |

**Total Gaps Críticos:** 2 (RBAC + Backup)  
**Total Esforço (Crítico):** 12-15h

---

## 2️⃣ **MÓDULO: COMERCIAL**

### **✅ O QUE ESTÁ BOM:**

| Funcionalidade | Status | Observação |
|----------------|--------|------------|
| Tabelas de Frete | ✅ 90% | Estrutura enterprise OK |
| Motor de Cálculo | ✅ 100% | Algoritmo robusto |
| Torre Cotações | ✅ 80% | UI básica funcional |
| Workflow Aprovação | ✅ 100% | Automação OK |

---

### **🔴 GAPS CRÍTICOS (Descobertos):**

#### **GAP #1: Gestão de Contratos - CRÍTICO!**

**Problema:**
```
❌ Não há tabela de CONTRATOS formais
❌ Tabela de frete não está vinculada a contrato
❌ Sem controle de vigência/renovação
❌ Sem gestão de SLA contratual
❌ Sem reajuste automático (IPCA, IGP-M)
```

**Impacto:** 🔴 **ALTO**
- Grandes clientes exigem contrato formal
- Preços mudam manualmente (erro humano)
- Sem controle de multas por descumprimento SLA
- Não atende auditoria fiscal

**Solução Completa:**

```typescript
export const contracts = mssqlTable("contracts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Identificação
  contractNumber: nvarchar("contract_number", { length: 50 }).notNull().unique(),
  contractType: nvarchar("contract_type", { length: 20 }).notNull(),
  // FREIGHT, STORAGE, DEDICATED_FLEET
  
  // Cliente
  customerId: int("customer_id").notNull(),
  customerContactName: nvarchar("customer_contact_name", { length: 255 }),
  customerContactEmail: nvarchar("customer_contact_email", { length: 255 }),
  customerContactPhone: nvarchar("customer_contact_phone", { length: 20 }),
  
  // Vigência
  startDate: datetime2("start_date").notNull(),
  endDate: datetime2("end_date").notNull(),
  autoRenew: nvarchar("auto_renew", { length: 1 }).default("N"),
  renewalNoticeDays: int("renewal_notice_days").default(30),
  
  // Comercial
  freightTableId: int("freight_table_id"),
  billingFrequency: nvarchar("billing_frequency", { length: 20 }),
  // WEEKLY, BIWEEKLY, MONTHLY, CUSTOM
  
  paymentTermDays: int("payment_term_days").default(30),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  
  // Volume Mínimo/Máximo
  minimumMonthlyVolume: decimal("minimum_monthly_volume", { precision: 10, scale: 2 }),
  minimumMonthlyValue: decimal("minimum_monthly_value", { precision: 18, scale: 2 }),
  penaltyBelowMinimum: decimal("penalty_below_minimum", { precision: 5, scale: 2 }),
  
  // Reajuste
  adjustmentIndex: nvarchar("adjustment_index", { length: 20 }),
  // IPCA, IGP-M, IGP-DI, CUSTOM
  
  adjustmentFrequency: nvarchar("adjustment_frequency", { length: 20 }),
  // ANNUAL, SEMIANNUAL, QUARTERLY
  
  lastAdjustmentDate: datetime2("last_adjustment_date"),
  nextAdjustmentDate: datetime2("next_adjustment_date"),
  adjustmentPercentage: decimal("adjustment_percentage", { precision: 5, scale: 2 }),
  
  // SLA (Service Level Agreement)
  onTimeDeliveryTarget: decimal("on_time_delivery_target", { precision: 5, scale: 2 }),
  // Ex: 95% = 95.00
  
  penaltyPerDelay: decimal("penalty_per_delay", { precision: 18, scale: 2 }),
  // Valor fixo por atraso
  
  penaltyPercentagePerDelay: decimal("penalty_percentage_per_delay", { precision: 5, scale: 2 }),
  // % do frete por atraso
  
  maxToleranceDelayHours: int("max_tolerance_delay_hours").default(24),
  // Até 24h não conta como atraso
  
  // Documentos
  contractPdfUrl: nvarchar("contract_pdf_url", { length: 500 }),
  attachmentsUrls: nvarchar("attachments_urls", { length: "max" }), // JSON array
  
  // Observações
  terms: nvarchar("terms", { length: "max" }),
  notes: nvarchar("notes", { length: "max" }),
  
  // Status
  status: nvarchar("status", { length: 20 }).default("DRAFT"),
  // DRAFT, ACTIVE, SUSPENDED, EXPIRED, CANCELED
  
  signedAt: datetime2("signed_at"),
  suspendedAt: datetime2("suspended_at"),
  suspensionReason: nvarchar("suspension_reason", { length: 500 }),
  
  ...enterpriseBase,
});

// Histórico de reajustes
export const contractAdjustments = mssqlTable("contract_adjustments", {
  id: int("id").primaryKey().identity(),
  contractId: int("contract_id").notNull(),
  
  adjustmentDate: datetime2("adjustment_date").notNull(),
  indexUsed: nvarchar("index_used", { length: 20 }).notNull(),
  indexValue: decimal("index_value", { precision: 10, scale: 4 }).notNull(),
  percentageApplied: decimal("percentage_applied", { precision: 5, scale: 2 }).notNull(),
  
  oldFreightTableId: int("old_freight_table_id"),
  newFreightTableId: int("new_freight_table_id"),
  
  notes: nvarchar("notes", { length: "max" }),
  
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  createdAt: datetime2("created_at").default(new Date()),
});

// Performance mensal (para SLA)
export const contractPerformance = mssqlTable("contract_performance", {
  id: int("id").primaryKey().identity(),
  contractId: int("contract_id").notNull(),
  
  referenceMonth: datetime2("reference_month").notNull(), // 2024-12-01
  
  totalTrips: int("total_trips").notNull(),
  onTimeTrips: int("on_time_trips").notNull(),
  delayedTrips: int("delayed_trips").notNull(),
  
  onTimePercentage: decimal("on_time_percentage", { precision: 5, scale: 2 }),
  averageDelayHours: decimal("average_delay_hours", { precision: 10, scale: 2 }),
  
  totalFreightValue: decimal("total_freight_value", { precision: 18, scale: 2 }),
  penaltiesApplied: decimal("penalties_applied", { precision: 18, scale: 2 }),
  
  meetsMinimumVolume: nvarchar("meets_minimum_volume", { length: 1 }),
  volumePenalty: decimal("volume_penalty", { precision: 18, scale: 2 }),
  
  createdAt: datetime2("created_at").default(new Date()),
});
```

**Automações Necessárias:**

```typescript
// 1. Verificação diária de contratos vencendo
// Cron job: Todos os dias às 8h

export async function checkContractsExpiring() {
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  
  const expiring = await db
    .select()
    .from(contracts)
    .where(
      and(
        eq(contracts.status, "ACTIVE"),
        lte(contracts.endDate, in30Days)
      )
    );
  
  for (const contract of expiring) {
    // Notificar responsável
    await NotificationService.notify({
      userId: contract.createdBy,
      category: "COMMERCIAL",
      title: "Contrato Vencendo",
      message: `Contrato ${contract.contractNumber} vence em breve!`,
      actionUrl: `/comercial/contratos/${contract.id}`,
    });
  }
}

// 2. Aplicação automática de reajuste
export async function applyContractAdjustment(contractId: number) {
  const contract = await getContract(contractId);
  
  if (!contract.adjustmentIndex) return;
  
  // Buscar índice (IPCA, IGP-M) - Integrar com API do IBGE
  const indexValue = await fetchEconomicIndex(contract.adjustmentIndex);
  
  // Clonar tabela de frete e aplicar reajuste
  const newTable = await cloneFreightTable(contract.freightTableId);
  await applyAdjustmentToTable(newTable.id, indexValue);
  
  // Registrar histórico
  await db.insert(contractAdjustments).values({
    contractId,
    adjustmentDate: new Date(),
    indexUsed: contract.adjustmentIndex,
    indexValue,
    percentageApplied: indexValue,
    oldFreightTableId: contract.freightTableId,
    newFreightTableId: newTable.id,
  });
  
  // Atualizar contrato
  await db
    .update(contracts)
    .set({
      freightTableId: newTable.id,
      lastAdjustmentDate: new Date(),
      nextAdjustmentDate: calculateNextAdjustment(contract),
    })
    .where(eq(contracts.id, contractId));
}

// 3. Cálculo de performance mensal (SLA)
// Cron: Todo dia 1 do mês às 9h

export async function calculateMonthlyPerformance() {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const activeContracts = await getActiveContracts();
  
  for (const contract of activeContracts) {
    const trips = await getContractTrips(contract.id, lastMonth);
    
    const total = trips.length;
    const onTime = trips.filter(t => t.deliveredOnTime).length;
    const delayed = total - onTime;
    const onTimePercentage = (onTime / total) * 100;
    
    // Calcular penalidades se abaixo do SLA
    let penalties = 0;
    if (onTimePercentage < contract.onTimeDeliveryTarget) {
      penalties = delayed * contract.penaltyPerDelay;
    }
    
    // Registrar performance
    await db.insert(contractPerformance).values({
      contractId: contract.id,
      referenceMonth: lastMonth,
      totalTrips: total,
      onTimeTrips: onTime,
      delayedTrips: delayed,
      onTimePercentage,
      penaltiesApplied: penalties,
    });
    
    // Gerar nota de débito se houver penalidade
    if (penalties > 0) {
      await createPenaltyDebitNote(contract, penalties);
    }
  }
}
```

**Prioridade:** 🔴 **ALTA** (Após Opção A)  
**Esforço:** 12-16h

---

#### **GAP #2: Histórico de Alterações em Tabelas de Frete**

**Problema:**
```
❌ Não há auditoria de mudanças em preços
❌ Não sabe quem alterou, quando, de quanto para quanto
❌ Sem versionamento de tabelas
```

**Solução:**

```typescript
export const freightTableHistory = mssqlTable("freight_table_history", {
  id: int("id").primaryKey().identity(),
  freightTableId: int("freight_table_id").notNull(),
  
  action: nvarchar("action", { length: 20 }).notNull(),
  // CREATED, UPDATED, CLONED, ADJUSTED
  
  fieldChanged: nvarchar("field_changed", { length: 100 }),
  oldValue: nvarchar("old_value", { length: "max" }),
  newValue: nvarchar("new_value", { length: "max" }),
  
  reason: nvarchar("reason", { length: 500 }),
  // Ex: "Reajuste contrato #123", "Promoção Black Friday"
  
  changedBy: nvarchar("changed_by", { length: 255 }).notNull(),
  changedAt: datetime2("changed_at").default(new Date()),
});
```

**Prioridade:** 🟡 **MÉDIA**  
**Esforço:** 4-6h

---

#### **GAP #3: Análise de Margem de Lucro**

**Problema:**
```
❌ Sistema não calcula custo vs receita
❌ Não sabe quais clientes/rotas são lucrativos
❌ Decisões comerciais no escuro
```

**Solução:**

```typescript
// Dashboard de rentabilidade

export async function calculateProfitMargin(params: {
  customerId?: number;
  routeOrigin?: string;
  routeDestination?: string;
  period: { start: Date; end: Date };
}) {
  // 1. Buscar receitas (CTes emitidos)
  const revenues = await db
    .select({
      total: sum(cteHeader.totalValue),
      count: count(),
    })
    .from(cteHeader)
    .where(
      and(
        params.customerId ? eq(cteHeader.takerId, params.customerId) : sql`1=1`,
        gte(cteHeader.issueDate, params.period.start),
        lte(cteHeader.issueDate, params.period.end)
      )
    );
  
  // 2. Buscar custos (viagens relacionadas)
  const costs = await db
    .select({
      totalDiesel: sum(tripCosts.dieselCost),
      totalDriver: sum(tripCosts.driverCost),
      totalMaintenance: sum(tripCosts.maintenanceCost),
      totalTolls: sum(tripCosts.tollsCost),
    })
    .from(trips)
    .innerJoin(tripCosts, eq(trips.id, tripCosts.tripId))
    .where(
      and(
        gte(trips.actualStart, params.period.start),
        lte(trips.actualEnd, params.period.end)
      )
    );
  
  // 3. Calcular margem
  const revenue = parseFloat(revenues[0]?.total || "0");
  const cost = 
    parseFloat(costs[0]?.totalDiesel || "0") +
    parseFloat(costs[0]?.totalDriver || "0") +
    parseFloat(costs[0]?.totalMaintenance || "0") +
    parseFloat(costs[0]?.totalTolls || "0");
  
  const profit = revenue - cost;
  const marginPercentage = (profit / revenue) * 100;
  
  return {
    revenue,
    cost,
    profit,
    marginPercentage,
    tripCount: revenues[0]?.count || 0,
  };
}
```

**Prioridade:** 🟡 **MÉDIA**  
**Esforço:** 8-10h

---

### **📊 RESUMO MÓDULO 2:**

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Tabelas Frete | ✅ 90% | - | - |
| **Contratos** | ❌ 0% | 🔴 ALTA | 12-16h |
| **Histórico Preços** | ❌ 0% | 🟡 MÉDIA | 4-6h |
| **Análise Margem** | ❌ 0% | 🟡 MÉDIA | 8-10h |
| CRM Logístico | ❌ 0% | 🟢 BAIXA | 16-20h |
| Reajuste Lote | ❌ 0% | 🟡 MÉDIA | 4-6h |
| Propostas PDF | ❌ 0% | 🟡 MÉDIA | 6-8h |

**Total Gaps Críticos:** 1 (Contratos)  
**Total Esforço (Crítico):** 12-16h

---

## 3️⃣ **MÓDULO: FISCAL - ENTRADA**

### **✅ O QUE ESTÁ BOM:**

| Funcionalidade | Status |
|----------------|--------|
| Robô Sefaz | ✅ 100% |
| Processador XML | ✅ 100% |
| Importação Auto | ✅ 90% |
| Gatilho Financeiro | ✅ 100% |

---

### **🔴 GAPS CRÍTICOS:**

#### **GAP #1: Classificação de NFe - OPÇÃO A RESOLVE! ✅**

**Problema:**
```
❌ NFe de COMPRA vs NFe de CARGA não diferenciadas
❌ CTe gerado sem NFe vinculada
❌ Workflow TMS quebrado
```

**Solução:** ✅ **OPÇÃO A (Blocos 1-4) - 19-26h**

Esse gap é CRÍTICO e será resolvido pela implementação da Opção A!

---

#### **GAP #2: Impostos Recuperáveis**

**Problema:**
```
❌ Sistema não calcula crédito de ICMS
❌ Não sabe quanto de PIS/COFINS pode recuperar
❌ Empresa perde dinheiro
```

**Solução:**

```typescript
export const taxCredits = mssqlTable("tax_credits", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  invoiceId: int("invoice_id").notNull(),
  
  taxType: nvarchar("tax_type", { length: 20 }).notNull(),
  // ICMS, PIS, COFINS, IPI
  
  taxBase: decimal("tax_base", { precision: 18, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  taxValue: decimal("tax_value", { precision: 18, scale: 2 }).notNull(),
  
  isRecoverable: nvarchar("is_recoverable", { length: 1 }).default("S"),
  recoverabilityReason: nvarchar("recoverability_reason", { length: 500 }),
  
  recoveredAt: datetime2("recovered_at"),
  recoveredInPeriod: nvarchar("recovered_in_period", { length: 7 }), // YYYY-MM
  
  ...enterpriseBase,
});

// Relatório de créditos tributários
export async function getTaxCreditsReport(period: string) {
  return await db
    .select({
      taxType: taxCredits.taxType,
      totalBase: sum(taxCredits.taxBase),
      totalCredit: sum(taxCredits.taxValue),
      count: count(),
    })
    .from(taxCredits)
    .where(
      and(
        eq(taxCredits.recoveredInPeriod, period),
        eq(taxCredits.isRecoverable, "S")
      )
    )
    .groupBy(taxCredits.taxType);
}
```

**Prioridade:** 🔴 **ALTA** (Impacto financeiro direto!)  
**Esforço:** 8-10h

---

### **📊 RESUMO MÓDULO 3:**

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Robô Sefaz | ✅ 100% | - | - |
| **Classificação NFe** | ❌ 0% | 🔴 CRÍTICA | **19-26h** (Opção A) |
| **Impostos Recuperáveis** | ❌ 0% | 🔴 ALTA | 8-10h |
| Manifestação Dest. | ❌ 0% | 🟡 MÉDIA | 6-8h |
| Conversão Unidade | ❌ 0% | 🟢 BAIXA | 4-6h |

**Total Gaps Críticos:** 2 (Classificação + Impostos)  
**Total Esforço (Crítico):** 27-36h

---

## 4️⃣ **MÓDULO: FISCAL - SAÍDA**

### **✅ O QUE ESTÁ BOM:**

| Funcionalidade | Status |
|----------------|--------|
| Matriz Tributária | ✅ 100% |
| Emissor CTe | ✅ 80% |
| Emissor MDFe | ✅ 80% |
| Assinatura Digital | ✅ 100% |

---

### **🔴 GAPS CRÍTICOS:**

#### **GAP #1: CTe sem NFe - OPÇÃO A RESOLVE! ✅**

**Solução:** ✅ **OPÇÃO A (Blocos 1-4)**

---

#### **GAP #2: DACTE (Impressão PDF) - CRÍTICO!**

**Problema:**
```
❌ Motorista não tem documento impresso
❌ Fiscalização exige DACTE físico
❌ Obrigatório por lei
```

**Solução:**

```typescript
// src/services/fiscal/dacte-generator.ts

import PDFDocument from "pdfkit";

export async function generateDACTE(cteId: number): Promise<Buffer> {
  const cte = await getCteById(cteId);
  
  const doc = new PDFDocument({ size: "A4", margin: 20 });
  const chunks: Buffer[] = [];
  
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {});
  
  // Header
  doc.fontSize(16).text("DACTE - Documento Auxiliar do CTe", { align: "center" });
  doc.fontSize(10).text(`Modelo 57 - Série ${cte.serie}`, { align: "center" });
  
  // Código de barras (chave de acesso)
  doc.fontSize(8).text(cte.cteKey, { align: "center" });
  
  // Dados do tomador
  doc.fontSize(12).text("\nTomador do Serviço:", { underline: true });
  doc.fontSize(10).text(`Nome: ${cte.takerName}`);
  doc.fontSize(10).text(`CNPJ: ${cte.takerCnpj}`);
  
  // Dados da carga
  doc.fontSize(12).text("\nDados da Carga:", { underline: true });
  doc.fontSize(10).text(`Valor: R$ ${cte.cargoValue}`);
  doc.fontSize(10).text(`Peso: ${cte.weight} kg`);
  
  // Valores do frete
  doc.fontSize(12).text("\nValores do Frete:", { underline: true });
  doc.fontSize(10).text(`Valor do Serviço: R$ ${cte.serviceValue}`);
  doc.fontSize(10).text(`ICMS: R$ ${cte.icmsValue}`);
  doc.fontSize(10).text(`Total: R$ ${cte.totalValue}`);
  
  // Notas fiscais (se houver)
  if (cte.cargoDocuments.length > 0) {
    doc.fontSize(12).text("\nDocumentos de Carga:", { underline: true });
    cte.cargoDocuments.forEach((nfe: any) => {
      doc.fontSize(10).text(`NFe: ${nfe.documentKey}`);
    });
  }
  
  // Footer
  doc.fontSize(8).text("\n\nEmissão: " + new Date().toLocaleString("pt-BR"), { align: "center" });
  
  doc.end();
  
  return Buffer.concat(chunks);
}
```

**API:**

```typescript
// src/app/api/fiscal/cte/[id]/dacte/route.ts

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  
  const cteId = parseInt(params.id);
  
  const pdf = await generateDACTE(cteId);
  
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DACTE_${cteId}.pdf"`,
    },
  });
}
```

**Prioridade:** 🔴 **CRÍTICA**  
**Esforço:** 8-10h

---

### **📊 RESUMO MÓDULO 4:**

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Matriz Tributária | ✅ 100% | - | - |
| **CTe com NFe** | ❌ 0% | 🔴 CRÍTICA | **19-26h** (Opção A) |
| **DACTE PDF** | ❌ 0% | 🔴 CRÍTICA | 8-10h |
| Inutilização | ❌ 0% | 🟡 MÉDIA | 4-6h |
| CC-e | ❌ 0% | 🟡 MÉDIA | 4-6h |
| Cancelamento | ❌ 0% | 🟡 MÉDIA | 4-6h |
| NFS-e | ❌ 0% | 🟢 BAIXA | 16-20h |

**Total Gaps Críticos:** 2 (CTe+NFe + DACTE)  
**Total Esforço (Crítico):** 27-36h

---

## 5️⃣ **MÓDULO: TMS**

### **✅ O QUE ESTÁ BOM:**

| Funcionalidade | Status |
|----------------|--------|
| Ordens Coleta | ✅ 100% |
| Gestão Viagens | ✅ 80% |
| Kanban Visual | ✅ 100% |
| CIOT (validação) | ✅ 80% |

---

### **🔴 GAPS CRÍTICOS:**

#### **GAP #1: Repositório de Cargas - OPÇÃO A RESOLVE! ✅**

**Solução:** ✅ **OPÇÃO A (Blocos 1-4)**

---

#### **GAP #2: Ocorrências de Viagem - CRÍTICO!**

**Problema:**
```
❌ Sem registro de problemas (avaria, roubo, acidente)
❌ Sem evidências para seguradora
❌ Sem gestão de sinistros
```

**Solução:**

```typescript
export const tripOccurrences = mssqlTable("trip_occurrences", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  tripId: int("trip_id").notNull(),
  
  occurrenceType: nvarchar("occurrence_type", { length: 50 }).notNull(),
  // DAMAGE (Avaria), ACCIDENT (Acidente), THEFT (Roubo), 
  // DELAY (Atraso), REFUSAL (Recusa), MECHANICAL (Quebra),
  // OTHER (Outro)
  
  severity: nvarchar("severity", { length: 20 }).notNull(),
  // LOW, MEDIUM, HIGH, CRITICAL
  
  title: nvarchar("title", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }).notNull(),
  
  // Localização
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  address: nvarchar("address", { length: 500 }),
  
  // Evidências
  photosUrls: nvarchar("photos_urls", { length: "max" }), // JSON array
  documentsUrls: nvarchar("documents_urls", { length: "max" }), // JSON array
  
  // Responsável
  responsibleParty: nvarchar("responsible_party", { length: 50 }),
  // DRIVER, CARRIER, CLIENT, THIRD_PARTY
  
  // Ações Tomadas
  actionsTaken: nvarchar("actions_taken", { length: "max" }),
  
  // Impacto Financeiro
  estimatedLoss: decimal("estimated_loss", { precision: 18, scale: 2 }),
  insuranceClaim: nvarchar("insurance_claim", { length: 1 }).default("N"),
  insuranceClaimNumber: nvarchar("insurance_claim_number", { length: 100 }),
  
  // Resolução
  status: nvarchar("status", { length: 20 }).default("OPEN"),
  // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  
  resolvedAt: datetime2("resolved_at"),
  resolutionNotes: nvarchar("resolution_notes", { length: "max" }),
  
  // Notificações
  clientNotified: nvarchar("client_notified", { length: 1 }).default("N"),
  clientNotifiedAt: datetime2("client_notified_at"),
  
  ...enterpriseBase,
});
```

**API & Upload:**

```typescript
// Upload de fotos (S3 ou local)

export async function uploadOccurrencePhotos(
  occurrenceId: number,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];
  
  for (const file of files) {
    // Upload para S3 ou diretório local
    const filename = `occurrence_${occurrenceId}_${Date.now()}_${file.name}`;
    const path = `/uploads/occurrences/${filename}`;
    
    await saveFile(file, path);
    urls.push(path);
  }
  
  // Atualizar registro
  await db
    .update(tripOccurrences)
    .set({
      photosUrls: JSON.stringify(urls),
    })
    .where(eq(tripOccurrences.id, occurrenceId));
  
  return urls;
}
```

**Frontend:**

```tsx
// Modal de registro de ocorrência

<Dialog>
  <DialogContent>
    <DialogTitle>Registrar Ocorrência</DialogTitle>
    
    <Select name="occurrenceType">
      <SelectOption value="DAMAGE">Avaria</SelectOption>
      <SelectOption value="ACCIDENT">Acidente</SelectOption>
      <SelectOption value="THEFT">Roubo</SelectOption>
      <SelectOption value="DELAY">Atraso</SelectOption>
      <SelectOption value="REFUSAL">Recusa de Carga</SelectOption>
      <SelectOption value="MECHANICAL">Problema Mecânico</SelectOption>
    </Select>
    
    <Select name="severity">
      <SelectOption value="LOW">Baixa</SelectOption>
      <SelectOption value="MEDIUM">Média</SelectOption>
      <SelectOption value="HIGH">Alta</SelectOption>
      <SelectOption value="CRITICAL">Crítica</SelectOption>
    </Select>
    
    <Input name="title" placeholder="Resumo da ocorrência" />
    
    <Textarea name="description" placeholder="Descreva o ocorrido..." />
    
    {/* Upload de fotos */}
    <FileUpload 
      accept="image/*" 
      multiple 
      maxFiles={10}
      onUpload={handleUploadPhotos}
    />
    
    <Input 
      type="number" 
      name="estimatedLoss" 
      placeholder="Prejuízo estimado (R$)" 
    />
    
    <Checkbox name="insuranceClaim">
      Acionar seguro
    </Checkbox>
    
    <Button type="submit">Registrar Ocorrência</Button>
  </DialogContent>
</Dialog>
```

**Prioridade:** 🔴 **ALTA**  
**Esforço:** 6-8h

---

#### **GAP #3: Documentação de Frota - CRÍTICO!**

**Problema:**
```
❌ CRLV vencido = multa + apreensão
❌ Seguro vencido = risco total
❌ ANTT irregular = multa pesada
❌ CNH vencida = motorista irregular
❌ MOPP vencido = motorista irregular
```

**Solução:**

```typescript
export const vehicleDocuments = mssqlTable("vehicle_documents", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  vehicleId: int("vehicle_id").notNull(),
  
  documentType: nvarchar("document_type", { length: 50 }).notNull(),
  // CRLV, SEGURO, ANTT, IPVA, DPVAT, OUTROS
  
  documentNumber: nvarchar("document_number", { length: 100 }),
  
  issueDate: datetime2("issue_date"),
  expiryDate: datetime2("expiry_date").notNull(),
  
  // Arquivo
  fileUrl: nvarchar("file_url", { length: 500 }),
  fileSize: int("file_size"),
  fileMimeType: nvarchar("file_mime_type", { length: 100 }),
  
  // Seguro específico
  insuranceCompany: nvarchar("insurance_company", { length: 255 }),
  policyNumber: nvarchar("policy_number", { length: 100 }),
  insuredValue: decimal("insured_value", { precision: 18, scale: 2 }),
  
  // Status automático
  status: nvarchar("status", { length: 20 }).default("VALID"),
  // VALID, EXPIRING_SOON (< 30 dias), EXPIRED
  
  alertSentAt: datetime2("alert_sent_at"),
  
  ...enterpriseBase,
});

export const driverDocuments = mssqlTable("driver_documents", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  driverId: int("driver_id").notNull(),
  
  documentType: nvarchar("document_type", { length: 50 }).notNull(),
  // CNH, MOPP, TOXICOLOGICO, ASO, OUTROS
  
  documentNumber: nvarchar("document_number", { length: 100 }),
  
  issueDate: datetime2("issue_date"),
  expiryDate: datetime2("expiry_date").notNull(),
  
  // CNH específico
  cnhCategory: nvarchar("cnh_category", { length: 5 }),
  // A, B, C, D, E
  
  // Arquivo
  fileUrl: nvarchar("file_url", { length: 500 }),
  
  status: nvarchar("status", { length: 20 }).default("VALID"),
  
  ...enterpriseBase,
});
```

**Automação - Verificação Diária:**

```typescript
// Cron: Todos os dias às 8h

export async function checkDocumentsExpiring() {
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  
  // Veículos
  const vehicleDocs = await db
    .select()
    .from(vehicleDocuments)
    .where(
      and(
        lte(vehicleDocuments.expiryDate, in30Days),
        isNull(vehicleDocuments.deletedAt)
      )
    );
  
  for (const doc of vehicleDocs) {
    const daysUntilExpiry = differenceInDays(doc.expiryDate, new Date());
    
    if (daysUntilExpiry <= 0) {
      // VENCIDO - Bloquear veículo!
      await db
        .update(vehicles)
        .set({ status: "BLOCKED" })
        .where(eq(vehicles.id, doc.vehicleId));
      
      await NotificationService.notify({
        category: "FLEET",
        title: "Documento Vencido!",
        message: `${doc.documentType} do veículo venceu! Veículo bloqueado.`,
        actionUrl: `/frota/veiculos/${doc.vehicleId}`,
      });
    } else if (daysUntilExpiry <= 7) {
      // Urgente (< 7 dias)
      await NotificationService.notify({
        category: "FLEET",
        title: "Documento Vencendo URGENTE!",
        message: `${doc.documentType} vence em ${daysUntilExpiry} dias!`,
        actionUrl: `/frota/veiculos/${doc.vehicleId}`,
      });
    } else if (daysUntilExpiry <= 30) {
      // Aviso (< 30 dias)
      await NotificationService.notify({
        category: "FLEET",
        title: "Documento Vencendo",
        message: `${doc.documentType} vence em ${daysUntilExpiry} dias.`,
        actionUrl: `/frota/veiculos/${doc.vehicleId}`,
      });
    }
  }
  
  // Motoristas (mesma lógica)
  // ...
}
```

**Prioridade:** 🔴 **ALTA**  
**Esforço:** 6-8h

---

### **📊 RESUMO MÓDULO 5:**

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Ordens Coleta | ✅ 100% | - | - |
| **Repositório Cargas** | ❌ 0% | 🔴 CRÍTICA | **19-26h** (Opção A) |
| **Ocorrências** | ❌ 0% | 🔴 ALTA | 6-8h |
| **Docs Frota** | ❌ 0% | 🔴 ALTA | 6-8h |
| Roteirização | ❌ 0% | 🟡 MÉDIA | 12-16h |
| App Motorista | ❌ 0% | 🟡 MÉDIA | 40-60h |

**Total Gaps Críticos:** 3 (Repositório + Ocorrências + Docs)  
**Total Esforço (Crítico):** 31-42h

---

## 6️⃣ **MÓDULO: FINANCEIRO & CONTROLADORIA**

### **✅ O QUE ESTÁ BOM:**

| Funcionalidade | Status |
|----------------|--------|
| Contas Pagar/Receber | ✅ 100% |
| CNAB 240 | ✅ 100% |
| DDA (Radar BTG) | ✅ 100% |
| Centros Custo | ✅ 100% |
| DRE Gerencial | ✅ 90% |

---

### **🔴 GAPS CRÍTICOS:**

#### **GAP #1: Faturamento Agrupado (BILLING) - VOCÊ MARCOU CRÍTICO! ✅**

**Problema:**
```
❌ Cliente grande recebe 50 boletos/mês (1 por CTe)
❌ Cliente reclama, atrasa pagamento
❌ Equipe financeira perde tempo cobrando
```

**Solução:** ✅ **JÁ DETALHADO NO ROADMAP MASTER**

**Prioridade:** 🔴 **CRÍTICA** (Você marcou!)  
**Esforço:** 12-16h

---

### **📊 RESUMO MÓDULO 6:**

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Contas Pagar/Receber | ✅ 100% | - | - |
| **Billing** | ❌ 0% | 🔴 CRÍTICA | 12-16h |
| Conciliação OFX | ❌ 0% | 🟡 MÉDIA | 10-12h |
| Fluxo Caixa | ❌ 0% | 🟡 MÉDIA | 8-10h |
| API VAN BTG | ❌ 0% | 🟢 BAIXA | 16-20h |

**Total Gaps Críticos:** 1 (Billing)  
**Total Esforço (Crítico):** 12-16h

---

## 7️⃣ **MÓDULO: FROTA**

### **📊 RESUMO:**

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Cadastro Básico | ✅ 100% | - | - |
| **Documentos** | ❌ 0% | 🔴 ALTA | 6-8h (já detalhado) |
| Gestão Pneus | ❌ 0% | 🟡 MÉDIA | 12-16h |
| Abastecimento | ❌ 0% | 🟡 MÉDIA | 8-10h |

---

## 8️⃣ **MÓDULO: WMS**

### **📊 RESUMO:**

**RECOMENDAÇÃO:** 🟢 **BAIXA PRIORIDADE**

- WMS completo NÃO é core de transportadora
- Deixar para **Fase 3 ou 4**
- Focar no TMS primeiro

---

## 9️⃣ **MÓDULO: MANUTENÇÃO**

### **📊 RESUMO:**

**RECOMENDAÇÃO:** 🟡 **MÉDIA PRIORIDADE**

- Implementar na **Fase 2** (após TMS estabilizar)
- Esforço: 16-20h

---

## 🎯 **PARTE FINAL: ROADMAP EXECUTÁVEL DEFINITIVO**

### **🔥 FASE 1: OPERACIONAL CRÍTICO (4 semanas)**

```
SEMANA 1 (09-15/12):
  ✅ Sprint 1: Opção A (Repositório + Multicte)
     Esforço: 19-26h
     Resultado: Sistema operacional para transporte!

SEMANA 2 (16-22/12):
  ✅ Sprint 2: Billing (Faturamento Agrupado)
     Esforço: 12-16h
     Resultado: Grandes clientes felizes!
  
  ✅ Sprint 3: DACTE (Impressão CTe)
     Esforço: 8-10h
     Resultado: Motorista com documento legal!

SEMANA 3 (23-29/12):
  ✅ Sprint 4: Documentação Frota
     Esforço: 6-8h
     Resultado: Frota regularizada!
  
  ✅ Sprint 5: Ocorrências de Viagem
     Esforço: 6-8h
     Resultado: Rastreabilidade de problemas!

SEMANA 4 (30/12-05/01):
  ✅ Sprint 6: Impostos Recuperáveis
     Esforço: 8-10h
     Resultado: Não perder dinheiro em impostos!
  
  Testes E2E + Ajustes + Docs
  
  ✅ FASE 1 COMPLETA! 🎉
```

**Total Esforço Fase 1:** 59-78 horas

---

### **🎯 FASE 2: GESTÃO AVANÇADA (3 semanas)**

```
  ✅ Contratos Formais (12-16h)
  ✅ RBAC (Permissões) (10-12h)
  ✅ Análise de Margem (8-10h)
  ✅ Configurações Org (4-6h)
  ✅ Notificações (8-10h)
  ✅ Backup Automático (2-3h)
  ✅ Manutenção Preventiva (16-20h)
```

**Total Esforço Fase 2:** 60-77 horas

---

## ✅ **APROVAÇÃO FINAL**

**Você aprova este inventário refinado e roadmap?**

Se SIM, vou:
1. ✅ Começar **AGORA** pela **Sprint 1 (Opção A)**
2. ✅ Executar sem parar até completar os 4 blocos
3. ✅ Estimativa: 19-26h contínuas

**Após Sprint 1, você decide se continua Sprint 2 ou testa primeiro!**

---

**🚀 AGUARDANDO SUA DECISÃO FINAL!**







