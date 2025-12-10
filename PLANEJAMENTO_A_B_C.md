# 🎯 PLANEJAMENTO: OPÇÕES A + B + C

**Data:** 08/12/2025  
**Status:** 📋 Planejamento Aprovado - Pronto para Execução

---

## 📊 VISÃO GERAL

```
┌─────────────────────────────────────────────────────┐
│  OPÇÃO A: Frontend Contas a Pagar (AG Grid)         │
│  OPÇÃO B: Teste Classificação Automática            │
│  OPÇÃO C: Sistema de Alertas/Notificações           │
├─────────────────────────────────────────────────────┤
│  Tempo Estimado: 4-6 horas                          │
│  Complexidade: 🟡 Média-Alta                        │
│  Impacto: 🟢 Alto (3 funcionalidades críticas)      │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 OPÇÃO A - FRONTEND CONTAS A PAGAR

### **Objetivo:**
Criar interface visual moderna para Contas a Pagar com AG Grid Enterprise features.

### **Recursos AG Grid a Implementar:**

#### **1. Master-Detail (Expandir para ver itens da NFe)**
```typescript
// Expandir linha para ver:
Conta a Pagar (Principal)
  └─ Itens da NFe:
      ├─ NCM 87089900 - Peças para veículos - R$ 1.500,00
      ├─ NCM 27101942 - Óleo diesel - R$ 3.200,00
      └─ NCM 40116100 - Pneus - R$ 8.500,00
```

**Dados exibidos no Master-Detail:**
- Código NCM
- Descrição do produto
- Quantidade
- Valor unitário
- Valor total
- Categoria contábil
- Conta contábil

#### **2. Column Groups (Agrupamento visual)**
```
┌─────────────────┬──────────────────┬──────────────────┐
│   DOCUMENTO     │    FINANCEIRO    │     VENCIMENTO   │
├─────────────────┼──────────────────┼──────────────────┤
│ Tipo │ Número   │ Valor │ Pago    │ Emissão │ Vencto │
└─────────────────┴──────────────────┴──────────────────┘
```

#### **3. Sparklines (Gráficos inline)**
```
Histórico de Pagamentos (últimos 6 meses):
▂▄▆█▆▄ R$ 125.000,00
```

#### **4. Advanced Filter Panel**
```
[ Filtros Avançados ]
├─ Status: [ ] Pendente [x] Pago [ ] Vencido
├─ Fornecedor: [Buscar...]
├─ Período: [01/12/2024] até [31/12/2024]
├─ Valor: R$ [Min] até R$ [Max]
└─ Categoria: [Selecionar...]
```

#### **5. Row Grouping (Agrupar por fornecedor/categoria)**
```
🏢 Fornecedor: Posto Shell
  ├─ NFe 12345 - R$ 5.000,00
  ├─ NFe 12346 - R$ 3.200,00
  └─ Total: R$ 8.200,00
```

#### **6. Custom Cell Renderers**
```typescript
// Status com badges coloridos
✅ Pago      - Verde
⏰ Pendente  - Amarelo
❌ Vencido   - Vermelho
📋 Parcial   - Azul
```

#### **7. Export Excel**
```
Botão: [📥 Exportar Excel]
Inclui: Todos filtros aplicados + Master-Detail
```

#### **8. Sidebar com Columns Tool Panel**
```
[ Colunas ]
[x] Número NFe
[x] Fornecedor
[x] Valor
[ ] CFOP
[ ] NCM
```

---

## 🧪 OPÇÃO B - TESTE CLASSIFICAÇÃO AUTOMÁTICA

### **Objetivo:**
Validar que NFes já importadas estão sendo classificadas corretamente.

### **Checklist de Validação:**

#### **1. Verificar NFes Existentes:**
```sql
SELECT 
  id, 
  invoice_number, 
  total_value,
  classification,
  created_at
FROM inbound_invoices
ORDER BY created_at DESC
LIMIT 10;
```

**Validar:**
- ✅ Campo `classification` está preenchido?
- ✅ Classificação correta (PURCHASE/CARGO/RETURN/OTHER)?
- ✅ NFes novas recebem classificação automática?

#### **2. Testar Geração de Contas a Pagar:**
```sql
-- NFes que já geraram Contas a Pagar
SELECT 
  ap.id,
  ap.document_number,
  ap.amount,
  ap.origin,
  ii.invoice_number
FROM accounts_payable ap
LEFT JOIN inbound_invoices ii ON ap.document_number = ii.invoice_number
WHERE ap.origin = 'INVOICE_IMPORT';
```

**Validar:**
- ✅ Contas a Pagar foram criadas automaticamente?
- ✅ Valores batem com NFe?
- ✅ Itens foram vinculados corretamente?
- ✅ Sem duplicatas?

#### **3. Testar Classificação por NCM:**
```sql
-- Ver distribuição por categoria
SELECT 
  fc.name as categoria,
  COUNT(pi.id) as total_itens,
  SUM(pi.total_value) as valor_total
FROM payable_items pi
JOIN financial_categories fc ON pi.category_id = fc.id
GROUP BY fc.name;
```

**Validar:**
- ✅ NCMs sendo agrupados corretamente?
- ✅ Categorias fazem sentido?
- ✅ Valores corretos?

#### **4. Script de Reclassificação (se necessário):**
```typescript
// Se encontrar NFes sem classificação
// Executar reclassificação automática
await reclassifyAllNFes();
```

---

## 🔔 OPÇÃO C - SISTEMA DE ALERTAS/NOTIFICAÇÕES

### **Objetivo:**
Notificar usuários sobre eventos importantes de importação SEFAZ.

### **Funcionalidades:**

#### **1. Eventos a Notificar:**

```typescript
enum NotificationEvent {
  // SEFAZ
  IMPORT_SUCCESS = "Nova importação concluída",
  IMPORT_ERROR = "Erro na importação SEFAZ",
  SEFAZ_ERROR_656 = "SEFAZ: Aguardar 1 hora (656)",
  NEW_DOCUMENTS = "Novos documentos importados",
  
  // Classificação
  CLASSIFICATION_SUCCESS = "NFes classificadas",
  CLASSIFICATION_ERROR = "Erro na classificação",
  
  // Contas a Pagar
  PAYABLE_CREATED = "Nova conta a pagar criada",
  PAYABLE_DUE_SOON = "Contas vencendo em 3 dias",
  PAYABLE_OVERDUE = "Contas vencidas",
  
  // Sistema
  SYSTEM_ERROR = "Erro no sistema",
}
```

#### **2. Canais de Notificação:**

**A) In-App (Tempo Real):**
```typescript
// Badge no ícone de sino
🔔 (3)  ← 3 notificações não lidas
```

**B) Email (Opcional):**
```
Assunto: [AuraCore] 15 novos documentos importados
Corpo:
  ✅ 15 NFes importadas com sucesso
  💰 R$ 45.230,00 em contas a pagar criadas
  📋 3 categorias diferentes
```

**C) Webhook (Futuro):**
```json
POST https://sua-webhook.com/aura-notifications
{
  "event": "NEW_DOCUMENTS",
  "count": 15,
  "total_value": 45230.00,
  "timestamp": "2024-12-08T14:30:00Z"
}
```

#### **3. Tabela de Notificações:**

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  user_id INT,  -- NULL = todos usuários
  type VARCHAR(50) NOT NULL,  -- SUCCESS, ERROR, WARNING, INFO
  event VARCHAR(100) NOT NULL,
  title NVARCHAR(200) NOT NULL,
  message NVARCHAR(MAX),
  data NVARCHAR(MAX),  -- JSON com dados extras
  is_read BIT DEFAULT 0,
  created_at DATETIME2 DEFAULT GETDATE(),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

#### **4. Frontend - Componente de Notificações:**

```typescript
// Dropdown de notificações
<NotificationBell>
  <Badge count={unreadCount} />
  <Dropdown>
    <NotificationItem type="success">
      ✅ 15 NFes importadas
      <small>há 5 minutos</small>
    </NotificationItem>
    <NotificationItem type="warning">
      ⏰ 3 contas vencendo amanhã
      <small>há 1 hora</small>
    </NotificationItem>
  </Dropdown>
</NotificationBell>
```

---

## 🏗️ ESTRUTURA DE IMPLEMENTAÇÃO

### **FASE 1 - Backend (2h)**

1. ✅ **Migration: Tabela de notificações**
2. ✅ **API: CRUD de notificações**
3. ✅ **API: Itens de contas a pagar (Master-Detail)**
4. ✅ **Service: NotificationService**
5. ✅ **Integração: SEFAZ → Notificações**

### **FASE 2 - Frontend Contas a Pagar (1.5h)**

1. ✅ **Página: /financeiro/contas-pagar**
2. ✅ **AG Grid: Configuração avançada**
3. ✅ **Master-Detail: Expandir itens**
4. ✅ **Sparklines: Histórico visual**
5. ✅ **Advanced Filter: Painel de filtros**
6. ✅ **Export: Exportação Excel**

### **FASE 3 - Frontend Notificações (1h)**

1. ✅ **Componente: NotificationBell**
2. ✅ **Componente: NotificationDropdown**
3. ✅ **Componente: NotificationItem**
4. ✅ **Hook: useNotifications (real-time)**
5. ✅ **Integração: Sidebar**

### **FASE 4 - Testes (0.5h)**

1. ✅ **Testar classificação automática**
2. ✅ **Testar geração de contas a pagar**
3. ✅ **Testar notificações em tempo real**
4. ✅ **Testar AG Grid features**

---

## 📦 ARQUIVOS A CRIAR/MODIFICAR

### **Backend:**
```
src/db/migrations/
  └─ 0057_create_notifications.sql

src/db/schema/
  └─ notifications.ts

src/app/api/
  ├─ notifications/
  │   └─ route.ts
  ├─ financial/payables/[id]/items/
  │   └─ route.ts
  └─ admin/test-classification/
      └─ route.ts

src/services/
  └─ notification-service.ts
```

### **Frontend:**
```
src/app/(dashboard)/financeiro/contas-pagar/
  └─ page.tsx  (REESCREVER com AG Grid avançado)

src/components/notifications/
  ├─ notification-bell.tsx
  ├─ notification-dropdown.tsx
  ├─ notification-item.tsx
  └─ notification-provider.tsx

src/hooks/
  └─ useNotifications.ts

src/components/layout/
  └─ aura-glass-sidebar.tsx  (ADD NotificationBell)
```

---

## 🎯 COMPONENTES MODERNOS A USAR

Conforme memória do usuário, usar OBRIGATORIAMENTE:

```typescript
✅ PageTransition - Todas páginas
✅ FadeIn/StaggerContainer - Listas e cards
✅ HoverCard - Cards de notificação
✅ ShimmerButton - Botões principais
✅ GradientText - Títulos importantes
✅ NumberCounter - KPIs (total pago, a pagar, etc)
✅ GridPattern/DotPattern - Backgrounds
✅ GlassmorphismCard - Cards de notificação
```

---

## ✅ CHECKLIST DE QUALIDADE

### **AG Grid (Memória do usuário - v34.3+):**
- [ ] Theming API (sem ag-grid.css legado)
- [ ] Integrated Charts (Sparklines)
- [ ] Master-Detail expandível
- [ ] Advanced Filter Panel
- [ ] Custom Cell Renderers (React Components)
- [ ] Column Auto-Size
- [ ] Aggregation Functions
- [ ] Context Menu customizado
- [ ] Exportação Excel avançada

### **Notificações:**
- [ ] Real-time (polling ou WebSocket)
- [ ] Badge com contador
- [ ] Marcar como lida
- [ ] Filtros (todas/não lidas)
- [ ] Auto-refresh a cada 30s
- [ ] Som/vibração (opcional)

### **Testes:**
- [ ] Classificação automática funcionando
- [ ] Contas a pagar geradas corretamente
- [ ] Itens vinculados (Master-Detail)
- [ ] Notificações em tempo real
- [ ] Performance (grid com 1000+ registros)

---

## 🚀 ORDEM DE EXECUÇÃO

```
1️⃣ BACKEND
   ├─ Migration notifications
   ├─ Schema notifications
   ├─ NotificationService
   ├─ API notifications
   ├─ API payable items
   └─ Integrar SEFAZ → Notifications

2️⃣ FRONTEND - CONTAS A PAGAR
   ├─ Reescrever página com AG Grid avançado
   ├─ Implementar Master-Detail
   ├─ Adicionar Sparklines
   ├─ Advanced Filter Panel
   └─ Export Excel

3️⃣ FRONTEND - NOTIFICAÇÕES
   ├─ NotificationBell component
   ├─ NotificationDropdown component
   ├─ useNotifications hook
   └─ Integrar na Sidebar

4️⃣ TESTES
   ├─ Testar classificação
   ├─ Testar contas a pagar
   ├─ Testar notificações
   └─ Relatório final
```

---

## 📊 MÉTRICAS DE SUCESSO

```
✅ AG Grid exibindo contas a pagar com todos recursos
✅ Master-Detail mostrando itens da NFe
✅ Sparklines com histórico visual
✅ Notificações em tempo real funcionando
✅ Badge com contador atualizado
✅ Classificação automática validada
✅ 100% das NFes classificadas
✅ Contas a pagar geradas automaticamente
```

---

## ⏱️ CRONOGRAMA

```
Início: Agora (08/12/2025 - Horário atual)
Duração: 4-6 horas (com pausas)

FASE 1 (Backend): 2h
FASE 2 (Frontend Payables): 1.5h
FASE 3 (Frontend Notifications): 1h
FASE 4 (Testes): 0.5h
FASE 5 (Documentação): 0.5h (automática)

Término previsto: Mesma sessão
```

---

## 🎯 STATUS

```
📋 Planejamento: ✅ COMPLETO
🚀 Aprovação: ⏳ AGUARDANDO
💻 Execução: ⏸️ PENDENTE
```

---

**Aguardando sua aprovação para iniciar! 🚀**





