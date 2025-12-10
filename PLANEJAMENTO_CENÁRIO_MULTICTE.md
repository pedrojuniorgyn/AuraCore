# 🔄 PLANEJAMENTO COMPLETO - CENÁRIO MULTICTE (CTe Externo)

**Data:** 08/12/2025  
**Cenário:** Cliente emite CTe automaticamente (Multicte/bsoft)  
**Impacto:** Workflow duplo (CTe interno vs externo)

---

## 📊 **PARTE 1: IDENTIFICAÇÃO DOS CENÁRIOS**

### **Cenário A: TCL Emite CTe (Workflow Normal)**

**Quando:**
- Clientes que NÃO têm integração Multicte
- Cargas spot (não contratuais)
- Agregados/terceiros (TCL coordena)

**Fluxo:**
```
1. Cliente envia NFe mercadoria
2. TCL importa via Sefaz DFe (apenas NFe)
3. NFe classificada como CARGO
4. Entra no Repositório de Cargas
5. Operador cria Viagem
6. Operador seleciona Cargas
7. TCL emite CTe no Aura Core
8. Assina + Envia Sefaz
9. Gera Conta a Receber
```

---

### **Cenário B: Cliente Emite CTe (Multicte/bsoft) ← NOVO!**

**Quando:**
- Clientes com contrato (Unilever, Ambev, etc)
- Cliente tem certificado digital da TCL
- Sistema Multicte/bsoft integrado

**Fluxo:**
```
1. Cliente emite NFe mercadoria
2. Cliente emite CTe automaticamente (usando certificado TCL!)
3. Cliente envia AMBOS (NFe + CTe) para Sefaz
4. TCL importa via Sefaz DFe (NFe + CTe juntos)
5. Sistema detecta CTe já emitido
6. Vincula CTe externo à NFe automaticamente
7. Marca cargo como "CTe Já Emitido"
8. Operador cria Viagem (sem emitir CTe!)
9. Vincula Viagem ao CTe existente
10. Gera Conta a Receber (se ainda não gerou)
```

**Diferença Crítica:**
- ✅ TCL **NÃO** emite CTe (já foi emitido)
- ✅ Apenas **vincula** viagem ao CTe existente
- ✅ Evita duplicidade

---

## 🛠️ **PARTE 2: MUDANÇAS TÉCNICAS NECESSÁRIAS**

### **2.1 Schema (Ajustes Adicionais)**

#### **Atualizar `cte_header`:**

```typescript
export const cteHeader = mssqlTable("cte_header", {
  // ... campos existentes ...
  
  // ✅ NOVO: Origem do CTe
  cteOrigin: nvarchar("cte_origin", { length: 20 }).notNull().default("INTERNAL"),
  // 'INTERNAL'  - Emitido pelo Aura Core
  // 'EXTERNAL'  - Emitido por cliente (Multicte/bsoft)
  
  // ✅ NOVO: Quem emitiu (se externo)
  externalEmitter: nvarchar("external_emitter", { length: 255 }),
  // Ex: "Sistema Multicte - Unilever"
  
  // ✅ NOVO: Data de importação (se externo)
  importedAt: datetime2("imported_at"),
  
  // ... resto igual ...
});
```

**Migration SQL:**

```sql
ALTER TABLE cte_header 
ADD cte_origin NVARCHAR(20) NOT NULL DEFAULT 'INTERNAL';

ALTER TABLE cte_header 
ADD external_emitter NVARCHAR(255) NULL;

ALTER TABLE cte_header 
ADD imported_at DATETIME2 NULL;
```

---

#### **Atualizar `cargo_documents`:**

```typescript
export const cargoDocuments = mssqlTable("cargo_documents", {
  // ... campos existentes ...
  
  // ✅ NOVO: Flag se CTe já existe
  hasExternalCte: nvarchar("has_external_cte", { length: 1 }).default("N"),
  // 'S' = Cliente já emitiu CTe
  // 'N' = Precisa emitir
  
  // ... resto igual ...
});
```

**Migration SQL:**

```sql
ALTER TABLE cargo_documents 
ADD has_external_cte NVARCHAR(1) DEFAULT 'N';
```

---

### **2.2 Serviço: Importador de CTe (NOVO!)**

**Criar:** `src/services/fiscal/cte-processor.ts`

```typescript
/**
 * CTE PROCESSOR SERVICE
 * 
 * Processa CTes importados via Sefaz DFe (emitidos por clientes)
 */

import { db } from "@/lib/db";
import { cteHeader, cargoDocuments, inboundInvoices } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

interface CteImportResult {
  cteId: number;
  linkedCargos: number[];
  accountsReceivableCreated: boolean;
}

/**
 * Importa um CTe emitido externamente (cliente via Multicte)
 */
export async function importExternalCte(
  cteXml: string,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<CteImportResult> {
  
  // 1. Parse do XML do CTe
  const parsedCte = await parseCteXML(cteXml);
  
  // 2. Verificar duplicata
  const [existingCte] = await db
    .select()
    .from(cteHeader)
    .where(
      and(
        eq(cteHeader.organizationId, organizationId),
        eq(cteHeader.cteKey, parsedCte.cteKey),
        isNull(cteHeader.deletedAt)
      )
    );
  
  if (existingCte) {
    console.log(`⚠️  CTe já importado (Chave: ${parsedCte.cteKey})`);
    throw new Error("DUPLICATE_CTE");
  }
  
  // 3. Validar que TCL é o transportador (segurança!)
  if (!isTclTheCarrier(parsedCte, branchId)) {
    throw new Error("CTe não é da TCL (transportador diferente)");
  }
  
  // 4. Inserir CTe
  const [cte] = await db.insert(cteHeader).values({
    organizationId,
    branchId,
    cteNumber: parsedCte.number,
    serie: parsedCte.series,
    model: "57",
    cteKey: parsedCte.cteKey,
    issueDate: parsedCte.issueDate,
    
    // Origem
    cteOrigin: "EXTERNAL", // ← MARCA COMO EXTERNO!
    externalEmitter: parsedCte.emitterSystem, // Ex: "Multicte Unilever"
    importedAt: new Date(),
    
    // Status
    status: "AUTHORIZED", // Já foi autorizado pela Sefaz
    
    // Partes
    takerId: parsedCte.takerId,
    
    // Valores
    serviceValue: parsedCte.serviceValue,
    totalValue: parsedCte.totalValue,
    
    // XML
    xmlSigned: cteXml,
    
    createdBy: userId,
  }).returning();
  
  // 5. Vincular NFes do CTe
  const linkedCargos = await linkCteToCargoDocuments(
    cte.id,
    parsedCte.cargoDocuments,
    organizationId
  );
  
  // 6. Gerar Conta a Receber (se necessário)
  let accountsReceivableCreated = false;
  if (parsedCte.serviceValue > 0) {
    await createReceivableFromExternalCte(cte.id);
    accountsReceivableCreated = true;
  }
  
  return {
    cteId: cte.id,
    linkedCargos,
    accountsReceivableCreated,
  };
}

/**
 * Vincula CTe às NFes (cargo_documents)
 */
async function linkCteToCargoDocuments(
  cteId: number,
  cargoNfes: string[], // Chaves de acesso das NFes
  organizationId: number
): Promise<number[]> {
  
  const linkedIds: number[] = [];
  
  for (const nfeKey of cargoNfes) {
    // Buscar NFe no sistema
    const [invoice] = await db
      .select()
      .from(inboundInvoices)
      .where(
        and(
          eq(inboundInvoices.organizationId, organizationId),
          eq(inboundInvoices.accessKey, nfeKey),
          isNull(inboundInvoices.deletedAt)
        )
      );
    
    if (!invoice) {
      console.warn(`⚠️  NFe ${nfeKey} não encontrada no sistema`);
      continue;
    }
    
    // Buscar cargo correspondente
    const [cargo] = await db
      .select()
      .from(cargoDocuments)
      .where(
        and(
          eq(cargoDocuments.nfeInvoiceId, invoice.id),
          isNull(cargoDocuments.deletedAt)
        )
      );
    
    if (!cargo) {
      console.warn(`⚠️  Cargo não encontrado para NFe ${nfeKey}`);
      continue;
    }
    
    // Vincular CTe ao Cargo
    await db
      .update(cargoDocuments)
      .set({
        cteId,
        hasExternalCte: "S", // ← MARCA COMO "JÁ TEM CTE"
        status: "IN_TRANSIT", // Atualiza status
      })
      .where(eq(cargoDocuments.id, cargo.id));
    
    linkedIds.push(cargo.id);
  }
  
  return linkedIds;
}

/**
 * Valida se TCL é o transportador no CTe
 */
function isTclTheCarrier(cte: any, branchId: number): boolean {
  // TODO: Comparar CNPJ do transportador com branch
  return true; // Simplificado por enquanto
}
```

---

### **2.3 Integrar no Processador Sefaz**

**Atualizar:** `src/services/sefaz-processor.ts`

```typescript
// Adicionar roteamento para CTe

if (schema?.startsWith("procCTe")) {
  // CTE COMPLETO - Importar automaticamente!
  result.completas++;
  console.log("📥 CTe completo detectado! Importando...");
  
  await importExternalCte(xmlContent, organizationId, branchId, userId);
  result.imported++;
  console.log("✅ CTe importado com sucesso!");
}
```

---

## 🎯 **PARTE 3: WORKFLOWS DETALHADOS**

### **Workflow A: TCL Emite CTe (Sem Multicte)**

```
┌──────────────────────────────────────────────────────────────┐
│ 1. IMPORTAÇÃO NFE                                            │
│    ├─ Cliente envia NFe                                      │
│    ├─ TCL importa via DFe                                    │
│    └─ Classificação: CARGO                                   │
│                  ↓                                            │
│                  ↓ cargo_documents.has_external_cte = 'N'    │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 2. REPOSITÓRIO                                               │
│    ├─ Cargo aparece com badge "Emitir CTe" 🔴               │
│    ├─ Operador visualiza                                     │
│    └─ Status: PENDING                                        │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 3. CRIAR VIAGEM                                              │
│    ├─ Operador cria viagem                                   │
│    ├─ Seleciona cargas (multi-select)                        │
│    └─ Status: ASSIGNED_TO_TRIP                               │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 4. EMITIR CTE (Aura Core)                                    │
│    ├─ Botão "Emitir CTe"                                     │
│    ├─ cte-builder.ts gera XML                                │
│    ├─ Assina com certificado A1                              │
│    ├─ Envia Sefaz                                            │
│    ├─ Status: AUTHORIZED                                     │
│    └─ cte_origin = 'INTERNAL' ✅                             │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 5. FINANCEIRO                                                │
│    └─ Gera accounts_receivable                               │
└──────────────────────────────────────────────────────────────┘
```

---

### **Workflow B: Cliente Emite CTe (Multicte)**

```
┌──────────────────────────────────────────────────────────────┐
│ 1. CLIENTE EMITE NFE + CTE                                   │
│    ├─ Sistema Multicte (Unilever)                            │
│    ├─ Emite NFe da mercadoria                                │
│    ├─ Emite CTe (usando certificado TCL!)                    │
│    └─ Envia ambos para Sefaz                                 │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 2. TCL IMPORTA VIA DFE (Ambos documentos)                    │
│    ├─ Importa NFe                                            │
│    │  ├─ Classificação: CARGO                                │
│    │  └─ Cria cargo_documents                                │
│    │                                                          │
│    └─ Importa CTe ← NOVO!                                    │
│       ├─ cte-processor.ts                                    │
│       ├─ Salva em cte_header                                 │
│       ├─ cte_origin = 'EXTERNAL' ✅                          │
│       ├─ external_emitter = 'Multicte Unilever'              │
│       ├─ Vincula CTe → NFe automaticamente                   │
│       └─ cargo_documents.has_external_cte = 'S' ✅           │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 3. REPOSITÓRIO (Visual Diferenciado)                         │
│    ├─ Cargo aparece com badge "CTe Já Emitido" 🟢           │
│    ├─ Ícone diferente (indicando externo)                    │
│    └─ Status: PENDING (mas com CTe)                          │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 4. CRIAR VIAGEM (Sem emitir CTe!)                            │
│    ├─ Operador cria viagem                                   │
│    ├─ Seleciona cargas                                       │
│    ├─ Sistema detecta: has_external_cte = 'S'                │
│    ├─ ⚠️  NÃO mostra botão "Emitir CTe"                      │
│    ├─ Apenas vincula trip_id ao cargo                        │
│    └─ Status: ASSIGNED_TO_TRIP                               │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 5. VIAGEM (Link com CTe existente)                           │
│    ├─ trip.id vinculado ao cargo                             │
│    ├─ cargo.cte_id já preenchido (CTe externo)               │
│    └─ Mostra: "CTe #123 (Emitido por Unilever)"              │
│                  ↓                                            │
├──────────────────────────────────────────────────────────────┤
│ 6. FINANCEIRO (Se ainda não gerou)                           │
│    ├─ Verifica se já existe conta a receber                  │
│    ├─ Se NÃO: Gera automaticamente                           │
│    └─ Se SIM: Apenas vincula                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎨 **PARTE 4: MUDANÇAS NA UI**

### **4.1 Repositório de Cargas (Indicação Visual)**

```
┌─────────────────────────────────────────────────────────────┐
│  📦 REPOSITÓRIO DE CARGAS                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ NFe  Cliente    Rota   Peso  CTe         Ação        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 1234 Unilever  SP→BA   15t  ✅ Já Emitido  [Alocar]  │ ← EXTERNO
│  │ 5678 Ambev     RJ→MG   20t  🔴 Emitir      [Alocar]  │ ← INTERNO
│  │ 9012 Coca-Cola GO→DF    8t  ✅ Já Emitido  [Alocar]  │ ← EXTERNO
│  │ 3456 Cliente X MG→SP   12t  🔴 Emitir      [Alocar]  │ ← INTERNO
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Legenda:                                                    │
│  ✅ Já Emitido = Cliente emitiu (Multicte)                  │
│  🔴 Emitir     = TCL precisa emitir                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Código (Exemplo):**

```tsx
// Coluna CTe Status
{
  headerName: "CTe",
  field: "hasExternalCte",
  cellRenderer: (params: any) => {
    const hasExternal = params.value === "S";
    
    return (
      <div className="flex items-center gap-2">
        {hasExternal ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-600">Já Emitido</span>
            <Tooltip content="Emitido pelo cliente via Multicte">
              <Info className="h-3 w-3 text-gray-400" />
            </Tooltip>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-600">Emitir</span>
          </>
        )}
      </div>
    );
  }
}
```

---

### **4.2 Modal Criar Viagem (Adaptado)**

```tsx
// Em: src/app/(dashboard)/tms/viagens/create

// Step 2: Selecionar Cargas

const selectedCargos = [/* cargas selecionadas */];

// Verifica se TODAS têm CTe externo
const allHaveExternalCte = selectedCargos.every(c => c.hasExternalCte === 'S');

// Verifica se NENHUMA tem CTe externo
const noneHaveExternalCte = selectedCargos.every(c => c.hasExternalCte === 'N');

// Verifica se é MISTO
const hasMixedCtes = !allHaveExternalCte && !noneHaveExternalCte;

return (
  <div>
    {/* Alerta se misto */}
    {hasMixedCtes && (
      <Alert variant="warning">
        ⚠️ Você selecionou cargas com CTe emitido pelo cliente E cargas
        que precisam de emissão. Agrupe em viagens separadas!
      </Alert>
    )}
    
    {/* Step 3: Confirmar */}
    <div className="mt-4">
      <h3>Próxima Ação:</h3>
      
      {allHaveExternalCte ? (
        <div className="bg-green-50 p-4 rounded">
          ✅ Viagem criada! CTes já foram emitidos pelos clientes.
          Nenhuma ação fiscal necessária.
        </div>
      ) : noneHaveExternalCte ? (
        <div className="bg-blue-50 p-4 rounded">
          🔵 Após criar viagem, você precisará emitir os CTes.
          <Button>Criar Viagem e Emitir CTes</Button>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded">
          ⚠️ Situação mista detectada. Separe as cargas!
        </div>
      )}
    </div>
  </div>
);
```

---

### **4.3 Página de CTes (Indicação de Origem)**

```
┌─────────────────────────────────────────────────────────────┐
│  📄 CTes EMITIDOS                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ CTe  Cliente   Valor    Status      Origem          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 123  Unilever  5.500  ✅ Autorizado  🌐 Multicte     │ ← EXTERNO
│  │ 124  Ambev     7.200  ✅ Autorizado  🏢 Aura Core    │ ← INTERNO
│  │ 125  Coca-Cola 4.800  ⏳ Pendente    🏢 Aura Core    │ ← INTERNO
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Filtros: [Todos] [Internos] [Externos]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Badge de Origem:**

```tsx
{params.data.cteOrigin === 'EXTERNAL' ? (
  <Badge variant="outline" className="text-blue-600">
    <Globe className="h-3 w-3 mr-1" />
    {params.data.externalEmitter || 'Multicte'}
  </Badge>
) : (
  <Badge variant="outline" className="text-green-600">
    <Building className="h-3 w-3 mr-1" />
    Aura Core
  </Badge>
)}
```

---

## 🔒 **PARTE 5: VALIDAÇÕES E SEGURANÇA**

### **5.1 Validação de CTe Externo**

```typescript
// Ao importar CTe externo, validar:

// 1. CTe é da TCL?
if (cte.carrier.cnpj !== branch.document) {
  throw new Error("CTe não é da TCL (transportador diferente)");
}

// 2. CTe já foi importado?
const exists = await checkDuplicateCte(cte.cteKey);
if (exists) {
  throw new Error("CTe já importado anteriormente");
}

// 3. NFes do CTe existem no sistema?
for (const nfeKey of cte.cargoDocuments) {
  const invoice = await findInvoiceByKey(nfeKey);
  if (!invoice) {
    console.warn(`⚠️  NFe ${nfeKey} não encontrada`);
    // Permite importar mesmo assim (pode chegar depois)
  }
}
```

### **5.2 Prevenção de Duplicidade**

```typescript
// Ao criar viagem, verificar se já tem CTe:

if (cargo.hasExternalCte === 'S' && cargo.cteId) {
  // Não mostrar botão "Emitir CTe"
  // Apenas vincular viagem ao CTe existente
  
  await db.update(cteHeader)
    .set({ tripId: trip.id })
    .where(eq(cteHeader.id, cargo.cteId));
  
  console.log("✅ Viagem vinculada ao CTe externo");
}
```

### **5.3 Auditoria**

```typescript
// Log de importação de CTe externo:
await db.insert(auditLogs).values({
  entity: "cte_header",
  entityId: cte.id,
  action: "IMPORT_EXTERNAL_CTE",
  userId,
  metadata: JSON.stringify({
    cteKey: cte.cteKey,
    externalEmitter: cte.externalEmitter,
    linkedCargos: linkedCargoIds,
  }),
});
```

---

## 📊 **PARTE 6: CRONOGRAMA ATUALIZADO**

### **BLOCO 1: Classificação (Mantém)** ⏱️ 3-4h
- Schema: +`nfe_type`
- Serviço: `nfe-classifier.ts`
- Processador: `sefaz-processor.ts`
- UI: Filtros

### **BLOCO 2: Repositório (Mantém + Ajustes)** ⏱️ 7-9h
- Schema: +`cargo_documents` + **`has_external_cte`**
- API: `cargo-repository`
- UI: Repositório + **indicação CTe externo**
- **NOVO:** Badge visual "CTe Já Emitido"

### **BLOCO 3: CTe Interno (Mantém)** ⏱️ 4-6h
- Modal criar viagem
- `cte-builder.ts`
- Workflow normal (TCL emite)

### **BLOCO 4: CTe Externo (NOVO!)** ⏱️ 5-7h
- Schema: +`cte_origin`, +`external_emitter`, +`imported_at`
- **NOVO:** `cte-processor.ts` (importador)
- Integrar em `sefaz-processor.ts` (rotear procCTe)
- Vínculo automático CTe → NFe → Cargo
- UI: Indicação visual de origem
- Validações de segurança
- Testes com CTe Multicte

---

**TOTAL ATUALIZADO:** 19-26 horas

---

## 🎯 **PARTE 7: TESTES E VALIDAÇÃO**

### **Casos de Teste Adicionais:**

#### **Teste 1: CTe Externo (Multicte)**
```
1. Cliente emite NFe + CTe (Multicte)
2. TCL importa via DFe
3. Sistema identifica procCTe
4. Importa CTe externo
5. Vincula CTe → NFe automaticamente
6. Marca cargo: has_external_cte = 'S'
7. Repositório mostra badge "Já Emitido"
8. Criar viagem SEM emitir CTe
9. Vincular viagem ao CTe existente
10. Gerar conta a receber (se não gerou)
```

#### **Teste 2: CTe Interno (Normal)**
```
1. Cliente envia apenas NFe
2. TCL importa via DFe
3. NFe classificada como CARGO
4. Cargo entra no repositório
5. Repositório mostra badge "Emitir"
6. Criar viagem
7. Selecionar cargas
8. Emitir CTe no Aura Core
9. Assinar + Enviar Sefaz
10. Gerar conta a receber
```

#### **Teste 3: Situação Mista (Alerta)**
```
1. Operador seleciona:
   - Cargo A (has_external_cte = 'S')
   - Cargo B (has_external_cte = 'N')
2. Sistema detecta situação mista
3. Exibe alerta: "Separe as cargas!"
4. Impede criação da viagem
```

---

## 🔍 **PARTE 8: QUERIES ÚTEIS (Atualizadas)**

### **1. Listar cargas por tipo de CTe:**

```sql
SELECT 
  c.id,
  c.nfe_number,
  bp.name AS cliente,
  c.destination_city,
  c.has_external_cte,
  CASE 
    WHEN c.has_external_cte = 'S' THEN 'CTe Já Emitido (Cliente)'
    ELSE 'Precisa Emitir (TCL)'
  END AS cte_status
FROM cargo_documents c
INNER JOIN inbound_invoices i ON i.id = c.nfe_invoice_id
INNER JOIN business_partners bp ON bp.id = i.partner_id
WHERE c.status = 'PENDING'
ORDER BY c.has_external_cte DESC, c.delivery_deadline ASC;
```

### **2. Rastrear CTe externo completo:**

```sql
SELECT 
  'CTe Externo' AS tipo,
  cte.cte_number,
  cte.cte_key,
  cte.external_emitter,
  cte.imported_at,
  
  i.access_key AS nfe_key,
  i.number AS nfe_number,
  
  c.status AS cargo_status,
  
  t.trip_number,
  
  ar.amount AS valor_receber
FROM cte_header cte
INNER JOIN cargo_documents c ON c.cte_id = cte.id
INNER JOIN inbound_invoices i ON i.id = c.nfe_invoice_id
LEFT JOIN trips t ON t.id = c.trip_id
LEFT JOIN accounts_receivable ar ON ar.document_number = cte.cte_key
WHERE cte.cte_origin = 'EXTERNAL'
  AND cte.cte_key = '35241234567890000157570010000001231000001234';
```

### **3. Dashboard: CTes Internos vs Externos:**

```sql
SELECT 
  cte_origin,
  COUNT(*) AS total,
  SUM(CAST(total_value AS DECIMAL(18,2))) AS valor_total,
  AVG(CAST(total_value AS DECIMAL(18,2))) AS valor_medio
FROM cte_header
WHERE deleted_at IS NULL
  AND MONTH(issue_date) = MONTH(GETDATE())
GROUP BY cte_origin;
```

---

## 💡 **PARTE 9: RECOMENDAÇÕES FINAIS**

### **Implementação Sugerida:**

**Opção 1: Tudo de uma vez (Blocos 1-4)** ⏱️ 19-26h
- Vantagem: Sistema 100% completo
- Desvantagem: Mais longo

**Opção 2: Faseado (Blocos 1-3 agora, Bloco 4 depois)** 
- Bloco 1-3: Sistema funciona para CTe interno ⏱️ 13-18h
- Bloco 4: Adicionar CTe externo depois ⏱️ 5-7h
- Vantagem: Entrega mais rápida da base
- Desvantagem: Precisará voltar depois

**Opção 3: Priorizar CTe Externo (Blocos 1, 2, 4, 3)**
- Se maioria dos clientes usa Multicte
- Implementa importação primeiro
- Emissão interna depois

---

### **Minha Recomendação:**

**Opção 1: Tudo de uma vez**

**Justificativa:**
1. ✅ Já estamos com o planejamento completo
2. ✅ Não faz sentido voltar depois (perde contexto)
3. ✅ Cenário Multicte é REAL e urgente
4. ✅ 19-26h é aceitável para sistema completo
5. ✅ Evita retrabalho

---

## 📋 **RESUMO EXECUTIVO**

### **O que muda com o Cenário Multicte:**

| Item | Antes (Planejamento Original) | Depois (Com Multicte) |
|------|-------------------------------|----------------------|
| **Schema** | +1 tabela, +7 campos | +1 tabela, +11 campos |
| **Serviços** | 3 serviços | 4 serviços (+cte-processor) |
| **Workflows** | 1 workflow (interno) | 2 workflows (interno + externo) |
| **UI** | Badges simples | Badges + Indicação de origem |
| **Validações** | Básicas | Avançadas (duplicidade, origem) |
| **Tempo** | 13-18h | 19-26h |

### **Benefícios Adicionais:**

✅ **Compatibilidade Multicte** (essencial para grandes clientes)  
✅ **Rastreabilidade completa** (CTe interno vs externo)  
✅ **Prevenção de duplicidade** (evita multas)  
✅ **Workflow flexível** (suporta ambos cenários)  
✅ **Auditoria completa** (quem emitiu, quando, onde)

---

## ❓ **SUA DECISÃO FINAL:**

**Considerando o cenário Multicte, qual opção você escolhe?**

**[ A ] APROVAR COMPLETO - Blocos 1+2+3+4 (19-26h)**
- Sistema 100% completo
- Suporta CTe interno E externo
- Pronto para produção imediata

**[ B ] FASEADO - Blocos 1+2+3 agora, Bloco 4 depois**
- Base funcional primeiro (13-18h)
- CTe externo em segunda fase (5-7h)

**[ C ] REVISAR - Tenho dúvidas/ajustes**
- Me diga o que precisa esclarecer

**[ D ] ADIAR - Guardar para depois**

---

**Aguardando sua decisão!** 🚀







