# 🚀 Guia de Configuração do GitHub - Aura Core

Este guia te ajudará a configurar **GitHub Projects** e **Wiki** para gerenciar o projeto Aura Core.

---

## 📋 PARTE 1: GITHUB PROJECTS (Kanban & Roadmap)

### Passo 1: Criar o Project

1. Acesse seu repositório: https://github.com/pedrojuniorgyn/AuraCore
2. Clique na aba **"Projects"** (no menu superior)
3. Clique em **"New project"**
4. Escolha template: **"Team backlog"**
5. Nome do projeto: **"Aura Core - Roadmap & Tasks"**
6. Clique em **"Create project"**

### Passo 2: Configurar Views (Visualizações)

O GitHub Projects permite múltiplas views. Vamos criar 4:

#### View 1: **Kanban (Board)**

1. No projeto, clique em **"New view"**
2. Escolha: **"Board"**
3. Nome: **"📋 Kanban"**
4. Configure as colunas:
   - **📝 Backlog** (Items novos)
   - **🎯 To Do** (Priorizado)
   - **🚧 In Progress** (Em desenvolvimento)
   - **✅ Done** (Concluído)
   - **❌ Cancelled** (Cancelado)

#### View 2: **Roadmap (Timeline)**

1. Clique em **"New view"**
2. Escolha: **"Roadmap"**
3. Nome: **"🗓️ Timeline"**
4. Mostra: Datas de início e fim dos itens

#### View 3: **Table (Completa)**

1. Clique em **"New view"**
2. Escolha: **"Table"**
3. Nome: **"📊 Tabela Completa"**
4. Adicione colunas:
   - Title (Título)
   - Status (Status)
   - Priority (Prioridade)
   - Module (Módulo)
   - Assignees (Responsável)
   - Start Date (Início)
   - End Date (Fim)
   - Estimate (Estimativa)

#### View 4: **By Module (Agrupado)**

1. Clique em **"New view"**
2. Escolha: **"Board"**
3. Nome: **"🧩 Por Módulo"**
4. Group by: **Module**

### Passo 3: Criar Custom Fields (Campos Personalizados)

1. No projeto, clique no menu **"..." (três pontos)**
2. Selecione **"Settings"**
3. Role até **"Custom fields"**
4. Adicione os campos:

#### Campo: **Module** (Select)
- Fiscal
- Financeiro
- Comercial
- TMS
- Frota
- Infraestrutura
- UI/UX
- Documentação

#### Campo: **Priority** (Select)
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- 🟢 Low

#### Campo: **Type** (Select)
- ✨ Feature
- 🐛 Bug
- 📚 Docs
- ♻️ Refactor
- ⚡ Performance

#### Campo: **Estimate** (Number)
- Story points ou horas

### Passo 4: Configurar Automações

1. Settings → **Workflows**
2. Ative as automações:
   - ✅ **Auto-add to project** (Issues novas)
   - ✅ **Auto-archive** (Items concluídos)
   - ✅ **Auto-close** (Items marcados como Done)

### Passo 5: Popular com Issues Existentes

Agora vamos adicionar tasks ao projeto:

1. No projeto, clique em **"Add item"**
2. Digite: `#` para buscar issues
3. Ou crie uma nova issue:
   - Título: Ex: "Implementar teste E2E"
   - Module: TMS
   - Priority: High
   - Status: To Do

---

## 📚 PARTE 2: GITHUB WIKI (Documentação)

### Passo 1: Ativar a Wiki

1. No repositório, vá em **"Settings"**
2. Role até **"Features"**
3. Marque ✅ **"Wikis"**
4. Clique em **"Save changes"**

### Passo 2: Criar a Página Inicial (Home)

1. Clique na aba **"Wiki"** (menu superior)
2. Clique em **"Create the first page"**
3. Título: **"Home"**
4. Cole o conteúdo abaixo:

```markdown
# 📘 Aura Core - Wiki

Bem-vindo à documentação técnica do Aura Core!

## 🗺️ Navegação Rápida

- [Arquitetura](Arquitetura)
- [Módulos](Módulos)
  - [Fiscal](Módulo-Fiscal)
  - [Financeiro](Módulo-Financeiro)
  - [Comercial](Módulo-Comercial)
  - [TMS](Módulo-TMS)
  - [Frota](Módulo-Frota)
- [APIs Reference](APIs-Reference)
- [Database Schema](Database-Schema)
- [Deployment](Deployment)
- [Troubleshooting](Troubleshooting)

## 📊 Status do Projeto

![Progress](https://progress-bar.dev/70/?title=MVP&width=400)

**Última atualização:** Dezembro 2024

## 🚀 Quick Links

- [GitHub](https://github.com/pedrojuniorgyn/AuraCore)
- [Issues](https://github.com/pedrojuniorgyn/AuraCore/issues)
- [Projects](https://github.com/pedrojuniorgyn/AuraCore/projects)
```

5. Clique em **"Save page"**

### Passo 3: Criar Páginas Principais

#### Página: **Arquitetura**

1. Clique em **"New page"**
2. Título: **"Arquitetura"**
3. Conteúdo:

```markdown
# 🏗️ Arquitetura do Sistema

## Stack Tecnológico

### Frontend
- Next.js 16 (App Router + Turbopack)
- React 19
- TypeScript
- Tailwind CSS
- Shadcn/UI
- Framer Motion
- AG Grid

### Backend
- Next.js API Routes
- Drizzle ORM
- MS SQL Server
- Next-Auth

## Padrões Arquiteturais

### Multi-Tenancy (SaaS)
Todas as tabelas possuem `organization_id` para isolamento de dados.

### Enterprise Base Pattern
```typescript
{
  id: number
  organization_id: number
  version: number         // Optimistic locking
  deleted_at: datetime    // Soft delete
  created_at: datetime
  updated_at: datetime
  created_by: number
  updated_by: number
}
```

### Service Layer
Business logic separada em `/src/services/`:
- `fiscal/` - Lógica fiscal
- `financial/` - Lógica financeira
- `pricing/` - Cálculo de frete
- `tms/` - Workflows TMS

## Fluxo de Dados

```
[Frontend Component]
    ↓ (API call)
[API Route] (/app/api/...)
    ↓ (business logic)
[Service Layer] (/services/...)
    ↓ (data access)
[Drizzle ORM]
    ↓ (query)
[MS SQL Server]
```

## Integrações Externas

### Sefaz (Fiscal)
- Certificado A1 (mTLS)
- XML parsing
- SOAP requests

### Bancário
- CNAB 240 generation
- DDA integration (BTG Pactual)
```

#### Página: **Database Schema**

1. Clique em **"New page"**
2. Título: **"Database-Schema"**
3. Conteúdo:

```markdown
# 🗄️ Database Schema

## Tabelas por Módulo

### Infraestrutura
- `organizations`
- `branches`
- `users`

### Fiscal
- `nfe_inbound` - NFes de entrada
- `cte_header` - CTe (saída)
- `mdfe_header` - MDFe
- `tax_matrix` - Matriz tributária

### Financeiro
- `accounts_payable`
- `accounts_receivable`
- `bank_accounts`
- `bank_remittances`
- `financial_dda_inbox`
- `cost_centers`
- `chart_of_accounts`

### Comercial
- `freight_tables`
- `freight_table_routes`
- `freight_table_prices`
- `freight_generalities`
- `freight_quotes`

### Frota
- `vehicles`
- `drivers`

### TMS
- `pickup_orders`
- `trips`
- `trip_stops`

## Relacionamentos

```
freight_quotes
    ↓ (approve)
pickup_orders
    ↓ (create CTe)
cte_header
    ↓ (add to trip)
trips
    ↓ (group in)
mdfe_header
```

## Migrations

Todas em `/drizzle/migrations/`:
- 0001 a 0005: Base + Fiscal
- 0006 a 0008: Financeiro
- 0009: Frota
- 0010 a 0012: Comercial
- 0013: MVP Operacional
```

#### Página: **APIs Reference**

1. Clique em **"New page"**
2. Título: **"APIs-Reference"**
3. Conteúdo:

```markdown
# 🔌 APIs Reference

## Autenticação

Todas as APIs requerem autenticação via Next-Auth (cookie-based).

## Endpoints

### Fiscal

#### GET /api/fiscal/tax-matrix
Lista regras da matriz tributária

#### POST /api/fiscal/cte
Gera e envia CTe para Sefaz

#### POST /api/fiscal/mdfe
Gera e envia MDFe para Sefaz

### Financeiro

#### GET /api/financial/payables
Lista contas a pagar

**Query params:**
- `organizationId` (required)
- `status` (optional): OPEN | PAID | OVERDUE
- `startDate` (optional)
- `endDate` (optional)

#### POST /api/financial/payables
Cria conta a pagar

**Body:**
```json
{
  "partner_id": 1,
  "due_date": "2024-12-31",
  "amount": 1000.50,
  "description": "Descrição"
}
```

#### PUT /api/financial/payables/{id}/pay
Marca conta como paga

**Body:**
```json
{
  "payment_date": "2024-12-08",
  "paid_amount": 1000.50,
  "bank_account_id": 1
}
```

### Comercial

#### POST /api/commercial/calculate
Simula cálculo de frete

**Body:**
```json
{
  "origin_uf": "SP",
  "destination_uf": "RJ",
  "weight": 100,
  "volume": 2.5,
  "value": 5000,
  "customer_id": 1
}
```

**Response:**
```json
{
  "charged_weight": 125,
  "freight_weight": 500,
  "ad_valorem": 15,
  "gris": 7.5,
  "total": 522.5
}
```

### Frota

#### GET /api/fleet/vehicles
Lista veículos

#### POST /api/fleet/vehicles
Cria veículo (auto-cria centro de custo)

### TMS

#### GET /api/tms/trips
Lista viagens (com filtros de status)

#### POST /api/tms/trips
Cria viagem (valida CIOT para terceiros)

## Rate Limiting

- 100 requests/minuto por IP
- 1000 requests/hora por organização

## Error Codes

- `400` - Bad Request (validação falhou)
- `401` - Unauthorized (não autenticado)
- `403` - Forbidden (sem permissão)
- `404` - Not Found
- `500` - Internal Server Error
```

### Passo 4: Criar Sidebar

1. Na home da Wiki, clique em **"Edit"**
2. No lado direito, em **"Custom Sidebar"**, clique em **"Add custom sidebar"**
3. Cole:

```markdown
**📘 Aura Core Wiki**

### Início
- [Home](Home)
- [Roadmap](Roadmap)

### Arquitetura
- [Visão Geral](Arquitetura)
- [Stack Tecnológico](Stack)
- [Database Schema](Database-Schema)
- [Padrões de Código](Padrões)

### Módulos
- [Fiscal](Módulo-Fiscal)
- [Financeiro](Módulo-Financeiro)
- [Comercial](Módulo-Comercial)
- [TMS](Módulo-TMS)
- [Frota](Módulo-Frota)

### Desenvolvimento
- [Setup](Setup)
- [APIs Reference](APIs-Reference)
- [Testing](Testing)
- [Deployment](Deployment)

### Suporte
- [Troubleshooting](Troubleshooting)
- [FAQ](FAQ)
```

---

## 🎯 PARTE 3: GITHUB ISSUES (Templates)

### Criar Templates de Issues

1. No repositório, clique em **"Settings"**
2. Role até **"Features"** → **"Issues"**
3. Clique em **"Set up templates"**
4. Escolha **"Bug report"** e **"Feature request"**
5. Clique em **"Propose changes"** → **"Commit changes"**

Isso criará a pasta `.github/ISSUE_TEMPLATE/` com templates prontos.

---

## 🎉 PRONTO!

Agora você tem:

✅ **GitHub Projects** configurado com Kanban, Roadmap e views personalizadas
✅ **GitHub Wiki** com documentação estruturada
✅ **Issue Templates** para bugs e features
✅ **Automações** ativas

## 📱 Próximos Passos Recomendados

1. **Adicione tasks ao Project** baseadas no roadmap
2. **Convide colaboradores** (Settings → Collaborators)
3. **Configure GitHub Actions** para CI/CD
4. **Ative Discussions** para Q&A
5. **Crie milestones** para releases

---

**Dúvidas?** Abra uma [Discussion](https://github.com/pedrojuniorgyn/AuraCore/discussions) ou issue!

