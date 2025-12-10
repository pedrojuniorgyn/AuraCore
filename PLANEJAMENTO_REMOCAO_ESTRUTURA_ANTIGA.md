# 📋 **PLANEJAMENTO DE REMOÇÃO - ESTRUTURA ANTIGA**

**Data:** ${new Date().toLocaleString('pt-BR')}  
**Objetivo:** Remover tabelas e rotas antigas mantendo apenas a nova estrutura

---

## 🔍 **ANÁLISE DE DEPENDÊNCIAS**

### **📦 NOVA ESTRUTURA (MANTER 100%)**
✅ `fiscal_documents` - Unificada (NFE, CTE, NFSE, RECEIPT, MANUAL)  
✅ `fiscal_document_items` - Itens com classificação  
✅ `journal_entries` - Lançamentos contábeis  
✅ `journal_entry_lines` - Partidas dobradas  
✅ `financial_transactions` - Baixas com juros/tarifas  

---

### **🗄️ ESTRUTURA ANTIGA (CANDIDATAS À REMOÇÃO)**

| Tabela | Usada Por | Status | Decisão |
|--------|-----------|--------|---------|
| `inbound_invoices` | - | Substituída | ⚠️ **MANTER TEMPORARIAMENTE** |
| `inbound_invoice_items` | - | Substituída | ⚠️ **MANTER TEMPORARIAMENTE** |
| `external_ctes` | - | Substituída | ⚠️ **MANTER TEMPORARIAMENTE** |

**Motivo para manter temporariamente:**
- Servem como **backup** dos dados originais
- Podem ser úteis para **testes e validação**
- Ocupam pouco espaço
- **Recomendação:** Manter por 30-60 dias, depois remover

---

### **🔗 TABELAS RELACIONADAS (MANTER 100%)**

✅ `business_partners` - Usado para popular `partner_name` em `fiscal_documents`  
✅ `accounts_payable` - Tem FK `fiscal_document_id` → `fiscal_documents.id`  
✅ `accounts_receivable` - Tem FK `fiscal_document_id` → `fiscal_documents.id`  
✅ `financial_categories` - Classificação financeira  
✅ `chart_of_accounts` - Plano de contas  
✅ `branches` - Filiais  
✅ `organizations` - Organizações  

---

## 🗑️ **O QUE REMOVER AGORA**

### **1. ROTAS/PÁGINAS ANTIGAS**

| Arquivo | Status | Ação |
|---------|--------|------|
| `/fiscal/entrada-notas` | Duplicada | ❌ **REMOVER** |
| `/fiscal/entrada-notas/[id]` | Duplicada | ❌ **REMOVER** |
| `/api/inbound-invoices` | Duplicada | ❌ **REMOVER** |

**Nova rota equivalente:**
- `/fiscal/documentos` (Monitor unificado) ✅
- `/fiscal/documentos/novo` (Criar manual) ✅
- `/api/fiscal/documents` (API unificada) ✅

---

### **2. LINKS NA SIDEBAR**

❌ Remover: "NFe Entrada" (link antigo)  
✅ Manter: "Documentos Fiscais" (link novo)  

---

### **3. MIGRAÇÕES/SCRIPTS DESCARTÁVEIS**

Estes podem ser removidos pois já foram executados:

❌ `/api/admin/migrate-nfe-only` (já executado)  
❌ `/api/admin/populate-cargo-repository` (antigo)  
❌ `/api/admin/reclassify-existing-nfes` (antigo)  
⚠️ **MANTER:** `/api/admin/run-accounting-migration` (pode precisar reexecutar)  
⚠️ **MANTER:** `/api/admin/fix-partners-from-bp` (útil para novos dados)  

---

## ✅ **PLANO DE EXECUÇÃO**

### **FASE 1: REMOVER ROTAS DUPLICADAS**
1. Deletar `src/app/(dashboard)/fiscal/entrada-notas/page.tsx`
2. Deletar `src/app/(dashboard)/fiscal/entrada-notas/[id]/page.tsx`
3. Deletar `src/app/api/inbound-invoices/route.ts` (se existir)

### **FASE 2: ATUALIZAR SIDEBAR**
1. Remover link "NFe Entrada"
2. Garantir que "Documentos Fiscais" está presente

### **FASE 3: LIMPAR SCRIPTS DESCARTÁVEIS**
1. Mover scripts antigos para pasta `_archive/`
2. Manter apenas scripts reutilizáveis

### **FASE 4: DOCUMENTAR**
1. Criar `MIGRACAO_COMPLETA.md` com histórico
2. Atualizar `README.md` com nova estrutura

---

## ⚠️ **NÃO TOCAR (CRÍTICO)**

🚨 **NUNCA REMOVER:**
- Tabelas com FK ativas: `business_partners`, `accounts_payable`, `accounts_receivable`
- Schemas Drizzle: `src/lib/db/schema/accounting.ts`
- APIs ativas: `/api/fiscal/documents`, `/api/accounting/journal-entries`
- Frontends ativos: `/fiscal/documentos`, `/financeiro/contas-pagar`

---

## 📊 **IMPACTO DA REMOÇÃO**

### **Antes:**
- 2 telas de NFe duplicadas ❌
- APIs duplicadas ❌
- Links confusos na sidebar ❌
- Scripts antigos misturados ❌

### **Depois:**
- 1 tela unificada "Documentos Fiscais" ✅
- 1 API unificada `/api/fiscal/documents` ✅
- Sidebar limpa e clara ✅
- Apenas scripts ativos ✅

---

## 🎯 **RECOMENDAÇÃO FINAL**

**EXECUTAR FASE 1 e 2 AGORA:**
- Remover rotas `/fiscal/entrada-notas`
- Atualizar sidebar

**FASE 3 (Opcional):**
- Pode ser feito depois

**TABELAS ANTIGAS:**
- **NÃO REMOVER** por enquanto (manter como backup)
- Reavaliar em 30-60 dias

---

**Aprovação necessária antes de prosseguir!**




