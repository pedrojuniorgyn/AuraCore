# 📊 PLANEJAMENTO - INTEGRAÇÃO AUTOMÁTICA CONTAS A PAGAR/RECEBER

**Data:** 08/12/2025  
**Solicitação:** Integrar importação de NFes e CTes com módulo financeiro  
**Status:** 📋 **AGUARDANDO APROVAÇÃO**

---

## 🔍 **ANÁLISE PRELIMINAR:**

### **1. O QUE JÁ EXISTE:** ✅

**Schemas no Banco:**
- ✅ `accounts_payable` (Contas a Pagar) - Linha 645 schema.ts
- ✅ `accounts_receivable` (Contas a Receber) - Linha 694 schema.ts
- ✅ Campo `origin` já suporta: `'FISCAL_NFE'`, `'FISCAL_CTE'`

**APIs Funcionais:**
- ✅ `/api/financial/payables` (CRUD Contas a Pagar)
- ✅ `/api/financial/receivables` (CRUD Contas a Receber)

**Frontends:**
- ✅ `/financeiro/contas-pagar` (Listagem e gestão)
- ✅ `/financeiro/contas-receber` (Listagem e gestão)

**Importação Automática:**
- ✅ NFe PURCHASE importada automaticamente (SEFAZ)
- ✅ NFe classificada (PURCHASE, CARGO, RETURN, OTHER)
- ✅ Fornecedor cadastrado automaticamente
- ✅ Produtos extraídos

---

### **2. O QUE ESTÁ FALTANDO:** ❌

**NFe de Compra (PURCHASE):**
- ❌ **NÃO cria contas a pagar**
- ❌ **NÃO extrai condições de pagamento** (parcelas, vencimentos)
- ❌ **NÃO extrai formas de pagamento**
- ❌ **NÃO extrai duplicatas** (boletos)

**CTe Emitido:**
- ❌ **NÃO cria contas a receber**
- ❌ **NÃO gera duplicatas** baseado em condições de pagamento
- ❌ **NÃO vincula com cliente**

**CTe de Frete Pago:**
- ❌ **NÃO cria contas a pagar** quando tpServ = REDESPACHO

---

## 🎯 **OBJETIVO DO PROJETO:**

### **AUTOMATIZAR 100% O FLUXO FINANCEIRO:**

**Cenário 1: NFe de COMPRA (Diesel, Peças, etc)**
```
1. NFe importada (SEFAZ) ✅ Já funciona
2. Classificada como PURCHASE ✅ Já funciona
3. Fornecedor cadastrado ✅ Já funciona
4. ❌ FALTA: Extrair tag <pag> e <dup>
5. ❌ FALTA: Criar N parcelas em accounts_payable
6. ❌ FALTA: Criar 1 parcela se pagamento à vista
```

**Cenário 2: CTe EMITIDO (Serviço de Transporte)**
```
1. CTe autorizado na SEFAZ ✅ Já funciona
2. ❌ FALTA: Criar duplicata(s) em accounts_receivable
3. ❌ FALTA: Vincular com cliente (business_partners)
4. ❌ FALTA: Gerar boleto (opcional - BTG ou Banco Inter)
```

**Cenário 3: CTe de REDESPACHO (Frete pago a terceiros)**
```
1. CTe externo importado ✅ Já funciona
2. ❌ FALTA: Se tpServ = REDESPACHO → criar conta a pagar
3. ❌ FALTA: Vincular com transportadora
```

---

## 📋 **ANÁLISE TÉCNICA:**

### **1. TAG `<pag>` NA NFe (Condições de Pagamento):**

**Estrutura XML:**
```xml
<pag>
  <detPag>
    <indPag>0</indPag> <!-- 0=Pgto à vista, 1=Pgto a prazo -->
    <tPag>15</tPag> <!-- 01=Dinheiro, 03=Cartão, 15=Boleto, etc -->
    <vPag>1500.00</vPag>
  </detPag>
</pag>

<cobr>
  <fat>
    <nFat>12345</nFat> <!-- Número da Fatura -->
    <vOrig>1500.00</vOrig> <!-- Valor Original -->
    <vLiq>1500.00</vLiq> <!-- Valor Líquido -->
  </fat>
  <dup> <!-- Duplicata 1 -->
    <nDup>001</nDup>
    <dVenc>2025-01-15</dVenc> <!-- Vencimento -->
    <vDup>750.00</vDup>
  </dup>
  <dup> <!-- Duplicata 2 -->
    <nDup>002</nDup>
    <dVenc>2025-02-15</dVenc>
    <vDup>750.00</vDup>
  </dup>
</cobr>
```

**Interpretação:**
- `<pag>`: Forma de pagamento (boleto, dinheiro, etc)
- `<cobr><dup>`: Parcelas (duplicatas) com vencimento e valor
- **Se não houver `<dup>`:** Pagamento à vista → 1 parcela

---

### **2. CTe (Conhecimento de Transporte):**

**Dados Financeiros no CTe:**
```xml
<vPrest>
  <vTPrest>2500.00</vTPrest> <!-- Valor Total do Serviço -->
  <vRec>2500.00</vRec> <!-- Valor a Receber -->
</vPrest>

<infNFe>
  <chave>NFe44...</chave> <!-- NFe que está sendo transportada -->
</infNFe>

<rem> <!-- Remetente (Cliente) -->
  <CNPJ>12345678000190</CNPJ>
  <xNome>Cliente XYZ</xNome>
</rem>
```

**Condições de Pagamento no CTe:**
- Geralmente **não vem no XML** (é definido no cadastro do cliente)
- Precisa buscar em `business_partners.payment_terms`
- Exemplo: "30/60/90 dias" ou "À vista"

---

### **3. VERIFICAÇÃO DE DUPLICIDADE:**

**IMPORTANTE:** ✅ **NÃO foi desenvolvido antes!**

Confirmei que:
- ❌ `sefaz-processor.ts` não menciona `accountsPayable`
- ❌ `nfe-parser.ts` não extrai tag `<pag>` ou `<dup>`
- ❌ CTe authorization não cria `accountsReceivable`

**Conclusão:** 🎯 **NOVA FUNCIONALIDADE - SEM RISCO DE DUPLICAÇÃO!**

---

## 🏗️ **ARQUITETURA DA SOLUÇÃO:**

### **COMPONENTES A CRIAR/MODIFICAR:**

```
src/services/
├── financial/
│   ├── nfe-payment-extractor.ts       # ✨ NOVO - Extrai pagamentos da NFe
│   ├── cte-receivable-generator.ts    # ✨ NOVO - Gera recebível do CTe
│   └── payment-terms-calculator.ts    # ✨ NOVO - Calcula parcelas

src/services/
├── nfe-parser.ts                      # ✏️ MODIFICAR - Adicionar parsing de <pag> e <dup>
├── sefaz-processor.ts                 # ✏️ MODIFICAR - Integrar com financial

src/services/fiscal/
└── cte-authorization-service.ts       # ✏️ MODIFICAR - Criar recebível após autorizar

src/lib/db/
└── schema.ts                          # ✏️ ADICIONAR - Campos opcionais se necessário
```

---

## 📝 **DETALHAMENTO DAS IMPLEMENTAÇÕES:**

### **SPRINT 1: NFe → Contas a Pagar** ⏱️ **2-3 horas**

#### **1.1 - Atualizar NFe Parser** 🔧

**Arquivo:** `src/services/nfe-parser.ts`

**Adicionar à interface `ParsedNFe`:**
```typescript
export interface ParsedNFe {
  // ... campos existentes ...
  
  // ✨ NOVO: Dados de pagamento
  payment?: {
    type: string; // '15' = Boleto, '01' = Dinheiro, etc
    indicator: string; // '0' = À vista, '1' = A prazo
    installments: Array<{
      number: string; // '001', '002', etc
      dueDate: Date;
      amount: number;
    }>;
  };
}
```

**Implementar função:**
```typescript
function extractPaymentInfo(infNFe: any): ParsedNFe['payment'] {
  // Extrai <pag> e <cobr><dup>
  // Retorna array de parcelas
}
```

---

#### **1.2 - Criar Serviço de Geração de Contas a Pagar** 🆕

**Arquivo:** `src/services/financial/nfe-payable-generator.ts`

```typescript
export async function createPayablesFromNFe(
  nfe: ParsedNFe,
  organizationId: number,
  branchId: number,
  partnerId: number, // Fornecedor
  userId: string
): Promise<number[]> {
  // Se NFe não for PURCHASE → ignora
  // Se já existir conta a pagar com mesma NFe → ignora
  
  // Cenário 1: Tem <dup> (parcelas)
  if (nfe.payment?.installments.length > 0) {
    // Cria N parcelas
    for (const inst of nfe.payment.installments) {
      await db.insert(accountsPayable).values({
        organizationId,
        branchId,
        partnerId,
        description: `NFe ${nfe.number} - Parcela ${inst.number}`,
        documentNumber: `NFe ${nfe.number}-${inst.number}`,
        issueDate: nfe.issueDate,
        dueDate: inst.dueDate,
        amount: inst.amount.toString(),
        status: "OPEN",
        origin: "FISCAL_NFE",
        createdBy: userId,
      });
    }
  } else {
    // Cenário 2: Sem parcelas → Pagamento à vista (1 parcela)
    await db.insert(accountsPayable).values({
      organizationId,
      branchId,
      partnerId,
      description: `NFe ${nfe.number} - Pagamento à Vista`,
      documentNumber: `NFe ${nfe.number}`,
      issueDate: nfe.issueDate,
      dueDate: nfe.issueDate, // Vence no mesmo dia
      amount: nfe.totals.nfe.toString(),
      status: "OPEN",
      origin: "FISCAL_NFE",
      createdBy: userId,
    });
  }
}
```

---

#### **1.3 - Integrar no Processador SEFAZ** 🔌

**Arquivo:** `src/services/sefaz-processor.ts`

**Na função `importNFeAutomatically` (após inserir NFe):**

```typescript
// ✅ Linha atual ~313
console.log(`🏷️  NFe classificada como: ${nfeType}`);

// ✨ ADICIONAR:
// Se for NFe de COMPRA → Criar Contas a Pagar
if (nfeType === "PURCHASE" && partnerId) {
  console.log("💰 Criando contas a pagar...");
  
  try {
    await createPayablesFromNFe(
      parsedNFe,
      organizationId,
      branchId,
      partnerId,
      userId
    );
    
    console.log("✅ Contas a pagar criadas!");
  } catch (error: any) {
    console.error("⚠️  Erro ao criar contas a pagar:", error.message);
    // Não bloqueia importação da NFe
  }
}
```

---

### **SPRINT 2: CTe → Contas a Receber** ⏱️ **2-3 horas**

#### **2.1 - Criar Serviço de Geração de Contas a Receber** 🆕

**Arquivo:** `src/services/financial/cte-receivable-generator.ts`

```typescript
export async function createReceivablesFromCTe(
  cte: any, // Dados do CTe (da tabela cte_documents)
  organizationId: number,
  branchId: number,
  clientId: number, // business_partners (remetente/destinatário)
  userId: string
): Promise<number[]> {
  // Buscar condições de pagamento do cliente
  const [client] = await db
    .select()
    .from(businessPartners)
    .where(eq(businessPartners.id, clientId));
  
  if (!client) {
    throw new Error("Cliente não encontrado");
  }
  
  const paymentTerms = client.paymentTerms || "0"; // "0"=À vista, "30/60"=2 parcelas, etc
  
  // Parsear condições de pagamento
  const installments = parsePaymentTerms(paymentTerms, cte.total_service, cte.issue_date);
  
  // Criar contas a receber
  for (const inst of installments) {
    await db.insert(accountsReceivable).values({
      organizationId,
      branchId,
      partnerId: clientId,
      description: `CTe ${cte.cte_number} - Parcela ${inst.number}`,
      documentNumber: `CTe ${cte.cte_number}-${inst.number}`,
      issueDate: cte.issue_date,
      dueDate: inst.dueDate,
      amount: inst.amount.toString(),
      status: "OPEN",
      origin: "FISCAL_CTE",
      createdBy: userId,
    });
  }
  
  return installments.map((_, i) => i + 1);
}

/**
 * Parse condições de pagamento
 * Exemplos:
 * - "0" → À vista (1 parcela)
 * - "30" → 30 dias (1 parcela)
 * - "30/60/90" → 3 parcelas
 */
function parsePaymentTerms(
  terms: string,
  totalAmount: number,
  issueDate: Date
): Array<{ number: string; dueDate: Date; amount: number }> {
  if (terms === "0" || !terms) {
    // À vista
    return [{
      number: "001",
      dueDate: issueDate,
      amount: totalAmount,
    }];
  }
  
  const days = terms.split("/").map(d => parseInt(d.trim()));
  const amountPerInstallment = totalAmount / days.length;
  
  return days.map((dayOffset, index) => {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + dayOffset);
    
    return {
      number: String(index + 1).padStart(3, "0"),
      dueDate,
      amount: amountPerInstallment,
    };
  });
}
```

---

#### **2.2 - Integrar na Autorização do CTe** 🔌

**Arquivo:** `src/services/fiscal/cte-authorization-service.ts`

**Após autorizar CTe com sucesso:**

```typescript
// ✅ Após salvar protCTe no banco...

// ✨ ADICIONAR:
// Criar contas a receber automaticamente
console.log("💰 Criando contas a receber...");

try {
  // Buscar CTe criado
  const [cte] = await db
    .select()
    .from(cteDocuments)
    .where(eq(cteDocuments.id, cteId));
  
  if (!cte) {
    throw new Error("CTe não encontrado");
  }
  
  // Identificar cliente (remetente ou destinatário)
  const clientId = cte.sender_id || cte.recipient_id;
  
  if (clientId) {
    await createReceivablesFromCTe(
      cte,
      cte.organization_id,
      cte.branch_id,
      clientId,
      userId
    );
    
    console.log("✅ Contas a receber criadas!");
  }
} catch (error: any) {
  console.error("⚠️  Erro ao criar contas a receber:", error.message);
  // Não bloqueia autorização do CTe
}
```

---

### **SPRINT 3: Melhorias Opcionais** ⏱️ **1-2 horas**

#### **3.1 - Campo Adicional no Schema** 📊

**Arquivo:** `src/lib/db/schema.ts`

**Adicionar em `business_partners` (se não existir):**

```typescript
export const businessPartners = mssqlTable("business_partners", {
  // ... campos existentes ...
  
  // ✨ NOVO (se não existir):
  paymentTerms: nvarchar("payment_terms", { length: 50 }).default("0"), // "0", "30", "30/60/90"
  defaultBankAccountId: int("default_bank_account_id"), // Conta bancária preferida
  
  // ... restante ...
});
```

**Migration:**
```sql
-- Adicionar colunas se não existirem
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('business_partners') 
  AND name = 'payment_terms'
)
BEGIN
  ALTER TABLE business_partners ADD payment_terms NVARCHAR(50) DEFAULT '0';
END;
```

---

#### **3.2 - Vincular Conta a Pagar com NFe** 🔗

**Adicionar em `accountsPayable`:**

```typescript
export const accountsPayable = mssqlTable("accounts_payable", {
  // ... campos existentes ...
  
  // ✨ NOVO:
  inboundInvoiceId: int("inbound_invoice_id"), // FK inbound_invoices (NFe de compra)
  
  // ... restante ...
});
```

**Migration:**
```sql
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('accounts_payable') 
  AND name = 'inbound_invoice_id'
)
BEGIN
  ALTER TABLE accounts_payable ADD inbound_invoice_id INT;
  ALTER TABLE accounts_payable ADD CONSTRAINT FK_accounts_payable_inbound_invoice 
    FOREIGN KEY (inbound_invoice_id) REFERENCES inbound_invoices(id);
END;
```

---

#### **3.3 - Vincular Conta a Receber com CTe** 🔗

**Adicionar em `accountsReceivable`:**

```typescript
export const accountsReceivable = mssqlTable("accounts_receivable", {
  // ... campos existentes ...
  
  // ✨ NOVO:
  cteDocumentId: int("cte_document_id"), // FK cte_documents
  
  // ... restante ...
});
```

**Migration:**
```sql
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('accounts_receivable') 
  AND name = 'cte_document_id'
)
BEGIN
  ALTER TABLE accounts_receivable ADD cte_document_id INT;
  ALTER TABLE accounts_receivable ADD CONSTRAINT FK_accounts_receivable_cte 
    FOREIGN KEY (cte_document_id) REFERENCES cte_documents(id);
END;
```

---

## 🧪 **TESTES:**

### **TESTE 1: NFe de Compra com Parcelas**

**Cenário:**
1. Importar NFe com 3 parcelas (30/60/90 dias)
2. Verificar criação de 3 contas a pagar
3. Validar valores e vencimentos

**SQL Verificação:**
```sql
SELECT 
  ap.description,
  ap.document_number,
  ap.due_date,
  ap.amount,
  ap.origin,
  ii.number AS nfe_number
FROM accounts_payable ap
LEFT JOIN inbound_invoices ii ON ap.inbound_invoice_id = ii.id
WHERE ap.origin = 'FISCAL_NFE'
ORDER BY ap.due_date;
```

---

### **TESTE 2: CTe Emitido**

**Cenário:**
1. Autorizar CTe na SEFAZ
2. Verificar criação de conta a receber
3. Validar condições de pagamento do cliente

**SQL Verificação:**
```sql
SELECT 
  ar.description,
  ar.document_number,
  ar.due_date,
  ar.amount,
  ar.origin,
  cte.cte_number,
  bp.name AS cliente
FROM accounts_receivable ar
LEFT JOIN cte_documents cte ON ar.cte_document_id = cte.id
LEFT JOIN business_partners bp ON ar.partner_id = bp.id
WHERE ar.origin = 'FISCAL_CTE'
ORDER BY ar.due_date;
```

---

### **TESTE 3: NFe Pagamento à Vista**

**Cenário:**
1. Importar NFe sem `<dup>` (pagamento à vista)
2. Verificar criação de 1 conta a pagar
3. Vencimento = Data de emissão

---

## 📊 **CRONOGRAMA:**

| Sprint | Tarefa | Tempo | Prioridade |
|--------|--------|-------|------------|
| **SPRINT 1** | NFe → Contas a Pagar | 2-3h | 🔴 Alta |
| 1.1 | Atualizar nfe-parser.ts | 45min | 🔴 |
| 1.2 | Criar nfe-payable-generator.ts | 1h | 🔴 |
| 1.3 | Integrar sefaz-processor.ts | 30min | 🔴 |
| 1.4 | Testes e validação | 45min | 🔴 |
| **SPRINT 2** | CTe → Contas a Receber | 2-3h | 🔴 Alta |
| 2.1 | Criar cte-receivable-generator.ts | 1h | 🔴 |
| 2.2 | Integrar cte-authorization-service.ts | 1h | 🔴 |
| 2.3 | Testes e validação | 1h | 🔴 |
| **SPRINT 3** | Melhorias Opcionais | 1-2h | 🟡 Média |
| 3.1 | Adicionar campos no schema | 30min | 🟡 |
| 3.2 | Vincular NFe ↔ Conta Pagar | 30min | 🟡 |
| 3.3 | Vincular CTe ↔ Conta Receber | 30min | 🟡 |
| **TOTAL** | | **5-8h** | |

---

## 🎯 **ENTREGÁVEIS:**

### **FUNCIONAL:**

1. ✅ NFe PURCHASE → Cria contas a pagar automaticamente
2. ✅ CTe autorizado → Cria contas a receber automaticamente
3. ✅ Respeita parcelas da NFe (`<dup>`)
4. ✅ Respeita condições de pagamento do cliente (CTe)
5. ✅ Vincula com fornecedor/cliente
6. ✅ Marca origem como `FISCAL_NFE` ou `FISCAL_CTE`

### **TÉCNICO:**

1. ✅ Serviços modulares e reutilizáveis
2. ✅ Logs detalhados de processamento
3. ✅ Tratamento de erros (não bloqueia importação)
4. ✅ Validação de duplicatas
5. ✅ Migrations para novos campos

### **DOCUMENTAÇÃO:**

1. ✅ README de integração financeira
2. ✅ Exemplos de XML e payloads
3. ✅ Scripts SQL de consulta

---

## ⚠️ **CONSIDERAÇÕES IMPORTANTES:**

### **1. Duplicatas:**

**Regra:** Verificar se já existe conta a pagar/receber para mesma NFe/CTe

```typescript
// Antes de criar
const [existing] = await db
  .select()
  .from(accountsPayable)
  .where(
    and(
      eq(accountsPayable.organizationId, organizationId),
      eq(accountsPayable.documentNumber, `NFe ${nfe.number}`)
    )
  );

if (existing) {
  console.log("⚠️  Conta a pagar já existe para esta NFe");
  return;
}
```

---

### **2. Erros Não Bloqueiam Importação:**

**Importante:** Se falhar ao criar conta, **não bloqueia** importação da NFe/CTe

```typescript
try {
  await createPayablesFromNFe(...);
} catch (error) {
  console.error("⚠️  Erro ao criar conta:", error);
  // Continua e importa a NFe normalmente
}
```

---

### **3. Condições de Pagamento:**

**NFe:** Vem no XML (`<pag>`, `<dup>`)  
**CTe:** Vem do cadastro do cliente (`business_partners.paymentTerms`)

**Se não informado:** Assume pagamento à vista (1 parcela)

---

### **4. Integração com Boletos (Futuro):**

**Quando:** Após criar conta a receber  
**Como:** Chamar API do BTG Pactual ou Banco Inter  
**Status:** Pode ser implementado em Sprint futura

---

## 🚀 **PRÓXIMOS PASSOS:**

### **OPÇÃO A: IMPLEMENTAR TUDO** ⚡ **5-8h**

- Sprint 1 + 2 + 3
- Integração completa NFe + CTe
- Melhorias de schema

### **OPÇÃO B: IMPLEMENTAR SPRINT 1** 🎯 **2-3h**

- Apenas NFe → Contas a Pagar
- Testar e validar
- Sprint 2 e 3 depois

### **OPÇÃO C: IMPLEMENTAR SPRINT 2** 🎯 **2-3h**

- Apenas CTe → Contas a Receber
- Testar e validar
- Sprint 1 e 3 depois

---

## 📋 **PERGUNTAS PARA APROVAÇÃO:**

1. **Qual opção você prefere?**
   - [ ] Opção A: Implementar tudo (5-8h)
   - [ ] Opção B: Apenas NFe → CP (2-3h)
   - [ ] Opção C: Apenas CTe → CR (2-3h)

2. **Campo `paymentTerms` em `business_partners` existe?**
   - [ ] Sim, já existe
   - [ ] Não, precisa criar

3. **Geração de boleto automático é prioridade?**
   - [ ] Sim, incluir no escopo
   - [ ] Não, deixar para depois

4. **Alguma regra de negócio específica?**
   - Ex: "Sempre gerar 3 parcelas independente do XML"
   - Ex: "Desconto de 2% para pagamento à vista"

---

## ✅ **CHECKLIST PRÉ-IMPLEMENTAÇÃO:**

- [x] Verificado que não existe implementação anterior ✅
- [x] Schema `accounts_payable` e `accounts_receivable` existem ✅
- [x] APIs de gestão de contas funcionam ✅
- [x] NFe parser existe e funciona ✅
- [x] CTe authorization funciona ✅
- [ ] Aprovação do usuário ⏳

---

**Aguardando sua aprovação para iniciar implementação!** 🚀

**Qual opção você escolhe? A, B ou C?**





