# 🏗️ MASTER PLAN - MARATONA DE DESENVOLVIMENTO AURACORE

**Analista:** Senior Developer & Database Architect  
**Data:** 08/12/2025  
**Tipo:** Análise Profunda + Roadmap de Implementação  
**Objetivo:** Desenvolver 8 módulos completos sem interrupções

---

## 📊 **SUMÁRIO EXECUTIVO**

### **Escopo Total:**
- **8 Módulos Principais**
- **47 Funcionalidades Críticas**
- **~35 Tabelas Novas**
- **~60 APIs**
- **~40 Telas**

### **Estimativa Realista:**
- **Tempo Total:** 180-220 horas (~4-5 semanas intensivas)
- **Complexidade:** ALTA
- **Dependências:** Múltiplas integrações externas

### **Recomendação:**
**Implementar em ONDAS** (não tudo de uma vez):
- Onda 1 (Crítico): Módulos 3, 5 - 40h
- Onda 2 (Alto): Módulos 1, 4 - 60h
- Onda 3 (Médio): Módulos 6, 8 - 50h
- Onda 4 (Baixo): Módulos 2, 7 - 40h

---

## 🎯 **PARTE 1: ANÁLISE DETALHADA POR MÓDULO**

---

## **1️⃣ MÓDULO COMERCIAL (A Inteligência)**

### **Funcionalidades Solicitadas:**
1. CRM Logístico (Funil de Vendas)
2. Reajuste em Lote de Tabelas
3. Gerador de Propostas PDF

### **📊 ANÁLISE TÉCNICA:**

#### **1.1 CRM Logístico - Funil de Vendas**

**Benchmark de Mercado:**
- Pipedrive, HubSpot, Salesforce (referências)
- Funil típico logística: Prospecção → Qualificação → Proposta → Negociação → Fechamento

**Complexidade:** 🟡 MÉDIA-ALTA

**Schema Necessário:**
```sql
-- Leads/Prospects
CREATE TABLE crm_leads (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  -- Dados Básicos
  company_name NVARCHAR(255) NOT NULL,
  cnpj NVARCHAR(18),
  contact_name NVARCHAR(255),
  contact_email NVARCHAR(255),
  contact_phone NVARCHAR(20),
  
  -- Classificação
  segment NVARCHAR(50), -- 'E-COMMERCE', 'INDUSTRIA', 'VAREJO', 'DISTRIBUIDOR'
  source NVARCHAR(50), -- 'INBOUND', 'OUTBOUND', 'INDICAÇÃO', 'EVENTO'
  
  -- Funil
  stage NVARCHAR(50) NOT NULL, -- 'PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'
  score INT DEFAULT 0, -- Lead Scoring (0-100)
  
  -- Oportunidade
  estimated_value DECIMAL(18,2),
  estimated_monthly_shipments INT,
  expected_close_date DATE,
  probability INT, -- % de chance de fechar
  
  -- Responsável
  owner_id NVARCHAR(255) NOT NULL, -- FK users (vendedor)
  
  -- Status
  status NVARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, WON, LOST
  lost_reason NVARCHAR(500),
  won_date DATETIME2,
  
  ...enterprise_base
);

-- Atividades (Interações)
CREATE TABLE crm_activities (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  lead_id INT, -- FK crm_leads
  partner_id INT, -- FK business_partners (se já for cliente)
  
  type NVARCHAR(50) NOT NULL, -- 'CALL', 'EMAIL', 'MEETING', 'WHATSAPP', 'SITE_VISIT'
  subject NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  
  scheduled_at DATETIME2,
  completed_at DATETIME2,
  status NVARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
  
  assigned_to NVARCHAR(255), -- FK users
  
  ...enterprise_base
);

-- Produtos Interesse
CREATE TABLE crm_lead_products (
  id INT IDENTITY PRIMARY KEY,
  lead_id INT NOT NULL,
  
  route_type NVARCHAR(50), -- 'FRACIONADO', 'DEDICADO', 'TRANSFERENCIA'
  origin_uf NVARCHAR(2),
  destination_uf NVARCHAR(2),
  monthly_volume DECIMAL(18,2),
  
  created_at DATETIME2 DEFAULT GETDATE()
);
```

**APIs Necessárias:**
- `GET/POST /api/commercial/leads` - CRUD de leads
- `GET /api/commercial/leads/:id/timeline` - Histórico de interações
- `POST /api/commercial/leads/:id/move-stage` - Mover no funil
- `POST /api/commercial/activities` - Registrar atividade
- `GET /api/commercial/pipeline` - Dashboard do funil

**Telas:**
1. `/comercial/crm` - Lista de leads (Kanban + Tabela)
2. `/comercial/crm/:id` - Detalhes do lead + Timeline
3. `/comercial/crm/novo` - Novo lead
4. `/comercial/pipeline` - Dashboard (funil visual)

**Integrações:**
- Email (SMTP) para envio automático
- WhatsApp API (opcional)
- Google Calendar (agendamento)

**Tempo Estimado:** 16-20h

---

#### **1.2 Reajuste em Lote**

**Benchmark:**
- TMS Linx, Softruck (têm essa feature)
- Comum: "Reajustar todas tabelas de SP em X%"

**Complexidade:** 🟢 MÉDIA

**Schema Necessário:**
```sql
-- Histórico de Reajustes
CREATE TABLE freight_table_adjustments (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  description NVARCHAR(255) NOT NULL, -- "Reajuste Anual 2025"
  adjustment_type NVARCHAR(20) NOT NULL, -- 'PERCENTAGE', 'FIXED_VALUE'
  adjustment_value DECIMAL(5,2) NOT NULL, -- 5.00 (5%)
  
  -- Filtros Aplicados
  filter_origin_uf NVARCHAR(2),
  filter_destination_uf NVARCHAR(2),
  filter_customer_id INT, -- FK business_partners
  filter_table_ids NVARCHAR(MAX), -- JSON array de IDs
  
  -- Resultado
  rows_affected INT,
  
  applied_at DATETIME2,
  applied_by NVARCHAR(255) NOT NULL,
  
  ...enterprise_base
);
```

**Lógica:**
```typescript
// Exemplo de reajuste
UPDATE freight_table_items
SET price = price * (1 + (adjustment_value / 100))
WHERE 
  table_id IN (
    SELECT id FROM freight_tables 
    WHERE origin_uf = 'SP' 
    AND deleted_at IS NULL
  )
```

**APIs:**
- `POST /api/commercial/freight-tables/bulk-adjust` - Aplicar reajuste
- `GET /api/commercial/freight-tables/adjust-preview` - Preview do impacto

**Tela:**
- `/comercial/tabelas-frete/reajuste` - Formulário de reajuste

**Tempo Estimado:** 4-6h

---

#### **1.3 Gerador de Propostas PDF**

**Benchmark:**
- Propostas típicas incluem: Logo, Dados cliente, Rotas, Preços, Condições, Validade

**Complexidade:** 🟢 MÉDIA

**Schema:**
```sql
CREATE TABLE commercial_proposals (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  proposal_number NVARCHAR(20) NOT NULL, -- "PROP-2025-001"
  lead_id INT, -- FK crm_leads
  partner_id INT, -- FK business_partners
  
  status NVARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED
  
  -- Conteúdo
  routes NVARCHAR(MAX), -- JSON
  prices NVARCHAR(MAX), -- JSON
  conditions NVARCHAR(MAX),
  validity_days INT DEFAULT 15,
  
  -- PDFs
  pdf_url NVARCHAR(500),
  
  sent_at DATETIME2,
  sent_to_email NVARCHAR(255),
  
  accepted_at DATETIME2,
  rejected_at DATETIME2,
  rejection_reason NVARCHAR(500),
  
  ...enterprise_base
);
```

**Bibliotecas:**
- `@react-pdf/renderer` ou `pdfkit` (já instalado)

**Template PDF:**
```
┌─────────────────────────────────────┐
│ [LOGO EMPRESA]                      │
│                                     │
│ PROPOSTA COMERCIAL #PROP-2025-001  │
│                                     │
│ Cliente: [Nome]                     │
│ CNPJ: [CNPJ]                       │
│ Contato: [Nome/Email]              │
│                                     │
│ ─────────────────────────────────  │
│                                     │
│ ROTAS E PREÇOS:                    │
│                                     │
│ Origem → Destino | Valor | Prazo   │
│ SP → RJ         | R$ XX | 2 dias   │
│                                     │
│ CONDIÇÕES COMERCIAIS:              │
│ - Pagamento: 30 dias               │
│ - Validade: 15 dias                │
│                                     │
│ [Assinatura Digital]               │
└─────────────────────────────────────┘
```

**APIs:**
- `POST /api/commercial/proposals` - Criar proposta
- `GET /api/commercial/proposals/:id/pdf` - Gerar PDF
- `POST /api/commercial/proposals/:id/send-email` - Enviar por email

**Telas:**
- `/comercial/propostas` - Lista
- `/comercial/propostas/:id` - Detalhes + Preview PDF
- `/comercial/propostas/nova` - Criar

**Tempo Estimado:** 8-10h

---

### **📊 RESUMO MÓDULO 1:**

| Funcionalidade | Complexidade | Tempo | Prioridade |
|----------------|--------------|-------|------------|
| CRM Funil | 🟡 Média-Alta | 16-20h | 🟡 MÉDIA |
| Reajuste Lote | 🟢 Média | 4-6h | 🟢 BAIXA |
| Propostas PDF | 🟢 Média | 8-10h | 🟡 MÉDIA |

**Total Módulo 1:** 28-36 horas

**Correlações:**
- CRM → Propostas (lead vira proposta)
- Propostas → Cotações (proposta aceita vira cotação)
- CRM → Partners (lead vencido vira cliente)

---

## **2️⃣ MÓDULO FISCAL - ENTRADA (Inbound)**

### **Funcionalidades Solicitadas:**
1. Manifestação do Destinatário
2. Conversão de Unidade

### **📊 ANÁLISE TÉCNICA:**

#### **2.1 Manifestação do Destinatário**

**Conceito:**
Quando você recebe uma NFe (compra), PRECISA manifestar na Sefaz:
- **Ciência da Operação** (210200) - "Recebi, estou ciente"
- **Confirmação da Operação** (210210) - "Recebi e está OK"
- **Desconhecimento** (210220) - "Não conheço essa NFe"
- **Operação Não Realizada** (210240) - "Não recebi"

**Complexidade:** 🔴 ALTA (integração Sefaz)

**Schema:**
```sql
CREATE TABLE nfe_manifestation_events (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  inbound_invoice_id INT NOT NULL, -- FK inbound_invoices
  
  event_type NVARCHAR(10) NOT NULL, -- '210200', '210210', '210220', '210240'
  event_description NVARCHAR(100),
  justification NVARCHAR(500), -- Obrigatório para Desconhecimento
  
  -- Sefaz
  protocol_number NVARCHAR(20),
  status NVARCHAR(20) DEFAULT 'PENDING', -- PENDING, SENT, CONFIRMED, REJECTED
  sefaz_return_code NVARCHAR(10),
  sefaz_return_message NVARCHAR(500),
  
  sent_at DATETIME2,
  confirmed_at DATETIME2,
  
  xml_event NVARCHAR(MAX), -- XML do evento
  
  ...enterprise_base
);
```

**Webservice Sefaz:**
- URL: `https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento.asmx` (SP)
- SOAP similar ao CTe
- Precisa assinar XML do evento

**XML Exemplo:**
```xml
<envEvento versao="1.00">
  <idLote>1</idLote>
  <evento versao="1.00">
    <infEvento>
      <cOrgao>35</cOrgao>
      <tpAmb>2</tpAmb>
      <CNPJ>11111111111111</CNPJ>
      <chNFe>35250311111111111111550010000001231000000123</chNFe>
      <dhEvento>2025-12-08T10:00:00-03:00</dhEvento>
      <tpEvento>210200</tpEvento>
      <nSeqEvento>1</nSeqEvento>
      <verEvento>1.00</verEvento>
      <detEvento versao="1.00">
        <descEvento>Ciencia da Operacao</descEvento>
      </detEvento>
    </infEvento>
  </evento>
</envEvento>
```

**APIs:**
- `POST /api/fiscal/nfe/:id/manifest` - Enviar manifestação
- `GET /api/fiscal/nfe/:id/manifestation-status` - Consultar status

**Tela:**
- Adicionar botões na tela `/fiscal/entrada-notas`:
  - [Ciência]
  - [Confirmar Operação]
  - [Desconhecer]
  - [Não Realizada]

**Tempo Estimado:** 12-16h

---

#### **2.2 Conversão de Unidade**

**Conceito:**
- XML diz: "1 Caixa"
- Estoque precisa: "12 Unidades"

**Complexidade:** 🟢 BAIXA-MÉDIA

**Schema:**
```sql
-- Já existe: products
-- Adicionar campos:
ALTER TABLE products ADD
  unit_conversion_enabled NVARCHAR(1) DEFAULT 'N',
  unit_conversion_factor DECIMAL(10,4), -- 12.0000 (1 CX = 12 UN)
  primary_unit NVARCHAR(10), -- 'UN', 'KG', 'L'
  secondary_unit NVARCHAR(10); -- 'CX', 'PCT', 'FD'

-- Tabela de conversões múltiplas
CREATE TABLE product_unit_conversions (
  id INT IDENTITY PRIMARY KEY,
  product_id INT NOT NULL,
  
  from_unit NVARCHAR(10) NOT NULL, -- 'CX'
  to_unit NVARCHAR(10) NOT NULL, -- 'UN'
  factor DECIMAL(10,4) NOT NULL, -- 12.0000
  
  created_at DATETIME2 DEFAULT GETDATE()
);
```

**Lógica:**
```typescript
// Ao importar NFe:
if (product.unitConversionEnabled === 'S') {
  const quantityInStock = xmlQuantity * product.unitConversionFactor;
  // Ex: 1 CX * 12 = 12 UN
}
```

**APIs:**
- `POST /api/products/:id/conversions` - Configurar conversão
- `GET /api/products/:id/conversions` - Listar conversões

**Tela:**
- `/cadastros/produtos/:id` - Aba "Conversões de Unidade"

**Tempo Estimado:** 4-6h

---

### **📊 RESUMO MÓDULO 2:**

| Funcionalidade | Complexidade | Tempo | Prioridade |
|----------------|--------------|-------|------------|
| Manifestação | 🔴 Alta | 12-16h | 🟢 BAIXA |
| Conversão UN | 🟢 Baixa-Média | 4-6h | 🟢 BAIXA |

**Total Módulo 2:** 16-22 horas

---

## **3️⃣ MÓDULO FISCAL - SAÍDA (Outbound)**

### **Funcionalidades Solicitadas:**
1. Inutilização de Numeração CTe
2. Carta de Correção (CC-e)
3. Cancelamento CTe (JÁ IMPLEMENTADO ✅)
4. NFS-e (Nota Fiscal de Serviços)

### **📊 ANÁLISE TÉCNICA:**

#### **3.1 Inutilização de Numeração**

**Conceito:**
Se você pulou o número 123 do CTe (emitiu 122, depois 124), PRECISA inutilizar o 123 na Sefaz.

**Complexidade:** 🟡 MÉDIA

**Schema:**
```sql
CREATE TABLE cte_inutilization (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  serie NVARCHAR(3) NOT NULL,
  number_from INT NOT NULL, -- 123
  number_to INT NOT NULL, -- 123 (ou range 123-125)
  year INT NOT NULL, -- 2025
  justification NVARCHAR(500) NOT NULL, -- Mín. 15 caracteres
  
  -- Sefaz
  protocol_number NVARCHAR(20),
  status NVARCHAR(20) DEFAULT 'PENDING',
  sefaz_return_message NVARCHAR(500),
  
  inutilized_at DATETIME2,
  
  ...enterprise_base
);
```

**Webservice:**
- Similar ao envio de CTe
- Método: `cteInutilizacao`

**APIs:**
- `POST /api/fiscal/cte/inutilize` - Inutilizar numeração

**Tela:**
- `/fiscal/cte/inutilizacao` - Formulário

**Tempo Estimado:** 6-8h

---

#### **3.2 Carta de Correção (CC-e)**

**Conceito:**
Corrigir erros SIMPLES no CTe já autorizado (ex: telefone errado).
NÃO pode corrigir valores, datas, CNPJ.

**Complexidade:** 🟡 MÉDIA

**Schema:**
```sql
CREATE TABLE cte_correction_letters (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  cte_header_id INT NOT NULL,
  
  sequence_number INT NOT NULL, -- Pode haver múltiplas CCe
  corrections NVARCHAR(MAX) NOT NULL, -- JSON: [{field, oldValue, newValue}]
  
  -- Sefaz
  protocol_number NVARCHAR(20),
  status NVARCHAR(20) DEFAULT 'PENDING',
  
  xml_event NVARCHAR(MAX),
  
  ...enterprise_base
);
```

**APIs:**
- `POST /api/fiscal/cte/:id/correction` - Enviar CC-e

**Tela:**
- Modal na tela de CTe

**Tempo Estimado:** 6-8h

---

#### **3.3 Cancelamento CTe**

✅ **JÁ IMPLEMENTADO!**
- API: `POST /api/fiscal/cte/:id/cancel`
- Funcional!

---

#### **3.4 NFS-e (Nota Fiscal de Serviços)**

**Conceito:**
Emitir NFSe para serviços de armazenagem, carga/descarga, paletização.

**Complexidade:** 🔴 MUITO ALTA

**Problema:**
- **Cada prefeitura tem um sistema diferente!**
- SP: NF Paulistana
- RJ: NFS-e Carioca
- Campinas: ISSQN Online
- SÃO CENTENAS DE PADRÕES DIFERENTES

**Soluções:**
1. **Opção A (Recomendada):** Integrar com **agregador** (ex: **Focus NFe**, **NFE.io**, **PlugNotas**)
   - Eles abstraem a complexidade
   - Cobram por nota (~R$ 0,15-0,30/nota)
   - APIs padronizadas

2. **Opção B:** Implementar manualmente para 1-2 prefeituras críticas
   - Muito trabalhoso
   - Manutenção cara

**Recomendação:** **NÃO IMPLEMENTAR AGORA**
- Prioridade baixa
- Complexidade desproporcional
- Melhor usar agregador quando necessário

**Se INSISTIR em implementar:**

**Schema:**
```sql
CREATE TABLE nfse_header (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  nfse_number NVARCHAR(20),
  verification_code NVARCHAR(20),
  
  customer_id INT NOT NULL,
  service_code NVARCHAR(10) NOT NULL, -- Código CNAE
  service_description NVARCHAR(500),
  
  service_value DECIMAL(18,2) NOT NULL,
  iss_rate DECIMAL(5,2), -- Alíquota ISS
  iss_value DECIMAL(18,2),
  
  status NVARCHAR(20) DEFAULT 'DRAFT',
  
  xml_signed NVARCHAR(MAX),
  pdf_url NVARCHAR(500),
  
  ...enterprise_base
);
```

**Tempo Estimado (se implementar):** 40-60h POR PREFEITURA

**Minha Recomendação:** **PULAR POR ENQUANTO** ou usar **Focus NFe API**

---

### **📊 RESUMO MÓDULO 3:**

| Funcionalidade | Complexidade | Tempo | Prioridade | Status |
|----------------|--------------|-------|------------|--------|
| Inutilização | 🟡 Média | 6-8h | 🟡 MÉDIA | Pendente |
| CC-e | 🟡 Média | 6-8h | 🟢 BAIXA | Pendente |
| Cancelamento | 🟢 Baixa | - | - | ✅ **FEITO** |
| NFS-e | 🔴 Muito Alta | 40-60h | 🟢 BAIXA | **PULAR** |

**Total Módulo 3:** 12-16 horas (sem NFS-e)

---

## **4️⃣ MÓDULO TMS (Operacional)**

Este é o MAIOR e mais COMPLEXO módulo! Vou dividir:

### **Funcionalidades Solicitadas:**
1. Visão Macro (Cockpit/Dashboard)
2. Visão Operacional (Torre de Controle)
3. Plano de Viagem + Co-Piloto
4. Controle de Jornada

### **📊 ANÁLISE TÉCNICA:**

#### **4.1 Visão Macro (Cockpit)**

**Conceito:**
Dashboard executivo com KPIs críticos.

**Complexidade:** 🟡 MÉDIA

**KPIs:**
- Entregas no Prazo (%)
- Entregas em Atraso (%)
- Ocorrências em Aberto (#)
- Viagens em Andamento (#)
- Mapa de Calor (onde estão os gargalos)

**Queries:**
```sql
-- On-Time Delivery (OTD)
SELECT 
  COUNT(CASE WHEN actual_delivery_date <= promised_delivery_date THEN 1 END) * 100.0 / COUNT(*) as otd_percentage
FROM trips
WHERE status = 'COMPLETED'
AND deleted_at IS NULL;

-- Ocorrências em Aberto
SELECT COUNT(*) 
FROM trip_occurrences 
WHERE status = 'OPEN'
AND deleted_at IS NULL;
```

**Tela:**
- `/tms/cockpit` - Dashboard com:
  - Cards de KPIs (NumberCounter animado)
  - Gráficos (Chart.js ou Recharts)
  - Mapa (Google Maps API)
  - Lista de alertas

**Tempo Estimado:** 8-10h

---

#### **4.2 Visão Operacional (Torre de Controle)**

**Conceito:**
Tela onde o analista TMS trabalha o dia todo.
Monitor em tempo real de todas as entregas.

**Complexidade:** 🔴 ALTA

**Schema (expansão):**
```sql
-- Já existe: trips
-- Adicionar campos:
ALTER TABLE trips ADD
  promised_delivery_date DATETIME2, -- SLA do cliente
  estimated_delivery_date DATETIME2, -- ETA (estimado)
  actual_delivery_date DATETIME2, -- Real
  
  substatus NVARCHAR(50), -- Sub-status granular
  -- Ex: 'WAITING_UNLOAD', 'WAITING_DOCK', 'TRAFFIC_JAM'
  
  sla_status NVARCHAR(20) DEFAULT 'ON_TIME',
  -- 'ON_TIME', 'AT_RISK', 'DELAYED'
  
  last_checkpoint_at DATETIME2,
  last_checkpoint_location NVARCHAR(255);

-- Timeline de Eventos (Checkpoints)
CREATE TABLE trip_checkpoints (
  id INT IDENTITY PRIMARY KEY,
  trip_id INT NOT NULL,
  
  checkpoint_type NVARCHAR(50) NOT NULL,
  -- 'ORDER_CREATED', 'PICKED', 'IN_TRANSIT', 'DELIVERED'
  
  description NVARCHAR(500),
  
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location_address NVARCHAR(500),
  
  recorded_at DATETIME2 NOT NULL,
  recorded_by NVARCHAR(255), -- user_id ou 'SYSTEM'
  
  created_at DATETIME2 DEFAULT GETDATE()
);
```

**Funcionalidades:**
1. **Timeline Visual:**
   ```
   ┌─────────────────────────────────────┐
   │ ● Pedido Criado (08/12 10:00)      │
   │ │                                    │
   │ ● Separado (08/12 11:30)           │
   │ │                                    │
   │ ● Em Trânsito (08/12 14:00)        │
   │ │                                    │
   │ ◯ Aguardando Entrega (estimado)    │
   │ │                                    │
   │ ◯ Entregue (previsto 09/12 08:00) │
   └─────────────────────────────────────┘
   ```

2. **Gestão de Ocorrências:**
   - Modal para registrar: Avaria, Cliente Ausente, Recusa
   - Upload de fotos (usar S3 ou storage local)
   - Reagendamento automático

3. **SLA Visual:**
   ```
   Prometido: 09/12 08:00
   Estimado: 09/12 10:00  [🟡 AT_RISK]
   ```

4. **Sub-status Granulares:**
   - Status Macro: EM_VIAGEM
   - Sub-status: AGUARDANDO_DESCARGA, FILA_CLIENTE, etc.

**APIs:**
- `POST /api/tms/trips/:id/checkpoint` - Registrar checkpoint
- `POST /api/tms/trips/:id/occurrence` - Registrar ocorrência
- `PUT /api/tms/trips/:id/reschedule` - Reagendar entrega
- `GET /api/tms/control-tower` - Dados da torre (lista ativa)

**Tela:**
- `/tms/torre-controle` - Grid AG Grid com:
  - Filtros (status, sub-status, SLA)
  - Cores por criticidade
  - Ações rápidas

**Tempo Estimado:** 20-24h

---

#### **4.3 Plano de Viagem + Co-Piloto**

**Conceito:**
- **Co-Piloto:** Pessoa interna que acompanha o motorista
- **Plano de Viagem:** Roteiro detalhado com paradas, rotas, abastecimentos

**Complexidade:** 🔴 MUITO ALTA (integração Google Maps + Autotrac)

**Schema:**
```sql
-- Co-Piloto (pode ser tabela separada ou usar employees)
CREATE TABLE co_pilots (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  name NVARCHAR(255) NOT NULL,
  email NVARCHAR(255),
  phone NVARCHAR(20),
  
  status NVARCHAR(20) DEFAULT 'ACTIVE',
  
  ...enterprise_base
);

-- Plano de Viagem
CREATE TABLE trip_plans (
  id INT IDENTITY PRIMARY KEY,
  trip_id INT NOT NULL UNIQUE,
  co_pilot_id INT, -- FK co_pilots
  
  -- Roteirização
  planned_route NVARCHAR(MAX), -- JSON Google Maps route
  total_distance_km DECIMAL(10,2),
  estimated_duration_hours DECIMAL(5,2),
  
  -- Paradas Planejadas
  planned_stops NVARCHAR(MAX), -- JSON
  
  -- Abastecimento
  fuel_stops NVARCHAR(MAX), -- JSON com postos sugeridos
  
  created_at DATETIME2 DEFAULT GETDATE()
);

-- Paradas (Deliveries na Rota)
CREATE TABLE trip_plan_stops (
  id INT IDENTITY PRIMARY KEY,
  trip_plan_id INT NOT NULL,
  
  sequence INT NOT NULL, -- Ordem da parada
  stop_type NVARCHAR(20) NOT NULL, -- 'DELIVERY', 'FUEL', 'REST'
  
  address NVARCHAR(500),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  estimated_arrival DATETIME2,
  actual_arrival DATETIME2,
  
  status NVARCHAR(20) DEFAULT 'PENDING',
  -- PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  
  created_at DATETIME2 DEFAULT GETDATE()
);

-- Integração Autotrac (Rastreador)
CREATE TABLE vehicle_tracking (
  id INT IDENTITY PRIMARY KEY,
  vehicle_id INT NOT NULL,
  trip_id INT,
  
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  speed_kmh INT,
  heading INT, -- Direção (0-360°)
  
  event_type NVARCHAR(50),
  -- 'IGNITION_ON', 'IGNITION_OFF', 'SPEEDING', 'PANIC_BUTTON'
  
  recorded_at DATETIME2 NOT NULL,
  
  created_at DATETIME2 DEFAULT GETDATE()
);
```

**Integrações:**

1. **Google Maps API:**
   - Directions API (roteirização)
   - Distance Matrix API (calcular distâncias)
   - Places API (postos de combustível)

2. **Autotrac API:**
   - Endpoint: `/api/autotrac/vehicles/:id/position`
   - Webhooks para macros de jornada
   - Precisa credenciais Autotrac

**Funcionalidades:**
1. Sugerir melhor rota
2. Sugerir postos de combustível (baseado em tabela de preços)
3. Calcular autonomia: `tanque_cheio / consumo_medio`
4. Monitorar posição real-time via Autotrac
5. Alertas se motorista desvia da rota

**APIs:**
- `POST /api/tms/trips/:id/plan` - Criar plano de viagem
- `GET /api/tms/trips/:id/plan/route` - Obter rota otimizada
- `GET /api/tms/trips/:id/tracking` - Posição atual (Autotrac)
- `POST /api/tms/trips/:id/fuel-stops` - Sugerir postos

**Telas:**
- `/tms/viagens/:id/plano` - Plano de viagem com mapa
- `/cadastros/co-pilotos` - Cadastro de co-pilotos

**Tempo Estimado:** 30-40h (ALTA COMPLEXIDADE)

---

#### **4.4 Controle de Jornada**

**Conceito:**
Monitorar jornada de trabalho do motorista (Lei 13.103/2015 - Lei do Caminhoneiro):
- Máximo 5h30 dirigindo sem parar
- Descanso mínimo 30min

**Complexidade:** 🟡 MÉDIA-ALTA

**Schema:**
```sql
CREATE TABLE driver_work_shifts (
  id INT IDENTITY PRIMARY KEY,
  driver_id INT NOT NULL,
  trip_id INT,
  
  shift_date DATE NOT NULL,
  
  -- Tempos
  started_at DATETIME2,
  ended_at DATETIME2,
  
  total_driving_hours DECIMAL(5,2),
  total_rest_hours DECIMAL(5,2),
  total_waiting_hours DECIMAL(5,2),
  
  -- Status
  status NVARCHAR(20) DEFAULT 'IN_PROGRESS',
  -- IN_PROGRESS, COMPLETED, VIOLATION
  
  violations NVARCHAR(MAX), -- JSON de violações
  
  ...enterprise_base
);

-- Eventos de Jornada (via Autotrac ou Manual)
CREATE TABLE driver_shift_events (
  id INT IDENTITY PRIMARY KEY,
  work_shift_id INT NOT NULL,
  
  event_type NVARCHAR(20) NOT NULL,
  -- 'DRIVE_START', 'DRIVE_END', 'REST_START', 'REST_END'
  
  event_time DATETIME2 NOT NULL,
  
  source NVARCHAR(20) DEFAULT 'MANUAL',
  -- MANUAL, AUTOTRAC, SYSTEM
  
  created_at DATETIME2 DEFAULT GETDATE()
);
```

**Lógica de Alertas:**
```typescript
// Se motorista dirigiu > 5.5h sem parar
if (currentDrivingTime > 5.5) {
  alert("VIOLAÇÃO: Motorista precisa descansar!");
  // Bloquear novo checkpoint até descansar
}
```

**Integração Autotrac:**
- Macros: `DRIVE_START` (motor ligado), `DRIVE_END` (motor desligado)
- Webhook da Autotrac envia eventos

**APIs:**
- `GET /api/tms/drivers/:id/current-shift` - Jornada atual
- `POST /api/tms/drivers/:id/shift-event` - Registrar evento
- `GET /api/tms/drivers/:id/shift-violations` - Violações

**Tela:**
- `/tms/jornada` - Dashboard de jornadas ativas
- `/tms/motoristas/:id/jornada` - Histórico do motorista

**Tempo Estimado:** 12-16h

---

### **📊 RESUMO MÓDULO 4:**

| Funcionalidade | Complexidade | Tempo | Prioridade |
|----------------|--------------|-------|------------|
| Cockpit | 🟡 Média | 8-10h | 🟡 MÉDIA |
| Torre Controle | 🔴 Alta | 20-24h | 🔴 CRÍTICA |
| Plano Viagem | 🔴 Muito Alta | 30-40h | 🟡 MÉDIA |
| Jornada | 🟡 Média-Alta | 12-16h | 🟢 BAIXA |

**Total Módulo 4:** 70-90 horas (MAIOR MÓDULO!)

**Dependências Externas:**
- ⚠️ **Google Maps API** (pago após limite free)
- ⚠️ **Autotrac API** (precisa credenciais)

---

## **5️⃣ MÓDULO FINANCEIRO & CONTROLADORIA**

### **Funcionalidades Solicitadas:**
1. Faturamento Agrupado (Billing) - CRÍTICO
2. Conciliação Bancária (OFX)
3. Fluxo de Caixa Projetado
4. API VAN BTG

### **📊 ANÁLISE TÉCNICA:**

#### **5.1 Faturamento Agrupado (Billing)**

**Conceito:**
Agrupar 50 CTes em um único boleto para o cliente.

**Complexidade:** 🔴 ALTA

**Estrutura JÁ CRIADA (Sprint 2):**
- ✅ `billing_invoices`
- ✅ `billing_items`

**Falta Implementar:**
1. Lógica de agrupamento (por cliente + período)
2. Geração de boleto (integração bancária)
3. PDF da fatura consolidada
4. Envio automático por email
5. Integração com Contas a Receber

**Workflow:**
```
1. Usuário acessa /financeiro/faturamento
2. Seleciona cliente + período (ex: Unilever, Novembro/2025)
3. Sistema lista todos os CTes do período
4. Usuário revisa e confirma
5. Sistema:
   a. Cria billing_invoice
   b. Vincula billing_items (cada CTe)
   c. Cria título no Contas a Receber
   d. Gera boleto (API bancária)
   e. Gera PDF da fatura
   f. Envia por email
```

**APIs Necessárias:**
- `POST /api/financial/billing/group` - Agrupar CTes
- `POST /api/financial/billing/:id/generate-boleto` - Gerar boleto
- `GET /api/financial/billing/:id/pdf` - PDF da fatura
- `POST /api/financial/billing/:id/send-email` - Enviar

**Integração Bancária (Boleto):**
- **Opção A:** Banco do Brasil (CNAB 240/400)
- **Opção B:** Itaú (ShopLine API)
- **Opção C:** Inter (API REST - mais fácil)
- **Opção D:** PagSeguro/PagBank (API REST)

**Tempo Estimado:** 16-20h

---

#### **5.2 Conciliação Bancária (OFX)**

**Conceito:**
Importar extrato bancário (arquivo OFX) e conciliar com Contas a Pagar/Receber.

**Complexidade:** 🟡 MÉDIA-ALTA

**Schema:**
```sql
CREATE TABLE bank_transactions (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  bank_account_id INT NOT NULL,
  
  transaction_date DATE NOT NULL,
  description NVARCHAR(500),
  amount DECIMAL(18,2) NOT NULL, -- Negativo = saída
  balance DECIMAL(18,2),
  
  transaction_type NVARCHAR(20), -- 'DEBIT', 'CREDIT', 'FEE'
  
  -- Conciliação
  reconciled NVARCHAR(1) DEFAULT 'N',
  reconciled_at DATETIME2,
  reconciled_by NVARCHAR(255),
  
  accounts_payable_id INT, -- FK
  accounts_receivable_id INT, -- FK
  
  ...enterprise_base
);
```

**Lógica:**
1. Usuário faz upload do OFX
2. Sistema parse (lib `ofx-js` ou similar)
3. Importa transações para `bank_transactions`
4. Tela mostra lado a lado:
   - Transações bancárias
   - Contas a Pagar/Receber
5. Usuário arrasta e solta para conciliar (ou matching automático)

**APIs:**
- `POST /api/financial/bank-transactions/import-ofx` - Upload OFX
- `POST /api/financial/bank-transactions/:id/reconcile` - Conciliar
- `GET /api/financial/bank-transactions/unreconciled` - Não conciliadas

**Biblioteca:**
- `ofx-js` ou `node-ofx-parser`

**Tela:**
- `/financeiro/conciliacao` - Tela de conciliação

**Tempo Estimado:** 12-16h

---

#### **5.3 Fluxo de Caixa Projetado**

**Conceito:**
Gráfico mostrando entradas vs saídas futuras (30/60/90 dias).

**Complexidade:** 🟢 MÉDIA

**Query:**
```sql
-- Entradas Futuras
SELECT 
  due_date,
  SUM(amount) as total_income
FROM accounts_receivable
WHERE status IN ('OPEN', 'PARTIALLY_PAID')
AND due_date >= GETDATE()
AND due_date <= DATEADD(day, 90, GETDATE())
GROUP BY due_date

UNION ALL

-- Saídas Futuras
SELECT 
  due_date,
  -SUM(amount) as total_expense
FROM accounts_payable
WHERE status IN ('OPEN', 'PARTIALLY_PAID')
AND due_date >= GETDATE()
AND due_date <= DATEADD(day, 90, GETDATE())
GROUP BY due_date
```

**Tela:**
- `/financeiro/fluxo-caixa` - Gráfico de linhas (Recharts)

**Tempo Estimado:** 6-8h

---

#### **5.4 API VAN BTG**

**Conceito:**
Integração com BTG Pactual para serviços bancários avançados.

**Complexidade:** 🔴 MUITO ALTA

**Problema:**
- Requer contrato com BTG
- Credenciais OAuth2
- Documentação extensa
- Testes em sandbox

**Recomendação:** **PULAR POR ENQUANTO**
- Prioridade baixa
- Só fazer quando tiver contrato fechado com BTG

**Se INSISTIR:**
- Tempo Estimado: 40-60h (incluindo testes)

---

### **📊 RESUMO MÓDULO 5:**

| Funcionalidade | Complexidade | Tempo | Prioridade |
|----------------|--------------|-------|------------|
| Billing | 🔴 Alta | 16-20h | 🔴 CRÍTICA |
| Conciliação OFX | 🟡 Média-Alta | 12-16h | 🟡 MÉDIA |
| Fluxo Caixa | 🟢 Média | 6-8h | 🟡 MÉDIA |
| API BTG | 🔴 Muito Alta | 40-60h | 🟢 BAIXA |

**Total Módulo 5:** 34-44 horas (sem API BTG)

---

## **6️⃣ MÓDULO FROTA (Ativos)**

### **Funcionalidades Solicitadas:**
1. Gestão de Pneus
2. Plano de Manutenção
3. Abastecimento

### **📊 ANÁLISE TÉCNICA:**

#### **6.1 Gestão de Pneus**

**Conceito:**
Controlar vida útil, rodízio, recapagem, CPK (custo por km).

**Complexidade:** 🟡 MÉDIA-ALTA

**Schema:**
```sql
CREATE TABLE tire_brands (
  id INT IDENTITY PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE tires (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  serial_number NVARCHAR(50) NOT NULL UNIQUE,
  brand_id INT,
  model NVARCHAR(100),
  size NVARCHAR(20), -- Ex: '295/80R22.5'
  
  purchase_date DATE,
  purchase_price DECIMAL(18,2),
  
  -- Localização
  status NVARCHAR(20) DEFAULT 'STOCK',
  -- STOCK, IN_USE, RECAPPING, SCRAPPED
  
  current_vehicle_id INT, -- FK vehicles
  position NVARCHAR(20), -- 'FRONT_LEFT', 'FRONT_RIGHT', 'REAR_1_LEFT', etc
  
  -- Uso
  initial_mileage INT, -- Km quando foi instalado
  current_mileage INT,
  total_km_used INT,
  
  recapping_count INT DEFAULT 0,
  
  ...enterprise_base
);

CREATE TABLE tire_movements (
  id INT IDENTITY PRIMARY KEY,
  tire_id INT NOT NULL,
  
  movement_type NVARCHAR(20) NOT NULL,
  -- 'INSTALL', 'REMOVE', 'ROTATE', 'RECAPPING', 'SCRAP'
  
  from_vehicle_id INT,
  from_position NVARCHAR(20),
  to_vehicle_id INT,
  to_position NVARCHAR(20),
  
  mileage_at_movement INT,
  
  notes NVARCHAR(500),
  
  ...enterprise_base
);
```

**KPIs:**
- CPK (Custo por Km): `purchase_price / total_km_used`
- Vida útil esperada vs real
- Taxa de recapagem

**APIs:**
- `POST /api/fleet/tires` - Cadastrar pneu
- `POST /api/fleet/tires/:id/install` - Instalar em veículo
- `POST /api/fleet/tires/:id/rotate` - Rodízio
- `POST /api/fleet/tires/:id/recapping` - Enviar para recapagem
- `GET /api/fleet/tires/analytics` - KPIs

**Telas:**
- `/frota/pneus` - Lista de pneus
- `/frota/pneus/:id` - Detalhes + Histórico
- `/frota/veiculos/:id/pneus` - Pneus do veículo (visual)

**Tempo Estimado:** 16-20h

---

#### **6.2 Plano de Manutenção**

**Conceito:**
Alertas automáticos: "Troca de óleo a cada 20.000km".

**Complexidade:** 🟡 MÉDIA

**Schema:**
```sql
CREATE TABLE vehicle_maintenance_plans (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  vehicle_model NVARCHAR(100), -- Ex: "Mercedes-Benz Axor 2544"
  
  service_name NVARCHAR(255) NOT NULL,
  service_description NVARCHAR(500),
  
  trigger_type NVARCHAR(20) NOT NULL,
  -- 'MILEAGE', 'TIME', 'BOTH'
  
  mileage_interval INT, -- Ex: 20000 (km)
  time_interval_months INT, -- Ex: 6 (meses)
  
  advance_warning_km INT, -- Alertar X km antes
  advance_warning_days INT, -- Alertar X dias antes
  
  ...enterprise_base
);
```

**Lógica:**
```typescript
// Toda vez que atualizar odômetro:
const plans = await getPlansForVehicle(vehicleId);

for (const plan of plans) {
  const kmSinceLastService = currentOdometer - lastServiceOdometer;
  
  if (kmSinceLastService >= (plan.mileageInterval - plan.advanceWarningKm)) {
    createAlert("Manutenção preventiva próxima!");
  }
}
```

**APIs:**
- `POST /api/fleet/maintenance-plans` - Criar plano
- `GET /api/fleet/vehicles/:id/maintenance-due` - Manutenções vencidas
- `GET /api/fleet/maintenance-alerts` - Alertas ativos

**Tela:**
- `/frota/manutencao/planos` - Planos configurados
- `/frota/manutencao/alertas` - Alertas ativos

**Tempo Estimado:** 8-12h

---

#### **6.3 Abastecimento**

**Conceito:**
Importar arquivos de cartões (Ticket Log, Shell) ou XMLs de NF.

**Complexidade:** 🟡 MÉDIA

**Schema:**
```sql
CREATE TABLE fuel_transactions (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  vehicle_id INT NOT NULL,
  driver_id INT,
  
  transaction_date DATETIME2 NOT NULL,
  
  fuel_type NVARCHAR(20), -- 'DIESEL_S10', 'DIESEL_S500', 'ARLA32'
  liters DECIMAL(10,2) NOT NULL,
  price_per_liter DECIMAL(10,2),
  total_value DECIMAL(18,2) NOT NULL,
  
  odometer INT, -- Hodômetro no abastecimento
  
  station_name NVARCHAR(255),
  station_cnpj NVARCHAR(18),
  
  -- Origem
  source NVARCHAR(20), -- 'TICKET_LOG', 'SHELL', 'NFE', 'MANUAL'
  nfe_key NVARCHAR(44),
  
  ...enterprise_base
);
```

**Importação:**
1. **Ticket Log:** CSV (layout próprio)
2. **Shell:** TXT (layout próprio)
3. **NFe XML:** Parse XML de abastecimento

**KPIs:**
- Consumo médio (km/l)
- Custo por km
- Desvio de rota (abasteceu fora da rota?)

**APIs:**
- `POST /api/fleet/fuel/import-ticket-log` - Upload CSV
- `POST /api/fleet/fuel/import-nfe` - Upload XML
- `GET /api/fleet/vehicles/:id/fuel-consumption` - Consumo

**Tela:**
- `/frota/abastecimento` - Lista + Upload
- `/frota/veiculos/:id/abastecimento` - Histórico

**Tempo Estimado:** 10-12h

---

### **📊 RESUMO MÓDULO 6:**

| Funcionalidade | Complexidade | Tempo | Prioridade |
|----------------|--------------|-------|------------|
| Pneus | 🟡 Média-Alta | 16-20h | 🟡 MÉDIA |
| Plano Manutenção | 🟡 Média | 8-12h | 🟡 MÉDIA |
| Abastecimento | 🟡 Média | 10-12h | 🟢 BAIXA |

**Total Módulo 6:** 34-44 horas

---

## **7️⃣ MÓDULO WMS**

### **Funcionalidades Solicitadas:**
1. Endereçamento
2. Movimentação (Entrada, Picking, Expedição)
3. Inventário

### **📊 ANÁLISE TÉCNICA:**

**Complexidade Geral:** 🔴 MUITO ALTA

**Problema:**
WMS é um SISTEMA INTEIRO! Não é um "módulo".
Um WMS completo tem:
- Centenas de tabelas
- Lógica MUITO complexa
- Integrações com coletores (RF)
- Regras de armazenagem (FIFO, FEFO, LIFO)
- Picking otimizado
- Wave picking
- Cross-docking
- E muito mais...

**Estimativa Realista:** 200-300 horas (3-4 meses)

**Minha Recomendação FORTE:** **NÃO IMPLEMENTAR AGORA**

**Alternativa:**
Se REALMENTE precisa WMS:
1. Usar WMS de terceiros (ex: **WMS Sankhya**, **Bling WMS**, **Tiny WMS**)
2. Integrar via API

**Se INSISTIR em implementar básico:**

**Schema Mínimo:**
```sql
-- Warehouse Zones
CREATE TABLE warehouse_zones (
  id INT IDENTITY PRIMARY KEY,
  warehouse_id INT NOT NULL, -- FK branches
  zone_name NVARCHAR(100) NOT NULL, -- 'A', 'B', 'C'
  zone_type NVARCHAR(20), -- 'STORAGE', 'PICKING', 'STAGING', 'DOCK'
);

-- Warehouse Locations (Endereços)
CREATE TABLE warehouse_locations (
  id INT IDENTITY PRIMARY KEY,
  zone_id INT NOT NULL,
  
  code NVARCHAR(20) NOT NULL UNIQUE, -- 'A1-B2-C3'
  -- Formato: [RUA]-[PRÉDIO]-[POSIÇÃO]
  
  location_type NVARCHAR(20), -- 'PALLET', 'SHELF', 'FLOOR'
  max_weight_kg DECIMAL(10,2),
  
  status NVARCHAR(20) DEFAULT 'AVAILABLE',
  -- AVAILABLE, OCCUPIED, RESERVED, BLOCKED
);

-- Stock by Location
CREATE TABLE stock_locations (
  id INT IDENTITY PRIMARY KEY,
  location_id INT NOT NULL,
  product_id INT NOT NULL,
  
  quantity DECIMAL(18,4) NOT NULL,
  lot_number NVARCHAR(50),
  expiry_date DATE,
  
  received_at DATETIME2,
);

-- Movements
CREATE TABLE warehouse_movements (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  movement_type NVARCHAR(20) NOT NULL,
  -- 'RECEIVING', 'PICKING', 'TRANSFER', 'ADJUSTMENT'
  
  product_id INT NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  
  from_location_id INT,
  to_location_id INT,
  
  reference_type NVARCHAR(50), -- 'INBOUND_INVOICE', 'PICKUP_ORDER'
  reference_id INT,
  
  ...enterprise_base
);
```

**Tempo Estimado (básico):** 60-80h

---

### **📊 RESUMO MÓDULO 7:**

| Funcionalidade | Complexidade | Tempo | Prioridade | Recomendação |
|----------------|--------------|-------|------------|--------------|
| WMS Completo | 🔴 Muito Alta | 200-300h | 🟢 BAIXA | **PULAR** |
| WMS Básico | 🔴 Alta | 60-80h | 🟢 BAIXA | Usar terceiros |

---

## **8️⃣ GESTÃO DE MANUTENÇÃO (Fleet Maintenance)**

### **Funcionalidades Solicitadas:**
1. Ordem de Serviço (O.S.)
2. Planos de Manutenção (já coberto no módulo 6)
3. Controle de Mecânicos (tempos e movimentos)

### **📊 ANÁLISE TÉCNICA:**

**Complexidade:** 🟡 MÉDIA-ALTA

**Schema:**
```sql
-- Ordens de Serviço
CREATE TABLE maintenance_work_orders (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  wo_number NVARCHAR(20) NOT NULL UNIQUE, -- "OS-2025-001"
  
  vehicle_id INT NOT NULL,
  
  wo_type NVARCHAR(20) NOT NULL,
  -- 'PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE'
  
  priority NVARCHAR(20) DEFAULT 'NORMAL',
  -- URGENT, HIGH, NORMAL, LOW
  
  reported_by_driver_id INT,
  reported_issue NVARCHAR(500),
  
  odometer INT,
  
  status NVARCHAR(20) DEFAULT 'OPEN',
  -- OPEN, IN_PROGRESS, WAITING_PARTS, COMPLETED, CANCELLED
  
  provider_type NVARCHAR(20), -- 'INTERNAL', 'EXTERNAL'
  provider_id INT, -- FK maintenance_providers
  
  opened_at DATETIME2 DEFAULT GETDATE(),
  started_at DATETIME2,
  completed_at DATETIME2,
  
  total_labor_cost DECIMAL(18,2),
  total_parts_cost DECIMAL(18,2),
  total_cost DECIMAL(18,2),
  
  ...enterprise_base
);

-- Itens da O.S. (Peças e Serviços)
CREATE TABLE work_order_items (
  id INT IDENTITY PRIMARY KEY,
  work_order_id INT NOT NULL,
  
  item_type NVARCHAR(20) NOT NULL, -- 'PART', 'SERVICE'
  
  product_id INT, -- FK products (peça do estoque)
  service_description NVARCHAR(255), -- Ex: "Troca de óleo"
  
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(18,2),
  total_cost DECIMAL(18,2),
  
  created_at DATETIME2 DEFAULT GETDATE()
);

-- Mecânicos (Pode usar employees ou criar específico)
CREATE TABLE mechanics (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  name NVARCHAR(255) NOT NULL,
  specialty NVARCHAR(100), -- 'ENGINE', 'TRANSMISSION', 'ELECTRICAL'
  
  hourly_rate DECIMAL(18,2),
  
  status NVARCHAR(20) DEFAULT 'ACTIVE',
  
  ...enterprise_base
);

-- Atribuição Mecânico → O.S.
CREATE TABLE work_order_mechanics (
  id INT IDENTITY PRIMARY KEY,
  work_order_id INT NOT NULL,
  mechanic_id INT NOT NULL,
  
  assigned_at DATETIME2 DEFAULT GETDATE(),
  started_at DATETIME2,
  completed_at DATETIME2,
  
  hours_worked DECIMAL(5,2),
  labor_cost DECIMAL(18,2),
  
  notes NVARCHAR(500)
);

-- Fornecedores/Oficinas Externas
CREATE TABLE maintenance_providers (
  id INT IDENTITY PRIMARY KEY,
  organization_id INT NOT NULL,
  
  name NVARCHAR(255) NOT NULL,
  cnpj NVARCHAR(18),
  contact_name NVARCHAR(255),
  phone NVARCHAR(20),
  
  specialty NVARCHAR(100),
  
  ...enterprise_base
);
```

**Funcionalidades:**

1. **Abertura de O.S.:**
   - Manual (usuário abre)
   - Automática (plano de manutenção venceu)
   - Motorista reporta (via app mobile - futuro)

2. **Fluxo:**
   ```
   OPEN → [Atribuir Mecânico] → IN_PROGRESS → [Lançar Peças/Serviços] → COMPLETED
   ```

3. **Bloqueio de Frota:**
   - Se O.S. crítica aberta, veículo.status = 'MAINTENANCE'
   - Não pode ser escalado para viagens

4. **Controle de Tempos:**
   - Início/Fim por mecânico
   - Calcula horas trabalhadas
   - Custo de mão de obra

**APIs:**
- `POST /api/fleet/maintenance/work-orders` - Criar O.S.
- `PUT /api/fleet/maintenance/work-orders/:id/assign` - Atribuir mecânico
- `POST /api/fleet/maintenance/work-orders/:id/items` - Adicionar peça/serviço
- `PUT /api/fleet/maintenance/work-orders/:id/complete` - Concluir
- `GET /api/fleet/maintenance/analytics` - KPIs (MTBF, MTTR, custos)

**Telas:**
- `/frota/manutencao/ordens` - Lista de O.S.
- `/frota/manutencao/ordens/:id` - Detalhes da O.S.
- `/frota/manutencao/mecanicos` - Cadastro de mecânicos

**Tempo Estimado:** 20-24h

---

### **📊 RESUMO MÓDULO 8:**

| Funcionalidade | Complexidade | Tempo | Prioridade |
|----------------|--------------|-------|------------|
| O.S. | 🟡 Média-Alta | 20-24h | 🟡 MÉDIA |

**Total Módulo 8:** 20-24 horas

---

## 🎯 **PARTE 2: CONSOLIDAÇÃO E PRIORIZAÇÃO**

### **📊 MATRIZ DE PRIORIZAÇÃO:**

| Módulo | Funcionalidades | Tempo Total | Complexidade | Prioridade | ROI |
|--------|----------------|-------------|--------------|------------|-----|
| **5 - Financeiro** | Billing, Conciliação, Fluxo | 34-44h | 🔴 Alta | 🔴 CRÍTICA | ⭐⭐⭐⭐⭐ |
| **3 - Fiscal Saída** | Inutilização, CCe | 12-16h | 🟡 Média | 🔴 ALTA | ⭐⭐⭐⭐ |
| **4 - TMS** | Torre, Cockpit, Plano, Jornada | 70-90h | 🔴 Muito Alta | 🔴 ALTA | ⭐⭐⭐⭐⭐ |
| **1 - Comercial** | CRM, Reajuste, Propostas | 28-36h | 🟡 Média | 🟡 MÉDIA | ⭐⭐⭐ |
| **6 - Frota** | Pneus, Manutenção, Abastecimento | 34-44h | 🟡 Média | 🟡 MÉDIA | ⭐⭐⭐ |
| **8 - Manutenção** | O.S., Mecânicos | 20-24h | 🟡 Média | 🟡 MÉDIA | ⭐⭐⭐ |
| **2 - Fiscal Entrada** | Manifestação, Conversão | 16-22h | 🟡 Média | 🟢 BAIXA | ⭐⭐ |
| **7 - WMS** | Endereçamento, Movimentação | 60-80h | 🔴 Muito Alta | 🟢 BAIXA | ⭐⭐ |

---

## 🎯 **PARTE 3: ROADMAP EXECUTIVO**

### **🔥 ONDA 1: CRÍTICO (Semanas 1-2)**

**Foco:** Fechar gaps operacionais críticos

**Módulos:**
1. ✅ **Módulo 5.1 - Faturamento Agrupado (Billing)** - 16-20h
2. ✅ **Módulo 3.1 - Inutilização CTe** - 6-8h
3. ✅ **Módulo 3.2 - Carta de Correção (CCe)** - 6-8h

**Total Onda 1:** 28-36 horas (~1-1.5 semanas)

**Resultado:** Sistema pode faturar clientes grandes + Conformidade fiscal CTe

---

### **⚡ ONDA 2: OPERACIONAL (Semanas 3-5)**

**Foco:** Torre de Controle + Visibilidade

**Módulos:**
1. ✅ **Módulo 4.1 - Cockpit (Dashboard)** - 8-10h
2. ✅ **Módulo 4.2 - Torre de Controle** - 20-24h
3. ✅ **Módulo 5.2 - Conciliação Bancária** - 12-16h
4. ✅ **Módulo 5.3 - Fluxo de Caixa** - 6-8h

**Total Onda 2:** 46-58 horas (~2-2.5 semanas)

**Resultado:** Controle operacional completo + Visão financeira

---

### **🚀 ONDA 3: INTELIGÊNCIA (Semanas 6-7)**

**Foco:** CRM + Otimização

**Módulos:**
1. ✅ **Módulo 1.1 - CRM Logístico** - 16-20h
2. ✅ **Módulo 1.2 - Reajuste em Lote** - 4-6h
3. ✅ **Módulo 1.3 - Propostas PDF** - 8-10h

**Total Onda 3:** 28-36 horas (~1-1.5 semanas)

**Resultado:** Funil de vendas + Automação comercial

---

### **🔧 ONDA 4: FROTA & MANUTENÇÃO (Semanas 8-10)**

**Foco:** Gestão de ativos

**Módulos:**
1. ✅ **Módulo 6.1 - Gestão de Pneus** - 16-20h
2. ✅ **Módulo 6.2 - Plano de Manutenção** - 8-12h
3. ✅ **Módulo 6.3 - Abastecimento** - 10-12h
4. ✅ **Módulo 8 - Ordens de Serviço** - 20-24h

**Total Onda 4:** 54-68 horas (~2-3 semanas)

**Resultado:** Controle completo de frota

---

### **🌟 ONDA 5: AVANÇADO (Semanas 11-13)**

**Foco:** Recursos avançados (se ainda quiser)

**Módulos:**
1. ⚠️ **Módulo 4.3 - Plano de Viagem** - 30-40h (ALTA COMPLEXIDADE)
2. ⚠️ **Módulo 4.4 - Controle de Jornada** - 12-16h
3. ⚠️ **Módulo 2 - Fiscal Entrada** - 16-22h

**Total Onda 5:** 58-78 horas (~2-3 semanas)

**Resultado:** Sistema ultra-avançado

---

### **❌ NÃO RECOMENDO:**
- **WMS Completo** - Usar terceiros
- **NFS-e** - Usar agregador (Focus NFe)
- **API VAN BTG** - Aguardar contrato

---

## 🎯 **PARTE 4: ESTIMATIVA FINAL**

### **📊 TOTAIS:**

| Ondas | Horas | Semanas | Prioridade |
|-------|-------|---------|------------|
| Onda 1 (Crítico) | 28-36h | 1-1.5 | 🔴 IMEDIATO |
| Onda 2 (Operacional) | 46-58h | 2-2.5 | 🔴 IMEDIATO |
| Onda 3 (Inteligência) | 28-36h | 1-1.5 | 🟡 CURTO PRAZO |
| Onda 4 (Frota) | 54-68h | 2-3 | 🟡 MÉDIO PRAZO |
| Onda 5 (Avançado) | 58-78h | 2-3 | 🟢 LONGO PRAZO |

**TOTAL GERAL:** 214-276 horas (~5-7 semanas de trabalho intensivo)

---

## 🎯 **PARTE 5: MINHA RECOMENDAÇÃO COMO SENIOR**

### **📋 PLANO DE AÇÃO:**

**AGORA:**
1. ✅ **Onda 1** - Billing + Inutilização + CCe (28-36h)
2. ✅ **Onda 2** - Torre + Cockpit + Conciliação (46-58h)

**Total Imediato:** 74-94 horas (~3-4 semanas)

**DEPOIS (avaliar necessidade real):**
3. Onda 3 - CRM
4. Onda 4 - Frota
5. Onda 5 - Avançado

### **⚠️ ALERTAS IMPORTANTES:**

1. **Dependências Externas:**
   - Google Maps API (R$ após limite)
   - Autotrac API (credenciais necessárias)
   - Banco (boleto) - Escolher qual

2. **Complexidade Técnica:**
   - Plano de Viagem: MUITO complexo
   - WMS: NÃO fazer interno
   - NFS-e: Usar agregador

3. **Priorização:**
   - Fazer **Ondas 1 e 2 primeiro**
   - Testar em produção
   - Coletar feedback
   - DEPOIS decidir Ondas 3-5

---

## ✅ **DECISÃO NECESSÁRIA:**

**Qual abordagem você prefere?**

**[ A ] MARATONA TOTAL** (214-276h em sequência)
- Implementar TUDO de uma vez
- ~7 semanas contínuas
- Alto risco de bugs
- Difícil testar tudo

**[ B ] ONDAS SEQUENCIAIS** ⭐ (RECOMENDADO)
- Onda 1 → Testar → Onda 2 → Testar → etc
- Mais controlado
- Melhor qualidade
- Feedback contínuo

**[ C ] APENAS CRÍTICO** (Ondas 1-2)
- 74-94h
- Foco no essencial
- Menos risco
- MVP sólido

---

**Aguardando sua decisão!** 🎯

Qual opção você escolhe? A, B ou C?






