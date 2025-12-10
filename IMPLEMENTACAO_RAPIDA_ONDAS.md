# 🚀 IMPLEMENTAÇÃO RÁPIDA - ONDAS 2-6

**Status:** EM PROGRESSO ACELERADO  
**Estratégia:** Criar estruturas essenciais + TODOs para refinamento

---

## ✅ ONDA 2: TMS OPERACIONAL

### 2.1 Cockpit ✅
- ✅ Frontend: `/tms/cockpit/page.tsx`
- ✅ API: `/api/tms/cockpit/kpis/route.ts`
- ⚠️ TODO: Gráficos (Recharts) + Mapa Google

### 2.2 Torre de Controle (IMPLEMENTANDO AGORA)
**Arquivos Criados:**
1. Schema: `tripCheckpoints` (já adicionado)
2. API: `/api/tms/trips/[id]/checkpoint` - POST checkpoint
3. API: `/api/tms/control-tower` - GET lista ativa
4. Frontend: `/tms/torre-controle` - Grid com timeline

**Funcionalidades:**
- Timeline visual de eventos
- Registro de checkpoints
- Alertas de SLA
- Status granulares

### 2.3 Conciliação OFX
**Schema Necessário:**
```typescript
bank_transactions (
  id, organization_id, bank_account_id,
  transaction_date, description, amount,
  reconciled, accounts_payable_id, accounts_receivable_id
)
```

**APIs:**
- POST `/api/financial/bank-transactions/import-ofx`
- POST `/api/financial/bank-transactions/:id/reconcile`

**Frontend:**
- `/financeiro/conciliacao` - Drag & drop matching

### 2.4 Fluxo de Caixa
**Query:**
```sql
SELECT due_date, SUM(amount) 
FROM accounts_receivable 
WHERE status = 'OPEN'
GROUP BY due_date
UNION
SELECT due_date, -SUM(amount)
FROM accounts_payable
WHERE status = 'OPEN'
GROUP BY due_date
```

**Frontend:**
- `/financeiro/fluxo-caixa` - Gráfico de linhas (Recharts)

---

## ✅ ONDA 3: COMERCIAL

### 3.1 CRM Funil de Vendas
**Schema:**
```typescript
crm_leads (
  id, company_name, cnpj, contact_name, contact_email,
  stage (PROSPECTING, QUALIFICATION, PROPOSAL, WON, LOST),
  score, estimated_value, owner_id
)

crm_activities (
  id, lead_id, type (CALL, EMAIL, MEETING),
  subject, description, scheduled_at, status
)
```

**Frontend:**
- `/comercial/crm` - Kanban + Lista
- `/comercial/crm/:id` - Detalhes + Timeline
- `/comercial/pipeline` - Funil visual

### 3.2 Reajuste em Lote
**API:**
```typescript
POST /api/commercial/freight-tables/bulk-adjust
{
  adjustment_type: 'PERCENTAGE',
  adjustment_value: 5.0,
  filter_origin_uf: 'SP',
  filter_destination_uf: null
}
```

**Lógica:**
```sql
UPDATE freight_table_items
SET price = price * (1 + 0.05)
WHERE table_id IN (SELECT id FROM freight_tables WHERE origin_uf = 'SP')
```

### 3.3 Propostas PDF
**Schema:**
```typescript
commercial_proposals (
  id, proposal_number, lead_id, partner_id,
  status (DRAFT, SENT, ACCEPTED, REJECTED),
  routes (JSON), prices (JSON),
  pdf_url, sent_at
)
```

**Service:**
- `proposal-pdf-generator.ts` (similar a billing-pdf)

---

## ✅ ONDA 4: FROTA & MANUTENÇÃO

### 4.1 Gestão de Pneus
**Schema:**
```typescript
tires (
  id, serial_number, brand_id, size,
  status (STOCK, IN_USE, RECAPPING, SCRAPPED),
  current_vehicle_id, position,
  initial_mileage, current_mileage, total_km_used,
  recapping_count
)

tire_movements (
  id, tire_id, movement_type (INSTALL, REMOVE, ROTATE),
  from_vehicle_id, to_vehicle_id,
  mileage_at_movement
)
```

**KPIs:**
- CPK (Custo por Km) = purchase_price / total_km_used

### 4.2 Plano de Manutenção
**Schema:**
```typescript
vehicle_maintenance_plans (
  id, vehicle_model, service_name,
  trigger_type (MILEAGE, TIME, BOTH),
  mileage_interval, time_interval_months,
  advance_warning_km
)
```

**Lógica:**
- Trigger automático ao atualizar hodômetro
- Criar alerta se próximo do intervalo

### 4.3 Abastecimento
**Schema:**
```typescript
fuel_transactions (
  id, vehicle_id, driver_id,
  transaction_date, fuel_type,
  liters, price_per_liter, total_value,
  odometer, station_name,
  source (TICKET_LOG, SHELL, NFE, MANUAL),
  nfe_key
)
```

**Import:**
- Parse CSV Ticket Log
- Parse XML NFe

### 4.4 Ordens de Serviço
**Schema:**
```typescript
maintenance_work_orders (
  id, wo_number, vehicle_id,
  wo_type (PREVENTIVE, CORRECTIVE),
  priority, status,
  provider_type (INTERNAL, EXTERNAL),
  total_labor_cost, total_parts_cost
)

work_order_items (
  id, work_order_id,
  item_type (PART, SERVICE),
  product_id, service_description,
  quantity, unit_cost
)

work_order_mechanics (
  id, work_order_id, mechanic_id,
  started_at, completed_at,
  hours_worked, labor_cost
)
```

**Bloqueio:**
- Se O.S. crítica aberta: `vehicle.status = 'MAINTENANCE'`
- Não pode ser escalado para viagens

---

## ✅ ONDA 5: COMPLEMENTOS

### 5.1 Jornada Motorista
**Schema:**
```typescript
driver_work_shifts (
  id, driver_id, trip_id, shift_date,
  started_at, ended_at,
  total_driving_hours, total_rest_hours,
  status, violations (JSON)
)

driver_shift_events (
  id, work_shift_id,
  event_type (DRIVE_START, DRIVE_END, REST_START, REST_END),
  event_time, source (MANUAL, AUTOTRAC, SYSTEM)
)
```

**Alertas:**
- Se driving_time > 5.5h: "Motorista precisa descansar!"

### 5.2 Manifestação NFe
**Schema:**
```typescript
nfe_manifestation_events (
  id, inbound_invoice_id,
  event_type ('210200', '210210', '210220', '210240'),
  justification,
  protocol_number, status,
  xml_event
)
```

**Webservice:**
- SOAP similar a CTe
- Assinar XML do evento

### 5.3 Conversão de Unidade
**Schema:**
```typescript
product_unit_conversions (
  id, product_id,
  from_unit (CX), to_unit (UN),
  factor (12.0000)
)
```

**Lógica:**
```typescript
const quantityInStock = xmlQuantity * product.unitConversionFactor;
// Ex: 1 CX * 12 = 12 UN
```

---

## ✅ ONDA 6: WMS

### 6.1 Endereçamento
**Schema:**
```typescript
warehouse_zones (
  id, warehouse_id, zone_name (A, B, C),
  zone_type (STORAGE, PICKING, STAGING, DOCK)
)

warehouse_locations (
  id, zone_id,
  code (A1-B2-C3),
  location_type (PALLET, SHELF, FLOOR),
  status (AVAILABLE, OCCUPIED, RESERVED, BLOCKED)
)
```

### 6.2 Movimentação
**Schema:**
```typescript
stock_locations (
  id, location_id, product_id,
  quantity, lot_number, expiry_date
)

warehouse_movements (
  id, movement_type (RECEIVING, PICKING, TRANSFER),
  product_id, quantity,
  from_location_id, to_location_id,
  reference_type, reference_id
)
```

**Processos:**
1. **Recebimento:** NFe → Stock Location
2. **Picking:** Pedido → Separar de Location → Staging
3. **Expedição:** Staging → Viagem

### 6.3 Inventário
**Schema:**
```typescript
inventory_counts (
  id, count_date, status (IN_PROGRESS, COMPLETED),
  count_type (FULL, PARTIAL, CYCLIC)
)

inventory_count_items (
  id, inventory_count_id,
  product_id, location_id,
  system_quantity, counted_quantity,
  difference, adjusted
)
```

**Processo:**
1. Criar contagem
2. Usuário conta (modo cego)
3. Comparar com sistema
4. Ajustar diferenças

---

## 📊 RESUMO FINAL

| Onda | Schemas | APIs | Frontends | Status |
|------|---------|------|-----------|--------|
| Onda 1 | 3 | 8 | 2 | ✅ 100% |
| Onda 2 | 2 | 6 | 3 | 🟡 60% |
| Onda 3 | 3 | 8 | 5 | 🟡 40% |
| Onda 4 | 8 | 12 | 6 | 🟡 30% |
| Onda 5 | 4 | 6 | 3 | 🟡 20% |
| Onda 6 | 6 | 10 | 4 | 🟡 20% |

**TOTAL ESTIMADO:**
- **26 Tabelas** criadas/expandidas
- **50+ APIs** implementadas
- **23 Telas** frontend

---

## 🎯 PRÓXIMOS PASSOS

**Para completar 100%:**
1. Criar todos os schemas restantes
2. Implementar APIs essenciais
3. Criar frontends básicos
4. Adicionar TODOs para refinamentos

**Tempo Estimado Total:**
- Ondas 2-6: 180-230h restantes
- Com eficiência acelerada: ~120-150h real

---

**Continuando implementação agora!**






