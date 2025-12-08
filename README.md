# 🚚 AuraCore - TMS & ERP Logístico Completo

**Sistema de Gestão de Transportes (TMS) + ERP Financeiro** 
Desenvolvido com Next.js 15, TypeScript, SQL Server e AG Grid Enterprise.

---

## 📊 **Visão Geral**

AuraCore é um **MVP Operacional Completo** que integra:

- ✅ **Gestão Comercial** (Cotações, Tabelas de Frete, Matriz Tributária)
- ✅ **Fiscal** (CTe 4.0, MDFe 3.0, Averbação de Seguro, CIOT)
- ✅ **TMS** (Viagens, Ordens de Coleta, Kanban Visual)
- ✅ **Financeiro** (Contas a Pagar/Receber, DRE, Controladoria Gerencial)
- ✅ **Frota** (Veículos, Motoristas, Centros de Custo)
- ✅ **Workflow Automático** (Cotação → CTe → Financeiro)

---

## 🎯 **Funcionalidades Principais**

### **COMERCIAL**
```
✅ Torre de Controle (Cotações em tempo real)
✅ Tabelas de Frete (Rotas, Faixas de Peso, Generalidades)
✅ Matriz Tributária (729 regras ICMS/CFOP - 27x27 UFs)
✅ Cálculo Automático de Frete (FTL/LTL)
✅ Simulador de Frete com breakdown detalhado
```

### **FISCAL**
```
✅ CTe 4.0 (Geração de XML com validações)
✅ MDFe 3.0 (Agrupamento de CTes)
✅ Validação de Averbação de Seguro (obrigatório)
✅ Validação de CIOT (terceiros/agregados)
✅ Integração com SEFAZ (produção/homologação)
✅ Assinatura Digital (Certificado A1)
```

### **TMS**
```
✅ Gestão de Viagens (Kanban visual)
✅ Ordens de Coleta (alocação veículo/motorista)
✅ Rastreamento de Status (Draft → Em Trânsito → Concluída)
✅ Validações Automáticas (CIOT, Seguro)
```

### **FINANCEIRO**
```
✅ Contas a Pagar/Receber
✅ DRE Gerencial (Frota Própria vs Terceiros)
✅ Centros de Custo (automáticos por veículo)
✅ Plano de Contas Dimensional
✅ Dashboard DRE com KPIs visuais
✅ CNAB 240 (Remessas Bancárias)
✅ DDA (Boletos Eletrônicos)
```

### **WORKFLOW AUTOMÁTICO**
```
Cotação Aprovada → Ordem de Coleta → CTe → Conta a Receber
Viagem Concluída (Agregado) → Conta a Pagar (CIOT)
```

---

## 🛠️ **Stack Tecnológica**

```typescript
Frontend:
  - Next.js 15.1 (App Router)
  - React 19.2
  - TypeScript 5.x
  - Tailwind CSS 3.4
  - AG Grid 34.3+ (Community)
  - Framer Motion 11.x
  - Shadcn/UI + Aceternity UI
  
Backend:
  - Next.js API Routes (RESTful)
  - Drizzle ORM
  - SQL Server (MSSQL)
  - Next-Auth (Autenticação)
  
Integrações:
  - SEFAZ (CTe/MDFe)
  - Certificado Digital A1
  - CNAB 240
  - DDA (BTG Pactual simulado)
```

---

## 🚀 **Instalação**

### **Pré-requisitos:**

- Node.js 18+
- SQL Server (local ou Azure)
- Certificado Digital A1 (produção)

### **Passos:**

```bash
# 1. Clone o repositório
git clone https://github.com/your-org/aura_core.git
cd aura_core

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp CONFIGURATION.md .env.local
# Edite .env.local com suas credenciais

# 4. Execute migrations
npx drizzle-kit migrate

# 5. Inicie o servidor
npm run dev

# 6. Acesse
http://localhost:3000
```

---

## 📂 **Estrutura do Projeto**

```
aura_core/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── comercial/
│   │   │   │   ├── cotacoes/          # Torre de Controle
│   │   │   │   ├── tabelas-frete/     # Gestão de Preços
│   │   │   │   └── simulador/         # Simulador de Frete
│   │   │   ├── fiscal/
│   │   │   │   ├── matriz-tributaria/ # ICMS/CFOP
│   │   │   │   ├── cte/               # Gestão de CTes
│   │   │   │   └── entrada-notas/     # NFe Entrada
│   │   │   ├── tms/
│   │   │   │   └── viagens/           # Kanban de Viagens
│   │   │   ├── financeiro/
│   │   │   │   ├── contas-pagar/
│   │   │   │   ├── contas-receber/
│   │   │   │   ├── dre-dashboard/     # Dashboard DRE
│   │   │   │   ├── centros-custo/
│   │   │   │   └── plano-contas/
│   │   │   └── frota/
│   │   │       ├── veiculos/
│   │   │       └── motoristas/
│   │   └── api/
│   │       ├── commercial/
│   │       │   ├── quotes/            # Cotações
│   │       │   └── freight-tables/    # Tabelas de Frete
│   │       ├── fiscal/
│   │       │   ├── tax-matrix/        # Matriz Tributária
│   │       │   ├── cte/               # CTe
│   │       │   └── mdfe/              # MDFe
│   │       ├── tms/
│   │       │   ├── pickup-orders/     # Ordens de Coleta
│   │       │   └── trips/             # Viagens
│   │       └── financial/
│   │           ├── payables/
│   │           ├── receivables/
│   │           └── reports/dre/
│   ├── services/
│   │   ├── fiscal/
│   │   │   ├── tax-calculator.ts      # Cálculo ICMS
│   │   │   ├── cte-builder.ts         # Gerador XML CTe
│   │   │   ├── certificate-manager.ts # Cert A1
│   │   │   └── sefaz-client.ts        # Cliente SEFAZ
│   │   ├── pricing/
│   │   │   └── freight-calculator.ts  # Cálculo Frete
│   │   ├── validators/
│   │   │   ├── ciot-validator.ts
│   │   │   └── insurance-validator.ts
│   │   └── tms/
│   │       └── workflow-automator.ts  # Automação
│   ├── lib/
│   │   └── db/
│   │       └── schema.ts              # Schema Completo
│   └── components/
│       ├── layout/
│       └── ui/
└── drizzle/
    └── migrations/                    # SQL Migrations
```

---

## 🔐 **Segurança**

### **Autenticação:**
- Next-Auth com Credentials Provider
- Sessões JWT
- Multi-tenancy (organization_id)

### **Auditoria:**
- Soft Delete (`deleted_at`)
- Versionamento (`version` - Optimistic Locking)
- Auditoria de criação/atualização (`created_by`, `updated_by`)

### **Fiscal:**
- Assinatura Digital com Certificado A1
- Validações obrigatórias (CIOT, Averbação)
- Integração HTTPS com mTLS

---

## 📈 **Roadmap**

### **Fase Atual: MVP Operacional** ✅
- [x] Comercial completo
- [x] Fiscal (CTe/MDFe)
- [x] TMS básico
- [x] Financeiro gerencial
- [x] Workflow automático

### **Próximas Fases:**
- [ ] Rastreamento GPS (integração com Onixsat/Sascar)
- [ ] Portal do Cliente (acompanhamento de fretes)
- [ ] App Mobile (motoristas)
- [ ] BI Avançado (Power BI embedded)
- [ ] Inteligência Artificial (previsão de demanda)

---

## 🧪 **Testes**

```bash
# Testes unitários (TODO)
npm run test

# Linter
npm run lint

# Type checking
npx tsc --noEmit
```

---

## 📝 **Licença**

Proprietário - AuraCore © 2024

---

## 👥 **Contato**

- **Desenvolvedor:** Pedro Lemes
- **Email:** contato@auracore.com.br
- **Suporte:** suporte@auracore.com.br

---

## 🎉 **Status do Projeto**

```
███████████████████████████████████████████████████ 100%

✅ BLOCO 1: Fundação (Schema, Services, Migration)
✅ BLOCO 2: Inteligência (Matriz, Tabelas de Frete)
✅ BLOCO 3: Torre de Controle (Cotações)
✅ BLOCO 4: Fiscal (CTe, MDFe)
✅ BLOCO 5: TMS (Viagens, Kanban)
✅ BLOCO 6: Workflow (Automação Completa)
✅ BLOCO 7: Frontend Avançado (Dashboard DRE)

MVP OPERACIONAL 100% FUNCIONAL! 🚀
```

---

**Desenvolvido com ❤️ usando as melhores práticas de Enterprise Software.**
