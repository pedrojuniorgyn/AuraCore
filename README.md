# 📘 Aura Core - Sistema TMS Enterprise

<div align="center">

![Status](https://img.shields.io/badge/Status-MVP%20Completo-success)
![Next.js](https://img.shields.io/badge/Next.js-16.0.7-black)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

**Sistema de Gestão Logística e Transporte de Cargas (TMS) com arquitetura SaaS enterprise**

[Roadmap](#-roadmap) • [Documentação](#-documentação) • [Stack](#-stack-tecnológico) • [Setup](#-setup-rápido)

</div>

---

## 🏗️ Arquitetura (fonte de verdade)

A documentação canônica de arquitetura (contracts, ADRs, diagramas e runbooks) está em:

- `docs/architecture/INDEX.md`

## 🎯 Visão Geral

O **Aura Core** é um sistema completo de **Transport Management System (TMS)** desenvolvido para transportadoras brasileiras, com foco em:

- 🚚 Gestão completa de operações logísticas
- 💰 Controle financeiro robusto (Contas a Pagar/Receber, CNAB, DDA)
- 📄 Emissão fiscal automatizada (NFe, CTe, MDFe)
- 📊 Inteligência comercial (cotações, precificação, análise)
- 🧮 Controladoria gerencial (DRE, Centros de Custo, Plano de Contas)
- 🏗️ Arquitetura SaaS multi-tenant

---

## ✨ Features Principais

### 🏗️ Infraestrutura SaaS
- ✅ **Multi-tenancy** (organizações isoladas)
- ✅ **Autenticação robusta** (Next-Auth v5)
- ✅ **Gestão de filiais** (multi-branch)
- ✅ **Auditoria completa** (created_by, updated_by, soft delete)
- ✅ **Optimistic locking** (controle de concorrência)

### 📥 Fiscal - Entrada
- ✅ **Importação automática NFe** via Sefaz DFe
- ✅ **Processamento XML** (parsing e validação)
- ✅ **Certificado Digital A1** (integração mTLS)
- ✅ **Gestão de NSU** (controle de documentos)
- ✅ **Vinculação inteligente** (NFe → Produto)

### 📤 Fiscal - Saída
- ✅ **Emissor CTe 4.0** (Conhecimento de Transporte Eletrônico)
- ✅ **Emissor MDFe 3.0** (Manifesto de Documentos Fiscais)
- ✅ **Assinatura digital XML** (certificado A1)
- ✅ **Integração Sefaz** (envio e consulta)
- ✅ **Matriz Tributária** (cálculo automático de ICMS)

### 💰 Financeiro
- ✅ **Contas a Pagar** (fornecedores, despesas)
- ✅ **Contas a Receber** (clientes, receitas)
- ✅ **CNAB 240** (remessas bancárias)
- ✅ **DDA** (Débito Direto Autorizado - BTG Pactual)
- ✅ **Smart Match** (vinculação automática DDA ↔ Contas)
- ✅ **Plano de Contas Gerencial** (hierárquico)
- ✅ **Centros de Custo** (analíticos/sintéticos)
- ✅ **DRE** (Demonstração de Resultados do Exercício)

### 📊 Comercial & Inteligência
- ✅ **Torre de Controle** (cotações/demandas)
- ✅ **Tabelas de Frete** (FTL/LTL)
- ✅ **Cálculo automático** (peso cubado, generalidades)
- ✅ **Regiões geográficas** (matriz origem/destino)
- ✅ **Generalidades** (Ad Valorem, GRIS, Despacho, Pedágio)
- ✅ **Simulador de frete** (cotação instantânea)

### 🚛 Frota & Logística
- ✅ **Gestão de Veículos** (cadastro, manutenção)
- ✅ **Gestão de Motoristas** (CNH, validações)
- ✅ **Validações automáticas** (placa Mercosul, CPF, CNH vencida)
- ✅ **Componentes visuais** (LicensePlate, DriverStatusBadge)

### 🚚 TMS Operacional
- ✅ **Ordens de Coleta** (pickup orders)
- ✅ **Viagens** (Kanban board visual)
- ✅ **Integração CTe/MDFe** (documentos fiscais)
- ✅ **CIOT** (validação para terceiros)
- ✅ **Averbação de Seguro** (obrigatória para CTe/MDFe)
- ✅ **Workflow automático** (Cotação → Coleta → CTe → Faturamento)

---

## 🎨 UI/UX Premium

### Componentes Modernos Criados

#### 🌟 Navegação
- **Aura Glass Sidebar** - Sidebar com glassmorphism, spotlight effect, accordion
- **Floating Dock** - Navegação flutuante estilo macOS
- **BranchSwitcher** - Troca de filial com busca

#### ✨ Animações
- **PageTransition** - Transições suaves entre páginas
- **FadeIn** - Fade in com delay configurável
- **StaggerContainer** / **StaggerItem** - Animações em sequência

#### 🎭 Backgrounds Animados
- **GridPattern** - Grid pattern sutil
- **DotPattern** - Dots pattern
- **AuroraBackground** - Aurora boreal animada

#### 🎯 Componentes Interativos
- **ShimmerButton** - Botão com shimmer effect rotativo
- **HoverCard** - Card com hover 3D
- **GlassCard** - Glassmorphism card
- **PulsatingBadge** - Badge pulsante para notificações

#### 🌈 Efeitos Especiais
- **SpotlightEffect** - Spotlight que segue o mouse
- **GlowBorder** - Borda com glow animado
- **GradientText** - Texto com gradiente
- **NumberCounter** - Contador animado para KPIs

### Paleta de Cores por Módulo

```css
Comercial:     emerald-400 → green-400    🟢
Fiscal:        blue-400 → cyan-400        🔵
Financeiro:    purple-400 → pink-400      🟣
TMS:           pink-400 → rose-400        💗
Frota:         amber-400 → orange-400     🟠
Cadastros:     cyan-400 → teal-400        🔷
Configurações: indigo-400 → purple-400    🟪
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** Next.js 16.0.7 (App Router + Turbopack)
- **UI Library:** React 19.2.0
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.4
- **Components:** Shadcn/UI
- **Animations:** Framer Motion 11.x
- **Data Grid:** AG Grid Community 34.3
- **Forms:** React Hook Form + Zod
- **State:** Zustand, React Context

### Backend
- **API:** Next.js API Routes (App Router)
- **ORM:** Drizzle ORM
- **Database:** MS SQL Server
- **Authentication:** Next-Auth (Auth.js) v5
- **Validation:** Zod schemas

### Integrações
- **Fiscal:** Sefaz DFe (NFe, CTe, MDFe)
- **Bancário:** CNAB 240, DDA (BTG Pactual)
- **Certificado:** A1 (PFX/P12) com xml-crypto
- **XML:** xmlbuilder2

---

## 🚀 Setup Rápido

### Pré-requisitos

```bash
- Node.js 18+ 
- npm ou yarn
- MS SQL Server
- Certificado Digital A1 (para produção)
```

### Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/pedrojuniorgyn/AuraCore.git
cd AuraCore
```

2. **Instale as dependências:**
```bash
npm install --legacy-peer-deps
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

4. **Execute as migrations:**
```bash
npm run db:push
```

5. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

6. **Acesse:**
```
http://localhost:3000
```

### Variáveis de Ambiente Essenciais

```env
# Database
DB_HOST=localhost
DB_PORT=1433
DB_NAME=aura_core
DB_USER=sa
DB_PASSWORD=sua_senha

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere_com_openssl_rand_base64_32

# Sefaz (opcional para dev)
SEFAZ_ENVIRONMENT=HOMOLOGACAO
SEFAZ_CERT_PATH=./certificates/cert.pfx
SEFAZ_CERT_PASSWORD=senha_do_certificado
```

---

## 📊 Estatísticas do Projeto

```
📄 Páginas Frontend:    25+
🔌 API Endpoints:       40+
🧩 Componentes UI:      50+
🗄️  Tabelas no DB:      35+
📝 Linhas de Código:    ~15.000
🎨 Componentes Únicos:  15+
```

---

## 🗺️ Roadmap

### ✅ Fase 1: MVP Operacional (Concluído)
- [x] Infraestrutura SaaS
- [x] Fiscal (Entrada NFe)
- [x] Financeiro Core
- [x] Comercial & Inteligência
- [x] Frota
- [x] TMS Operacional
- [x] Emissor CTe/MDFe
- [x] UI/UX Premium

### 🚧 Fase 2: Produção Ready (Em Andamento)
- [ ] Testes E2E (Playwright)
- [ ] Deploy produção (Vercel/Railway)
- [ ] Monitoramento (Sentry)
- [ ] Documentação completa
- [ ] Certificado Digital real (A1)
- [ ] Sefaz produção

### 📋 Fase 3: Features Avançadas (Planejado)
- [ ] Mobile App (React Native)
- [ ] BI & Analytics avançado
- [ ] Rastreamento veicular
- [ ] EDI (Electronic Data Interchange)
- [ ] WhatsApp Business API
- [ ] IA/ML para precificação

### 🌟 Fase 4: Marketplace (Futuro)
- [ ] Plataforma de fretes
- [ ] Leilão reverso
- [ ] Rating & Reviews
- [ ] Integração com embarcadores

---

## 📖 Documentação

### Estrutura do Projeto

```
aura_core/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/       # Rotas protegidas
│   │   ├── api/               # API Routes
│   │   └── layout.tsx
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes base
│   │   ├── layout/           # Layout components
│   │   ├── financial/        # Componentes financeiros
│   │   ├── commercial/       # Componentes comerciais
│   │   └── fleet/            # Componentes de frota
│   ├── lib/                  # Bibliotecas e utils
│   │   ├── db/
│   │   │   └── schema.ts    # Schema Drizzle
│   │   ├── auth.ts          # Configuração Next-Auth
│   │   └── utils.ts
│   ├── services/             # Business logic
│   │   ├── fiscal/          # Serviços fiscais
│   │   ├── financial/       # Serviços financeiros
│   │   ├── pricing/         # Cálculo de frete
│   │   └── tms/             # TMS workflows
│   └── contexts/            # React contexts
├── drizzle/                  # Migrations
├── public/                   # Assets estáticos
└── docs/                     # Documentação adicional
```

### Padrão Enterprise Base

Todas as tabelas seguem:

```typescript
{
  id: number              // PK auto-increment
  organization_id: number // Multi-tenancy
  version: number         // Optimistic locking
  deleted_at: datetime    // Soft delete
  created_at: datetime
  updated_at: datetime
  created_by: number      // Auditoria
  updated_by: number      // Auditoria
}
```

---

## 🤝 Contribuindo

Este é um projeto proprietário. Para contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Convenção de Commits

```
feat:     Nova feature
fix:      Bug fix
docs:     Documentação
style:    Formatação
refactor: Refatoração de código
test:     Adição de testes
chore:    Manutenção
```

---

## 📄 Licença

Este projeto é **proprietário** e confidencial. Todos os direitos reservados.

---

## 👥 Autores

- **Pedro Lemes** - *Desenvolvimento* - [@pedrojuniorgyn](https://github.com/pedrojuniorgyn)
- **Claude (Anthropic)** - *Assistente de IA* - Pair Programming

---

## 🙏 Agradecimentos

- Next.js team pela framework incrível
- Shadcn pela biblioteca de componentes
- AG Grid pela data grid
- Aceternity UI e Magic UI pela inspiração visual
- Comunidade open source

---

<div align="center">

**Desenvolvido com ❤️ usando Next.js, React e TypeScript**

[⬆ Voltar ao topo](#-aura-core---sistema-tms-enterprise)

</div>
