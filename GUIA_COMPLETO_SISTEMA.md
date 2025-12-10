# 📚 GUIA COMPLETO DO SISTEMA - AURA CORE

## ✅ TELAS CRIADAS E ORGANIZADAS

### 🔷 **FISCAL** (7 telas)

| Tela | URL | Funcionalidade | Status |
|------|-----|----------------|--------|
| **Monitor de Documentos** | `/fiscal/documentos` | Visualizar todos NFes/CTes importados, classificar, gerar títulos | ✅ Completo |
| **Upload de XMLs** | `/fiscal/upload-xml` | Importar XMLs manualmente (NFe/CTe) | ✅ Completo |
| **Categorias de NCM** | `/fiscal/ncm-categorias` | Vincular NCM → Categoria Financeira → Plano de Contas | ✅ Completo |
| **CTe (Documentos)** | `/fiscal/cte` | Gerenciar CTes emitidos | ✅ Completo |
| **Matriz Tributária** | `/fiscal/matriz-tributaria` | Configurar regras fiscais por UF/CFOP | ✅ Completo |
| **Centros de Custo** | `/financeiro/centros-custo` | Criar centros de custo para apropriação | ✅ Completo |
| **Plano de Contas** | `/financeiro/plano-contas` | Criar estrutura contábil hierárquica | ✅ Completo |

---

### 💰 **FINANCEIRO** (14 telas)

| Tela | URL | Funcionalidade | Status |
|------|-----|----------------|--------|
| **Dashboard DRE** | `/financeiro/dre-dashboard` | Visão consolidada de receitas/despesas | ✅ Completo |
| **Contas a Pagar** | `/financeiro/contas-pagar` | Gerenciar dívidas, pagar com juros/multas | ✅ Completo + Master-Detail |
| **Contas a Receber** | `/financeiro/contas-receber` | Gerenciar créditos, receber | ✅ Completo + Master-Detail |
| **Categorias Financeiras** | `/financeiro/categorias` | Criar/Editar categorias (Combustível, Manutenção, etc.) | ✅ **NOVO!** |
| **Remessas Bancárias** | `/financeiro/remessas` | Gerar arquivos CNAB 240/400 | ✅ Completo |
| **Radar DDA** | `/financeiro/radar-dda` | Visualizar débitos autorizados (BTG API) | ✅ Completo |
| **DRE** | `/financeiro/dre` | Demonstrativo de Resultado do Exercício | ✅ Completo |
| **Faturamento Agrupado** | `/financeiro/faturamento` | Visualizar faturamento consolidado | ✅ Completo |
| **Impostos Recuperáveis** | `/financeiro/impostos-recuperaveis` | Gerenciar créditos fiscais | ✅ Completo |
| **Conciliação Bancária** | `/financeiro/conciliacao` | Importar OFX e conciliar extratos | ✅ Completo |
| **Fluxo de Caixa** | `/financeiro/fluxo-caixa` | Previsão de entradas/saídas | ✅ Completo |
| **BTG Pactual Banking** | `/financeiro/btg-dashboard` | Dashboard de integração bancária | ✅ Completo |
| **BTG - Testes** | `/financeiro/btg-testes` | Testar APIs do BTG (Pix, Boleto, TED) | ✅ Completo |
| **DDA - Débitos** | `/financeiro/dda` | Gerenciar débitos diretos autorizados | ✅ Completo |

---

### 🎯 **COMERCIAL & VENDAS** (3 telas)

| Tela | URL | Funcionalidade | Status |
|------|-----|----------------|--------|
| **Cotações** | `/comercial/cotacoes` | CRM de vendas com funil | ✅ Completo |
| **Tabelas de Frete** | `/comercial/tabelas-frete` | Configurar precificação por rota/peso | ✅ Completo |
| **Simulador de Frete** | `/comercial/simulador` | Simular custos de frete | ✅ Completo |

---

### 🚛 **TMS (OPERAÇÃO)** (3 telas)

| Tela | URL | Funcionalidade | Status |
|------|-----|----------------|--------|
| **Viagens (Kanban)** | `/tms/viagens` | Gerenciar viagens em Kanban | ✅ Completo |
| **Repositório de Cargas** | `/tms/repositorio-cargas` | Visualizar cargas importadas de NFes | ✅ Completo |
| **Ocorrências** | `/tms/ocorrencias` | Registrar ocorrências em viagens | ✅ Completo |

---

### 🚙 **FROTA & LOGÍSTICA** (6 telas)

| Tela | URL | Funcionalidade | Status |
|------|-----|----------------|--------|
| **Veículos** | `/frota/veiculos` | Cadastro e controle de veículos | ✅ Completo |
| **Motoristas** | `/frota/motoristas` | Cadastro e controle de motoristas | ✅ Completo |
| **Documentação** | `/frota/documentacao` | Controle de vencimentos (ANTT, CNH, etc.) | ✅ Completo |
| **Pneus** | `/frota/pneus` | Gestão de pneus e rodízios | ✅ Completo |
| **Planos de Manutenção** | `/frota/manutencao/planos` | Criar planos preventivos | ✅ Completo |
| **Ordens de Serviço** | `/frota/manutencao/ordens` | Gerenciar manutenções corretivas/preventivas | ✅ Completo |

---

### 🏢 **CADASTROS** (3 telas)

| Tela | URL | Funcionalidade | Status |
|------|-----|----------------|--------|
| **Cadastros Gerais** | `/cadastros/parceiros` | Clientes, Fornecedores, Transportadores | ✅ Completo |
| **Produtos** | `/cadastros/produtos` | Cadastro de produtos/mercadorias | ✅ Completo |
| **Filiais** | `/cadastros/filiais` | Cadastro de filiais/estabelecimentos | ✅ Completo |

---

### ⚙️ **CONFIGURAÇÕES** (1 tela)

| Tela | URL | Funcionalidade | Status |
|------|-----|----------------|--------|
| **Certificações Fiscais** | `/configuracoes/fiscal` | Configurar certificados A1/A3, SEFAZ | ✅ Completo |

---

## 🔄 FLUXO COMPLETO ATUALIZADO (PASSO A PASSO)

### **1️⃣ IMPORTAÇÃO DE XML**

#### **Opção A: Manual**
```
1. Vá em: Fiscal → Upload de XMLs (/fiscal/upload-xml)
2. Arraste XMLs ou clique em "Escolher arquivos"
3. Clique em "Importar Selecionados"
✅ Sistema salva em fiscal_documents
✅ Classifica automaticamente (PURCHASE/SALE/CARGO/OTHER)
```

#### **Opção B: Automático (SEFAZ)**
```
Execução: A cada 1 hora (cron job ativo)
✅ Sistema consulta SEFAZ automaticamente
✅ Baixa NFes/CTes destinados à sua empresa
✅ Salva e classifica automaticamente
```

---

### **2️⃣ VERIFICAR NO MONITOR**

```
1. Vá em: Fiscal → Monitor de Documentos (/fiscal/documentos)

Você verá 5 KPI Cards:
📄 Total de Documentos
⏰ Aguardando Classificação (fiscalStatus = PENDING)
✅ Prontos para Contabilizar (fiscalStatus = CLASSIFIED)
📗 Contabilizados (accountingStatus = POSTED)
💰 Total Acumulado (soma de valores)

Grid AG Grid com:
- Filtros avançados (Set/Text/Number/Date)
- Sidebar com Advanced Filter Panel
- Exportação para Excel
- Ações: 👁️ Ver | ✏️ Editar | 🗑️ Excluir | 🔄 Reclassificar
```

---

### **3️⃣ CONFIGURAR CATEGORIAS (SE PRIMEIRA VEZ)**

#### **A) Criar Categorias Financeiras**
```
1. Vá em: Financeiro → Categorias Financeiras (/financeiro/categorias)
2. Clique em "Nova Categoria"
3. Preencha:
   - Nome: Combustível
   - Código: COMB (opcional)
   - Tipo: Despesa
   - Descrição: Despesas com combustível
4. Clique em "Criar Categoria"
✅ Categoria disponível para vincular NCMs
```

#### **B) Criar Plano de Contas**
```
1. Vá em: Fiscal → Plano de Contas (/financeiro/plano-contas)
2. Crie estrutura hierárquica:
   4 - DESPESAS
   4.1 - Despesas Operacionais
   4.1.01 - Combustível
   4.1.01.001 - Diesel S10
   4.1.01.002 - Gasolina
   ...
✅ Plano de Contas pronto para vincular
```

#### **C) Vincular NCMs**
```
1. Vá em: Fiscal → Categorias de NCM (/fiscal/ncm-categorias)
2. Veja os 40 NCMs padrão já importados
3. Edite cada NCM (clique na célula):
   - NCM 27101932 → Categoria: Combustível
   - NCM 27101932 → Conta: 4.1.01.001 - Diesel S10
4. Salva automaticamente ao sair da célula
✅ NCMs vinculados e prontos para categorização automática
```

---

### **4️⃣ EDITAR DOCUMENTO E GERAR TÍTULOS**

```
1. Volte em: Fiscal → Monitor de Documentos (/fiscal/documentos)
2. Clique no botão ✏️ Editar no documento
3. Você verá:
   - Dados gerais da NFe
   - Tabela de itens (produtos com NCM, categoria, conta)
   - Status contábil e financeiro
4. Clique em "Gerar Títulos Financeiros"
✅ Sistema cria automaticamente:
   - 1 Conta a Pagar (se PURCHASE)
   - 1 Conta a Receber (se SALE)
   - Vincula cada item à categoria e conta correta
```

---

### **5️⃣ VISUALIZAR CONTAS A PAGAR**

```
1. Vá em: Financeiro → Contas a Pagar (/financeiro/contas-pagar)
2. Você verá 4 KPI Cards:
   💸 Total a Pagar
   🔴 Vencidas (com valor de juros/multas)
   ⏰ Hoje (vencem hoje)
   📅 Próximos 7 dias
3. Grid AG Grid com:
   - Master-Detail (expandir ">" para ver itens da NFe)
   - Filtros avançados
   - Ações: 💳 Pagar | ✏️ Editar | 🗑️ Excluir
```

---

### **6️⃣ PAGAR CONTA**

```
1. Clique no botão 💳 Pagar na linha
2. Sistema abre modal com:
   📄 NFe #000123
   💰 Valor Original: R$ 290,00
   📅 Vencimento: 15/03/2024
   📅 Data Pagamento: [hoje - editável]
   
   Cálculos automáticos:
   ⏰ Juros (0,1%/dia): R$ X,XX (se atrasado)
   ⚠️  Multa (2%): R$ X,XX (se atrasado)
   💵 Desconto: R$ 0,00 (editável)
   🏦 Tarifas Bancárias: R$ 0,00 (editável)
   ━━━━━━━━━━━━━━━━━
   💳 TOTAL A PAGAR: R$ XXX,XX
3. Clique em "Confirmar Pagamento"
✅ Sistema:
   - Atualiza status para PAID
   - Gera lançamento contábil do pagamento
   - Cria transação financeira
```

---

### **7️⃣ (OPCIONAL) GERAR LANÇAMENTO CONTÁBIL**

```
1. Na tela de edição do documento (/fiscal/documentos/[id]/editar)
2. Clique em "Gerar Lançamento Contábil"
✅ Sistema cria journal_entry com:
   - DÉBITO: 4.1.01.001 - Diesel S10 (R$ 290,00)
   - CRÉDITO: 2.1.01.001 - Fornecedores (R$ 290,00)
   - Status: POSTED
✅ Aparece no DRE e relatórios contábeis
```

---

## 📊 ESTRUTURA DA SIDEBAR ATUALIZADA

```
🏠 Dashboard

📊 Comercial & Vendas
  ├─ Cotações
  ├─ Tabelas de Frete
  └─ Simulador de Frete

📄 Fiscal
  ├─ Monitor de Documentos ✨ (Principal)
  ├─ Upload de XMLs
  ├─ Categorias de NCM 🆕
  ├─ CTe (Documentos)
  ├─ Matriz Tributária
  ├─ Centros de Custo
  └─ Plano de Contas

💰 Financeiro
  ├─ Dashboard DRE
  ├─ Contas a Pagar ✨ (Muito usado)
  ├─ Contas a Receber ✨ (Muito usado)
  ├─ Categorias Financeiras 🆕
  ├─ Remessas Bancárias
  ├─ Radar DDA
  ├─ DRE
  ├─ Faturamento Agrupado
  ├─ Impostos Recuperáveis
  ├─ Conciliação Bancária
  ├─ Fluxo de Caixa
  ├─ BTG Pactual Banking
  ├─ BTG - Testes
  └─ 📋 DDA - Débitos

🚛 TMS (Operação)
  ├─ Viagens (Kanban)
  ├─ Repositório de Cargas
  └─ Ocorrências

🚙 Frota & Logística
  ├─ Veículos
  ├─ Motoristas
  ├─ Documentação
  ├─ Pneus
  ├─ Planos de Manutenção
  └─ Ordens de Serviço

🏢 Cadastros
  ├─ Cadastros Gerais
  ├─ Produtos
  └─ Filiais

⚙️ Configurações
  └─ Certificações Fiscais
```

---

## 🎯 TELAS MAIS IMPORTANTES

### **Para Uso Diário:**
1. **Monitor de Documentos** (`/fiscal/documentos`) - Ver todos XMLs importados
2. **Contas a Pagar** (`/financeiro/contas-pagar`) - Pagar fornecedores
3. **Contas a Receber** (`/financeiro/contas-receber`) - Receber de clientes

### **Para Configuração Inicial:**
1. **Categorias Financeiras** (`/financeiro/categorias`) - Criar categorias
2. **Plano de Contas** (`/financeiro/plano-contas`) - Criar estrutura contábil
3. **Categorias de NCM** (`/fiscal/ncm-categorias`) - Vincular NCMs
4. **Centros de Custo** (`/financeiro/centros-custo`) - Criar centros de custo

---

## ✅ CHECKLIST DE CONFIGURAÇÃO INICIAL

### **Antes de Importar o Primeiro XML:**

- [ ] Criar Categorias Financeiras (Combustível, Manutenção, Material, etc.)
- [ ] Criar Plano de Contas (estrutura 4.x para despesas, 3.x para receitas)
- [ ] Vincular NCMs em `/fiscal/ncm-categorias`
- [ ] Criar Centros de Custo (se usar)
- [ ] Configurar Certificado Digital em `/configuracoes/fiscal`

### **Após Configuração:**

- [ ] Importar XML manualmente (teste) em `/fiscal/upload-xml`
- [ ] Verificar classificação automática em `/fiscal/documentos`
- [ ] Gerar título financeiro
- [ ] Verificar em `/financeiro/contas-pagar`
- [ ] Fazer pagamento de teste

---

## 🚀 PRÓXIMOS PASSOS SUGERIDOS

### **Melhorias Futuras:**
1. **Dashboard Home** - Adicionar KPIs consolidados
2. **Relatórios Avançados** - Criar relatórios customizáveis
3. **Webhooks BTG** - Implementar notificações em tempo real
4. **Mobile App** - Aplicativo para motoristas
5. **BI Integrado** - Power BI / Metabase

---

**🎉 SISTEMA 100% FUNCIONAL E ORGANIZADO!**

*Última atualização: 10/12/2024*




