# 📋 Tasks Iniciais para GitHub Projects

Cole essas tasks no seu GitHub Project para começar a usar!

---

## ✅ MVP - Concluídos

### Infraestrutura
- [x] Multi-tenancy (organization_id)
- [x] Autenticação Next-Auth
- [x] Gestão de Filiais
- [x] Enterprise Base Pattern

### Fiscal
- [x] Importação NFe via Sefaz DFe
- [x] Emissor CTe 4.0
- [x] Emissor MDFe 3.0
- [x] Matriz Tributária
- [x] Certificado Digital A1

### Financeiro
- [x] Contas a Pagar
- [x] Contas a Receber
- [x] CNAB 240
- [x] DDA (BTG Pactual)
- [x] Plano de Contas Gerencial
- [x] Centros de Custo
- [x] DRE

### Comercial
- [x] Cotações (Torre de Controle)
- [x] Tabelas de Frete
- [x] Cálculo automático de frete
- [x] Simulador de frete

### Frota
- [x] Gestão de Veículos
- [x] Gestão de Motoristas
- [x] Validações (CNH, placa)

### TMS
- [x] Ordens de Coleta
- [x] Viagens (Kanban)
- [x] Workflow automático

### UI/UX
- [x] Aura Glass Sidebar
- [x] Componentes modernos (15+)
- [x] AG Grid tema customizado
- [x] Animações (Framer Motion)

---

## 🚧 Em Andamento

### Frontend - Pendências
- [ ] Gestão de Tabelas de Frete (100%)
  - **Module:** Comercial
  - **Priority:** High
  - **Estimate:** 8h
  - **Description:** Finalizar tela Master-Detail com abas (Geral, Rotas, Preços, Generalidades) e importação CSV

- [ ] Viagens Kanban (Melhorias)
  - **Module:** TMS
  - **Priority:** Medium
  - **Estimate:** 4h
  - **Description:** Drag & drop entre colunas, filtros avançados, timeline de eventos

### Integrações
- [ ] Certificado Digital A1 (Produção)
  - **Module:** Fiscal
  - **Priority:** Critical
  - **Estimate:** 6h
  - **Description:** API de upload funcional, validação, armazenamento encrypted

- [ ] Sefaz - Endpoints Produção
  - **Module:** Fiscal
  - **Priority:** High
  - **Estimate:** 4h
  - **Description:** Configurar endpoints produção, testar envio CTe/MDFe real

### DevOps
- [ ] Deploy Produção (Vercel/Railway)
  - **Module:** Infraestrutura
  - **Priority:** Critical
  - **Estimate:** 8h
  - **Description:** Configurar deploy, env vars, CI/CD

- [ ] Monitoramento (Sentry)
  - **Module:** Infraestrutura
  - **Priority:** High
  - **Estimate:** 3h
  - **Description:** Setup Sentry para error tracking

### Testes
- [ ] Setup Playwright
  - **Module:** Testing
  - **Priority:** High
  - **Estimate:** 6h
  - **Description:** Configurar Playwright, criar primeiros testes E2E

- [ ] Testes E2E - Fluxo Completo
  - **Module:** Testing
  - **Priority:** Medium
  - **Estimate:** 12h
  - **Description:** Login → Cotação → CTe → Viagem → Finalizar

### Documentação
- [ ] README.md completo ✅ (Concluído)
- [ ] .env.example
  - **Module:** Docs
  - **Priority:** High
  - **Estimate:** 1h
  - **Description:** Criar .env.example com todas variáveis necessárias

- [ ] API Documentation (Swagger/OpenAPI)
  - **Module:** Docs
  - **Priority:** Medium
  - **Estimate:** 8h
  - **Description:** Gerar documentação interativa das APIs

---

## 📋 Backlog (Próximos 1-2 meses)

### Features Novas
- [ ] Gestão de Contratos
  - **Module:** Comercial
  - **Priority:** Medium
  - **Estimate:** 16h
  - **Description:** Contratos de frete com clientes, vigência, reajustes

- [ ] Dashboard Executivo (BI)
  - **Module:** Financeiro
  - **Priority:** Medium
  - **Estimate:** 20h
  - **Description:** Análise de rentabilidade, performance, previsões

- [ ] Mobile App (React Native)
  - **Module:** Mobile
  - **Priority:** Low
  - **Estimate:** 80h
  - **Description:** App para motoristas, check-in/out, fotos

### Integrações Avançadas
- [ ] Rastreamento Veicular (Onixsat/Sascar)
  - **Module:** TMS
  - **Priority:** Medium
  - **Estimate:** 24h
  - **Description:** Integração com rastreadores, mapa em tempo real

- [ ] EDI (Electronic Data Interchange)
  - **Module:** Integrações
  - **Priority:** Low
  - **Estimate:** 40h
  - **Description:** Recebimento de pedidos via EDI, envio de status

- [ ] WhatsApp Business API
  - **Module:** Integrações
  - **Priority:** Low
  - **Estimate:** 16h
  - **Description:** Chatbot para rastreamento, cotação

### Otimizações
- [ ] Performance - Bundle Size
  - **Module:** Frontend
  - **Priority:** Medium
  - **Estimate:** 4h
  - **Description:** Code splitting, lazy loading, tree shaking

- [ ] SEO & Meta Tags
  - **Module:** Frontend
  - **Priority:** Low
  - **Estimate:** 2h
  - **Description:** Meta tags, Open Graph, sitemap

- [ ] Acessibilidade (A11y)
  - **Module:** UI/UX
  - **Priority:** Medium
  - **Estimate:** 8h
  - **Description:** ARIA labels, keyboard navigation, contraste

---

## 🐛 Bugs Conhecidos

### Críticos (🔴)
- Nenhum no momento

### Alta Prioridade (🟠)
- [ ] Fix: branches.filter validation
  - **Status:** Fixed ✅
  - **Description:** Adicionado Array.isArray() checks

### Média Prioridade (🟡)
- [ ] Improve: AG Grid performance com muitos dados
  - **Module:** Frontend
  - **Estimate:** 3h
  - **Description:** Implementar virtualização, lazy loading

### Baixa Prioridade (🟢)
- [ ] Enhancement: Sidebar scroll fade mais suave
  - **Module:** UI/UX
  - **Estimate:** 1h
  - **Description:** Ajustar gradiente de fade

---

## 🌟 Ideias Futuras (Backlog)

- [ ] Marketplace de Fretes (Uber Freight style)
- [ ] IA/ML para precificação inteligente
- [ ] Otimização de rotas (algoritmo de roteirização)
- [ ] Integração com ERP externo (TOTVS, SAP)
- [ ] API pública para parceiros
- [ ] Modo offline (PWA)
- [ ] Multi-idioma (i18n)
- [ ] Tema claro (Light mode)

---

## 📝 Como Usar

1. Acesse seu GitHub Project
2. Para cada task acima:
   - Clique em "Add item"
   - Cole o título
   - Defina:
     - **Status:** Backlog/To Do/In Progress/Done
     - **Module:** (conforme indicado)
     - **Priority:** (conforme indicado)
     - **Estimate:** (conforme indicado)
   - Adicione a descrição completa

3. Organize no Kanban conforme prioridade

4. Use milestones para agrupar tasks de uma release

---

**Dica:** Crie labels coloridos no GitHub para cada módulo:
- 🟢 `module: comercial`
- 🔵 `module: fiscal`
- 🟣 `module: financeiro`
- 💗 `module: tms`
- 🟠 `module: frota`
- 🔴 `priority: critical`
- 🟡 `priority: high`

