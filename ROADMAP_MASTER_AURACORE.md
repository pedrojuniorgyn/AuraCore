# 🎯 ROADMAP MASTER - AURACORE ENTERPRISE

**Data:** 08/12/2025  
**Autor:** Análise Técnica de CTO  
**Objetivo:** Planejamento executável completo do sistema

---

## 📊 **PARTE 1: ANÁLISE CRÍTICA DO INVENTÁRIO**

### **MÓDULO 1: CORE & INFRAESTRUTURA** 

#### **✅ O Que Está BOM:**
- ✅ Multi-tenancy robusto (organization_id)
- ✅ Branch scoping implementado
- ✅ Autenticação híbrida (Google + Credentials)
- ✅ Auditoria básica (created_by, updated_by)
- ✅ Soft delete global
- ✅ Certificado A1 funcional

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **Gestão de Permissões (RBAC):** Não há sistema de roles/permissions detalhado
  - **Impacto:** Gerente não pode ter acesso restrito vs Admin
  - **Prioridade:** 🔴 ALTA (segurança)
  
- ❌ **Configurações por Organização:** Faltam parametrizações
  - Ex: Logo da empresa, Timezone, Moeda padrão
  - **Impacto:** Sistema não personalizável por cliente
  - **Prioridade:** 🟡 MÉDIA

- ❌ **Sistema de Notificações:**
  - In-app notifications (sino no header)
  - Email templates (boas-vindas, alertas)
  - **Impacto:** Usuário não recebe avisos críticos
  - **Prioridade:** 🟡 MÉDIA

- ❌ **Backup Automático:**
  - Rotina de backup diário do banco
  - **Impacto:** Risco de perda de dados
  - **Prioridade:** 🔴 ALTA

#### **🔧 MELHORIAS SUGERIDAS:**
```typescript
// Adicionar ao schema:

export const organizationSettings = mssqlTable("organization_settings", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull().unique(),
  
  // Branding
  logoUrl: nvarchar("logo_url", { length: 500 }),
  primaryColor: nvarchar("primary_color", { length: 7 }), // #FF5733
  
  // Regional
  timezone: nvarchar("timezone", { length: 50 }).default("America/Sao_Paulo"),
  currency: nvarchar("currency", { length: 3 }).default("BRL"),
  dateFormat: nvarchar("date_format", { length: 20 }).default("DD/MM/YYYY"),
  
  // Fiscal
  defaultTaxRegime: nvarchar("default_tax_regime", { length: 20 }),
  defaultCfop: nvarchar("default_cfop", { length: 4 }),
  
  // Operacional
  defaultFreightTableId: int("default_freight_table_id"),
  defaultVehicleType: nvarchar("default_vehicle_type", { length: 50 }),
});

export const userPermissions = mssqlTable("user_permissions", {
  id: int("id").primaryKey().identity(),
  userId: nvarchar("user_id", { length: 255 }).notNull(),
  
  // Módulos
  canAccessFinancial: nvarchar("can_access_financial", { length: 1 }).default("N"),
  canAccessTms: nvarchar("can_access_tms", { length: 1 }).default("S"),
  canAccessFleet: nvarchar("can_access_fleet", { length: 1 }).default("N"),
  
  // Ações
  canApproveQuotes: nvarchar("can_approve_quotes", { length: 1 }).default("N"),
  canIssueCte: nvarchar("can_issue_cte", { length: 1 }).default("N"),
  canCancelTrips: nvarchar("can_cancel_trips", { length: 1 }).default("N"),
  canExportReports: nvarchar("can_export_reports", { length: 1 }).default("S"),
});
```

---

### **MÓDULO 2: COMERCIAL**

#### **✅ O Que Está BOM:**
- ✅ Tabelas de frete enterprise
- ✅ Torre de controle de cotações
- ✅ Motor de cálculo automático
- ✅ Workflow de aprovação

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **Contratos Formais:**
  - Tabela `contracts` para contratos fixos com clientes
  - Vínculo contrato → tabela de frete
  - Vigência, reajuste automático, SLA
  - **Impacto:** Não há gestão de contratos de longo prazo
  - **Prioridade:** 🔴 ALTA

- ❌ **Histórico de Preços:**
  - Log de alterações nas tabelas de frete
  - Auditoria de quem mudou preço e quando
  - **Impacto:** Sem rastreabilidade de mudanças
  - **Prioridade:** 🟡 MÉDIA

- ❌ **Análise de Margem:**
  - Cálculo de margem de lucro (preço venda - custo)
  - Dashboard de rentabilidade por cliente/rota
  - **Impacto:** Gestão não sabe se está lucrando
  - **Prioridade:** 🔴 ALTA

#### **🔧 MELHORIAS SUGERIDAS:**
```typescript
export const contracts = mssqlTable("contracts", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Cliente
  customerId: int("customer_id").notNull(),
  contractNumber: nvarchar("contract_number", { length: 50 }).notNull().unique(),
  
  // Vigência
  startDate: datetime2("start_date").notNull(),
  endDate: datetime2("end_date").notNull(),
  autoRenew: nvarchar("auto_renew", { length: 1 }).default("N"),
  
  // Comercial
  freightTableId: int("freight_table_id"), // Tabela dedicada
  billingFrequency: nvarchar("billing_frequency", { length: 20 }), // WEEKLY, MONTHLY
  paymentTermDays: int("payment_term_days").default(30),
  
  // Reajuste
  adjustmentIndex: nvarchar("adjustment_index", { length: 20 }), // IPCA, IGP-M
  lastAdjustmentDate: datetime2("last_adjustment_date"),
  nextAdjustmentDate: datetime2("next_adjustment_date"),
  
  // SLA
  onTimeDeliveryTarget: decimal("on_time_delivery_target", { precision: 5, scale: 2 }), // 95%
  penaltyPercentage: decimal("penalty_percentage", { precision: 5, scale: 2 }), // 2%
  
  // Documento
  contractPdfUrl: nvarchar("contract_pdf_url", { length: 500 }),
  
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
  ...enterpriseBase,
});
```

---

### **MÓDULO 3: FISCAL - ENTRADA**

#### **✅ O Que Está BOM:**
- ✅ Robô Sefaz funcional
- ✅ Importação automática
- ✅ Auto-cadastro de fornecedores
- ✅ Gatilho financeiro

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **⚠️ CLASSIFICAÇÃO DE NFe:** ← **OPÇÃO A RESOLVE ISSO!**
  - **Problema:** Não diferencia NFe de compra vs carga
  - **Solução:** Implementar Opção A (Blocos 1-4)
  - **Prioridade:** 🔴 CRÍTICA

- ❌ **Gestão de Fornecedores Completa:**
  - Rating de fornecedores (qualidade, prazo)
  - Histórico de compras
  - Análise de melhores preços
  - **Prioridade:** 🟡 MÉDIA

- ❌ **Controle de Impostos Recuperáveis:**
  - Cálculo de crédito de ICMS/PIS/COFINS
  - Relatório de impostos a recuperar
  - **Impacto:** Empresa perde dinheiro
  - **Prioridade:** 🔴 ALTA

#### **🆕 INTEGRAÇÃO OPÇÃO A:**
```
✅ Opção A (Repositório de Cargas) VAI IMPLEMENTAR:
  - Classificação automática NFe (COMPRA vs CARGO vs RETURN)
  - Repositório visual de cargas
  - Importação de CTe externo (Multicte)
  - Workflow completo NFe → Viagem → CTe
  
  ISSO RESOLVE O GAP CRÍTICO DO MÓDULO 3!
```

---

### **MÓDULO 4: FISCAL - SAÍDA**

#### **✅ O Que Está BOM:**
- ✅ Matriz tributária
- ✅ Emissor CTe 4.0
- ✅ Emissor MDFe
- ✅ Assinatura digital

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **⚠️ CTe SEM NFe VINCULADA:** ← **OPÇÃO A RESOLVE ISSO!**
  - **Problema:** CTe é gerado sem as NFes do cliente
  - **Solução:** Opção A vincula automaticamente
  - **Prioridade:** 🔴 CRÍTICA

- ❌ **Consulta de Status CTe/MDFe:**
  - Buscar status na Sefaz (autorizado, cancelado, denegado)
  - Atualização automática de status
  - **Prioridade:** 🟡 MÉDIA

- ❌ **Impressão DACTE:**
  - Geração de PDF do DACTE (danfe do CTe)
  - Layout padrão Sefaz
  - **Impacto:** Motorista não tem documento impresso
  - **Prioridade:** 🔴 ALTA

#### **🆕 INTEGRAÇÃO OPÇÃO A:**
```
✅ Opção A (CTe Externo) VAI IMPLEMENTAR:
  - Vínculo automático NFe → CTe
  - Importação de CTe Multicte
  - Prevenção de CTe duplicado
  - Rastreabilidade completa
  
  ISSO RESOLVE O GAP CRÍTICO DO MÓDULO 4!
```

---

### **MÓDULO 5: TMS (OPERACIONAL)**

#### **✅ O Que Está BOM:**
- ✅ Ordens de coleta
- ✅ Gestão de viagens (Kanban)
- ✅ CIOT (validação)
- ✅ Workflow automático

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **⚠️ SELEÇÃO DE CARGAS:** ← **OPÇÃO A RESOLVE ISSO!**
  - **Problema:** Operador não vê cargas disponíveis
  - **Solução:** Repositório de Cargas (Opção A)
  - **Prioridade:** 🔴 CRÍTICA

- ❌ **Ocorrências de Viagem:**
  - Registro de problemas (avaria, acidente, roubo)
  - Upload de fotos
  - Comunicação com seguradora
  - **Prioridade:** 🔴 ALTA

- ❌ **Controle de Entregas:**
  - Checklist de entrega
  - Assinatura digital do recebedor
  - Comprovante de entrega (POD)
  - **Impacto:** Sem prova de entrega formal
  - **Prioridade:** 🔴 ALTA

- ❌ **Gestão de Paradas:**
  - Registro de paradas (posto, hotel, balança)
  - Custos de paradas (refeição, estadia)
  - **Prioridade:** 🟡 MÉDIA

#### **🆕 INTEGRAÇÃO OPÇÃO A:**
```
✅ Opção A (Repositório) VAI IMPLEMENTAR:
  - Repositório visual de cargas
  - Seleção de cargas ao criar viagem
  - Vínculo Carga → Viagem → CTe
  - Status workflow completo
  
  ISSO RESOLVE O GAP CRÍTICO DO MÓDULO 5!
```

---

### **MÓDULO 6: FINANCEIRO & CONTROLADORIA**

#### **✅ O Que Está BOM:**
- ✅ Contas a pagar/receber
- ✅ CNAB 240
- ✅ DDA (Radar BTG)
- ✅ Centros de custo vivos
- ✅ DRE gerencial

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **Faturamento Agrupado (BILLING):** ← **VOCÊ MARCOU COMO CRÍTICO!**
  - Múltiplos CTes → 1 Fatura/Boleto
  - Layout de fatura profissional (PDF)
  - Envio automático por email
  - **Impacto:** Grandes clientes reclamam
  - **Prioridade:** 🔴 CRÍTICA

- ❌ **Provisões e Accruals:**
  - Provisão de férias, 13º
  - Provisão de manutenção
  - **Impacto:** DRE não reflete realidade
  - **Prioridade:** 🟡 MÉDIA

- ❌ **Budget (Orçamento):**
  - Planejamento orçamentário anual
  - Comparação Real vs Orçado
  - **Prioridade:** 🟡 MÉDIA

- ❌ **Integração Contábil:**
  - Exportação para sistemas contábeis (Domínio, Totvs)
  - Layout SPED Contábil
  - **Prioridade:** 🟡 MÉDIA

#### **🔧 SCHEMA BILLING:**
```typescript
export const billings = mssqlTable("billings", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // Cliente
  customerId: int("customer_id").notNull(),
  contractId: int("contract_id"), // Se for contrato
  
  // Período
  billingNumber: nvarchar("billing_number", { length: 50 }).notNull().unique(),
  periodStart: datetime2("period_start").notNull(),
  periodEnd: datetime2("period_end").notNull(),
  
  // CTes Agrupados
  cteIds: nvarchar("cte_ids", { length: "max" }), // JSON array: [123, 456, 789]
  totalCtes: int("total_ctes").notNull(),
  
  // Valores
  grossValue: decimal("gross_value", { precision: 18, scale: 2 }).notNull(),
  discounts: decimal("discounts", { precision: 18, scale: 2 }).default("0"),
  additions: decimal("additions", { precision: 18, scale: 2 }).default("0"),
  netValue: decimal("net_value", { precision: 18, scale: 2 }).notNull(),
  
  // Pagamento
  dueDate: datetime2("due_date").notNull(),
  paymentTermDays: int("payment_term_days").default(30),
  
  // Documentos
  invoicePdfUrl: nvarchar("invoice_pdf_url", { length: 500 }),
  nfseKey: nvarchar("nfse_key", { length: 44 }), // Se emitir NFSe
  
  // Financeiro
  accountsReceivableId: int("accounts_receivable_id"), // Link com financeiro
  
  status: nvarchar("status", { length: 20 }).default("DRAFT"),
  // DRAFT, SENT, PAID, OVERDUE, CANCELED
  
  sentAt: datetime2("sent_at"),
  paidAt: datetime2("paid_at"),
  
  ...enterpriseBase,
});

export const billingItems = mssqlTable("billing_items", {
  id: int("id").primaryKey().identity(),
  billingId: int("billing_id").notNull(),
  
  cteId: int("cte_id").notNull(),
  cteNumber: int("cte_number").notNull(),
  cteKey: nvarchar("cte_key", { length: 44 }),
  
  origin: nvarchar("origin", { length: 100 }),
  destination: nvarchar("destination", { length: 100 }),
  
  serviceValue: decimal("service_value", { precision: 18, scale: 2 }),
  issueDate: datetime2("issue_date"),
});
```

---

### **MÓDULO 7: FROTA**

#### **✅ O Que Está BOM:**
- ✅ Cadastro veículos/motoristas
- ✅ Status em tempo real

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **Documentação de Veículo:**
  - CRLV (validade)
  - Seguro (vigência, apólice)
  - ANTT (RNTRC)
  - **Impacto:** Veículo irregular na estrada = multa
  - **Prioridade:** 🔴 ALTA

- ❌ **Documentação de Motorista:**
  - Curso MOPP (validade)
  - Exame Toxicológico (obrigatório)
  - ASO (Saúde Ocupacional)
  - **Impacto:** Motorista irregular = multa
  - **Prioridade:** 🔴 ALTA

- ❌ **Checklist de Saída:**
  - Verificação pré-viagem (pneus, óleo, freios)
  - Registro fotográfico
  - Assinatura motorista
  - **Prioridade:** 🟡 MÉDIA

#### **🔧 SCHEMA DOCUMENTOS:**
```typescript
export const vehicleDocuments = mssqlTable("vehicle_documents", {
  id: int("id").primaryKey().identity(),
  vehicleId: int("vehicle_id").notNull(),
  
  documentType: nvarchar("document_type", { length: 50 }).notNull(),
  // CRLV, SEGURO, ANTT, IPVA, OUTROS
  
  documentNumber: nvarchar("document_number", { length: 100 }),
  issueDate: datetime2("issue_date"),
  expiryDate: datetime2("expiry_date"),
  
  fileUrl: nvarchar("file_url", { length: 500 }),
  
  status: nvarchar("status", { length: 20 }).default("VALID"),
  // VALID, EXPIRING_SOON, EXPIRED
  
  ...enterpriseBase,
});

export const driverDocuments = mssqlTable("driver_documents", {
  id: int("id").primaryKey().identity(),
  driverId: int("driver_id").notNull(),
  
  documentType: nvarchar("document_type", { length: 50 }).notNull(),
  // CNH, MOPP, TOXICOLOGICO, ASO, OUTROS
  
  documentNumber: nvarchar("document_number", { length: 100 }),
  issueDate: datetime2("issue_date"),
  expiryDate: datetime2("expiry_date"),
  
  fileUrl: nvarchar("file_url", { length: 500 }),
  
  status: nvarchar("status", { length: 20 }).default("VALID"),
  
  ...enterpriseBase,
});
```

---

### **MÓDULO 8: WMS (ARMAZÉM)**

#### **✅ O Que Está BOM:**
- ✅ Cadastro de produtos

#### **❌ O Que Está FALTANDO (Crítico):**
- ❌ **TUDO! (Módulo 0%)** 
  - Endereçamento físico
  - Movimentações de estoque
  - Inventário
  - **Prioridade:** 🟢 BAIXA (não é core de transportadora)

**RECOMENDAÇÃO:** Deixar WMS para **FASE 3 ou 4** (não é crítico agora)

---

### **MÓDULO 9: MANUTENÇÃO**

#### **❌ O Que Está FALTANDO:**
- ❌ **TUDO! (Módulo 0%)**
  - Ordens de serviço
  - Planos de manutenção
  - Controle de peças
  - **Prioridade:** 🟡 MÉDIA (importante mas não urgente)

**RECOMENDAÇÃO:** Implementar na **FASE 2** (após TMS estabilizar)

---

## 🎯 **PARTE 2: GAPS CRÍTICOS IDENTIFICADOS**

### **GAP #1: OPÇÃO A (Repositório + Multicte)** 🔴 CRÍTICO
**Problema:** NFes de carga não entram no workflow TMS, CTe sem NFe vinculada  
**Impacto:** Sistema NÃO operacional para transporte  
**Solução:** Implementar Opção A (Blocos 1-4)  
**Esforço:** 19-26h  
**Prioridade:** **#1 - FAZER PRIMEIRO!**

---

### **GAP #2: Faturamento Agrupado (Billing)** 🔴 CRÍTICO
**Problema:** Grandes clientes recebem 1 boleto por CTe (50 boletos/mês!)  
**Impacto:** Cliente reclama, atrasado pagamento  
**Solução:** Implementar módulo Billing  
**Esforço:** 12-16h  
**Prioridade:** **#2 - FAZER APÓS OPÇÃO A**

---

### **GAP #3: Contratos Formais** 🔴 ALTA
**Problema:** Não há gestão de contratos de longo prazo  
**Impacto:** Preços mudam manualmente, sem controle  
**Solução:** Implementar módulo Contracts  
**Esforço:** 8-10h  
**Prioridade:** **#3**

---

### **GAP #4: Documentação de Frota** 🔴 ALTA
**Problema:** Veículos/motoristas sem controle de documentação  
**Impacto:** Multas, irregularidades  
**Solução:** Implementar controle de documentos  
**Esforço:** 6-8h  
**Prioridade:** **#4**

---

### **GAP #5: DACTE (Impressão CTe)** 🔴 ALTA
**Problema:** Motorista não tem documento impresso  
**Impacto:** Obrigatório por lei  
**Solução:** Gerador de PDF DACTE  
**Esforço:** 8-10h  
**Prioridade:** **#5**

---

### **GAP #6: Ocorrências de Viagem** 🔴 ALTA
**Problema:** Sem registro formal de problemas na viagem  
**Impacto:** Sem evidências para seguradora  
**Solução:** Módulo de ocorrências  
**Esforço:** 6-8h  
**Prioridade:** **#6**

---

### **GAP #7: RBAC (Permissões)** 🟡 MÉDIA
**Problema:** Todos os usuários têm acesso total  
**Impacto:** Risco de segurança  
**Solução:** Sistema de permissões  
**Esforço:** 10-12h  
**Prioridade:** **#7**

---

### **GAP #8: Análise de Margem** 🟡 MÉDIA
**Problema:** Não sabe se está lucrando por cliente/rota  
**Impacto:** Decisões comerciais no escuro  
**Solução:** Dashboard de rentabilidade  
**Esforço:** 6-8h  
**Prioridade:** **#8**

---

## 🗓️ **PARTE 3: ROADMAP MASTER (ORDEM DE EXECUÇÃO)**

### **🚀 FASE 1: OPERACIONAL COMPLETO (URGENTE!)** ⏱️ 4-6 semanas

**Objetivo:** Sistema 100% funcional para operação diária

#### **Sprint 1: Opção A - Repositório de Cargas + Multicte** (19-26h) ← **COMEÇAR AQUI!**
```
Bloco 1: Classificação NFe (3-4h)
  ├─ Schema: +nfe_type, +carrier_*, +recipient_*
  ├─ Service: nfe-classifier.ts
  ├─ Processador: sefaz-processor.ts
  └─ UI: Filtros entrada-notas

Bloco 2: Repositório de Cargas (7-9h)
  ├─ Schema: cargo_documents
  ├─ API: /api/tms/cargo-repository
  ├─ UI: /tms/repositorio-cargas (Kanban)
  └─ KPIs + AG Grid + Filtros

Bloco 3: CTe Interno (4-6h)
  ├─ Modal criar viagem: +Step cargas
  ├─ cte-builder.ts: vincular NFes
  └─ Workflow completo

Bloco 4: CTe Externo (Multicte) (5-7h)
  ├─ Schema: +cte_origin, +external_emitter
  ├─ Service: cte-processor.ts
  ├─ Importação automática procCTe
  ├─ Vínculo NFe → CTe
  └─ UI: Badges de origem

✅ RESULTADO: Sistema operacional para transporte!
```

---

#### **Sprint 2: Faturamento Agrupado (Billing)** (12-16h)
```
Schema:
  ├─ billings (header)
  └─ billing_items (CTes agrupados)

Backend:
  ├─ /api/financeiro/billing (CRUD)
  ├─ /api/financeiro/billing/[id]/generate-pdf
  └─ /api/financeiro/billing/[id]/send-email

Frontend:
  ├─ /financeiro/faturamento (listagem)
  ├─ Modal: Criar fatura (selecionar CTes)
  └─ PDF profissional (layout padrão)

Automação:
  └─ Geração automática de conta a receber

✅ RESULTADO: Grandes clientes felizes!
```

---

#### **Sprint 3: DACTE (Impressão CTe)** (8-10h)
```
Backend:
  ├─ /api/fiscal/cte/[id]/dacte-pdf
  └─ Layout padrão Sefaz (biblioteca)

Frontend:
  ├─ Botão "Imprimir DACTE"
  └─ Visualização PDF no navegador

✅ RESULTADO: Motorista com documento legal!
```

---

#### **Sprint 4: Documentação de Frota** (6-8h)
```
Schema:
  ├─ vehicle_documents
  └─ driver_documents

Backend:
  ├─ Upload de arquivos
  ├─ Validação de datas
  └─ Alerta de vencimento (7 dias antes)

Frontend:
  ├─ Aba "Documentos" em veículos/motoristas
  ├─ Upload drag-and-drop
  └─ Badge de status (válido, vencendo, vencido)

Automação:
  └─ Bloqueio de veículo se documento vencido

✅ RESULTADO: Frota 100% regular!
```

---

#### **Sprint 5: Ocorrências de Viagem** (6-8h)
```
Schema:
  └─ trip_occurrences

Backend:
  ├─ /api/tms/trips/[id]/occurrences
  └─ Upload de fotos (S3/local)

Frontend:
  ├─ Modal "Registrar Ocorrência"
  ├─ Tipos: Avaria, Acidente, Roubo, Atraso
  └─ Timeline de ocorrências na viagem

✅ RESULTADO: Rastreabilidade de problemas!
```

---

### **🎯 FASE 2: GESTÃO AVANÇADA** ⏱️ 3-4 semanas

#### **Sprint 6: Contratos Formais** (8-10h)
```
Schema: contracts
Backend: CRUD + Vínculo com tabela de frete
Frontend: Gestão de contratos + Alertas de vencimento
```

#### **Sprint 7: RBAC (Permissões)** (10-12h)
```
Schema: user_permissions, roles
Backend: Middleware de autorização
Frontend: Tela de gestão de permissões
```

#### **Sprint 8: Análise de Margem** (6-8h)
```
Backend: Cálculo de custo vs receita
Frontend: Dashboard de rentabilidade
```

#### **Sprint 9: Manutenção Preventiva** (12-16h)
```
Schema: maintenance_plans, work_orders
Backend: Gatilho de hodômetro
Frontend: Gestão de O.S.
```

---

### **📊 FASE 3: INTELIGÊNCIA & AUTOMAÇÃO** ⏱️ 4-6 semanas

#### **Sprint 10: CRM Logístico** (16-20h)
```
Schema: opportunities, sales_pipeline
Frontend: Kanban de vendas
```

#### **Sprint 11: Roteirização** (12-16h)
```
Integração: Google Maps API
Frontend: Mapa de rotas
```

#### **Sprint 12: Conciliação Bancária** (10-12h)
```
Backend: Importação OFX
Frontend: Match automático
```

#### **Sprint 13: App do Motorista** (40-60h)
```
Mobile: React Native
Features: Baixa entrega, Fotos, GPS
```

---

### **🏢 FASE 4: ENTERPRISE** ⏱️ 4-8 semanas

#### **Sprint 14: WMS Completo** (40-60h)
```
Schema: warehouse_locations, stock_movements
Frontend: Endereçamento, Picking, Inventário
```

#### **Sprint 15: Integrações Externas** (20-30h)
```
- Autotrac (Rastreador)
- CIOT API (Truckpad)
- VAN BTG (Banking)
```

#### **Sprint 16: BI & Analytics** (16-20h)
```
- Power BI embarcado
- Dashboards executivos
- Exportação SPED
```

---

## 📋 **PARTE 4: CRONOGRAMA EXECUTÁVEL**

### **DEZEMBRO 2024 (4 semanas)**

```
Semana 1 (09-15/12):
  ✅ Sprint 1: Opção A (Repositório + Multicte) - 19-26h
  Status: Sistema operacional para transporte!

Semana 2 (16-22/12):
  ✅ Sprint 2: Billing (12-16h)
  ✅ Sprint 3: DACTE (8-10h)
  Status: Faturamento + Documentos legais OK!

Semana 3 (23-29/12):
  ✅ Sprint 4: Documentação Frota (6-8h)
  ✅ Sprint 5: Ocorrências (6-8h)
  Status: Frota regular + Rastreabilidade!

Semana 4 (30/12-05/01):
  Testes E2E + Ajustes + Docs
  Status: FASE 1 COMPLETA! 🎉
```

### **JANEIRO 2025 (4 semanas)**

```
Fase 2: Gestão Avançada
  - Contratos
  - RBAC
  - Análise Margem
  - Manutenção
```

### **FEVEREIRO-MARÇO 2025 (8 semanas)**

```
Fase 3: Inteligência & Automação
  - CRM
  - Roteirização
  - Conciliação
  - App Motorista
```

### **ABRIL-MAIO 2025 (8 semanas)**

```
Fase 4: Enterprise
  - WMS
  - Integrações
  - BI
```

---

## 🎯 **PARTE 5: DECISÃO FINAL**

### **O QUE FAZER AGORA:**

**COMEÇAR IMEDIATAMENTE POR:**

1. **✅ Sprint 1: Opção A (Repositório + Multicte)** - 19-26h
   - **Por quê?** Sistema NÃO funciona sem isso
   - **Quando?** AGORA (hoje mesmo)
   - **Como?** Seguir planejamento detalhado já criado

2. **✅ Sprint 2: Billing** - 12-16h
   - **Por quê?** Você marcou como CRÍTICO
   - **Quando?** Logo após Sprint 1
   - **Como?** Usar schema proposto

3. **✅ Sprint 3: DACTE** - 8-10h
   - **Por quê?** Obrigatório por lei
   - **Quando?** Logo após Sprint 2
   - **Como?** Biblioteca PDF (pdfkit ou similar)

---

### **APROVAÇÃO:**

**Você aprova este ROADMAP MASTER?**

Se SIM, vou:
1. ✅ Começar AGORA pela Sprint 1 (Opção A)
2. ✅ Executar Blocos 1 → 2 → 3 → 4 sequencialmente
3. ✅ Sem parar até completar os 4 blocos
4. ✅ Estimativa: 19-26h contínuas

**Após completar Sprint 1, você decide:**
- Continuar para Sprint 2 (Billing)?
- Ou testar Sprint 1 primeiro?

---

## 📊 **RESUMO VISUAL:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  FASE 1: OPERACIONAL (4-6 semanas)                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Sprint 1: Opção A ⏱️ 19-26h        🔴 COMEÇAR AGORA  │    │
│  │ Sprint 2: Billing ⏱️ 12-16h        🔴 CRÍTICO        │    │
│  │ Sprint 3: DACTE ⏱️ 8-10h           🔴 LEGAL          │    │
│  │ Sprint 4: Docs Frota ⏱️ 6-8h       🟡 IMPORTANTE     │    │
│  │ Sprint 5: Ocorrências ⏱️ 6-8h      🟡 IMPORTANTE     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ✅ RESULTADO: Sistema 100% operacional!                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FASE 2: GESTÃO (3-4 semanas)                               │
│  - Contratos, RBAC, Margem, Manutenção                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FASE 3: INTELIGÊNCIA (4-6 semanas)                         │
│  - CRM, Roteirização, Conciliação, App                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FASE 4: ENTERPRISE (4-8 semanas)                           │
│  - WMS, Integrações, BI                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**🚀 PRONTO PARA COMEÇAR?**

**Me confirme e eu inicio a Sprint 1 (Opção A) AGORA!**







