# 📚 EXEMPLO DE USO: PCG NCM Selector

**Data:** 11/12/2025  
**Componente:** `PcgNcmSelector`  
**Propósito:** Guia completo de uso do novo sistema PCG x NCM

---

## 🎯 CASO DE USO: Formulário de Entrada de Mercadoria

### **Cenário:**
Almoxarife precisa cadastrar a entrada de combustível comprado.

### **Antes (AS-IS):**
```tsx
// ❌ PROBLEMA: Almoxarife não entende linguagem contábil
<Select>
  <SelectItem value="4.1.01.001">4.1.01.001 - Diesel S10</SelectItem>  
  <SelectItem value="4.1.01.002">4.1.01.002 - Diesel S500</SelectItem>
</Select>

// Almoxarife fica confuso: "O que é 4.1.01.001?" 🤔
// Resultado: Erro de classificação ❌
```

### **Depois (TO-BE):**
```tsx
// ✅ SOLUÇÃO: Linguagem operacional + Sugestão inteligente
<PcgNcmSelector
  pcgId={formData.pcgId}
  ncmCode={formData.ncmCode}
  onChange={(pcgId, ncmCode, flags) => {
    setFormData({
      ...formData,
      pcgId,
      ncmCode,
      pisCofinsMono: flags?.pisCofinsMono || false,
      icmsSt: flags?.icmsSt || false,
      // ... outras flags
    });
  }}
/>

// Almoxarife escolhe: "Combustível" ✅
// Sistema sugere: "27101251 - Diesel S10", "27101259 - Diesel S500" ✅
// Flags aplicadas automaticamente: pisCofinsMono = true ✅
```

---

## 💻 EXEMPLO COMPLETO: Formulário de Produto

```tsx
// src/app/(dashboard)/cadastros/produtos/novo/page.tsx

"use client";

import { useState } from "react";
import { PcgNcmSelector } from "@/components/fiscal/pcg-ncm-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NovoProdu toPage() {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    
    // Campos gerenciados pelo PcgNcmSelector
    pcgId: undefined as number | undefined,
    ncmCode: undefined as string | undefined,
    
    // Flags fiscais (auto-preenchidas)
    pisCofinsMono: false,
    icmsSt: false,
    icmsDif: false,
    ipiSuspenso: false,
    importacao: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validação
    if (!formData.pcgId) {
      alert("Selecione a conta gerencial!");
      return;
    }
    
    if (!formData.ncmCode) {
      alert("Selecione o NCM!");
      return;
    }

    // Salva produto com classificação PCG + NCM + flags
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      alert("Produto criado com sucesso!");
      // Redirect...
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Novo Produto</h1>

      {/* Campos básicos */}
      <div>
        <Label>Nome do Produto</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Diesel S10"
        />
      </div>

      <div>
        <Label>Código Interno</Label>
        <Input
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="Ex: DIESEL-S10"
        />
      </div>

      {/* 🔥 COMPONENTE INTELIGENTE DE PCG x NCM */}
      <PcgNcmSelector
        pcgId={formData.pcgId}
        ncmCode={formData.ncmCode}
        onChange={(pcgId, ncmCode, flags) => {
          setFormData({
            ...formData,
            pcgId,
            ncmCode,
            // Aplica flags automaticamente
            pisCofinsMono: flags?.pisCofinsMono || false,
            icmsSt: flags?.icmsSt || false,
            icmsDif: flags?.icmsDif || false,
            ipiSuspenso: flags?.ipiSuspenso || false,
            importacao: flags?.importacao || false,
          });
        }}
        showFlagsCard={true} // Mostra card de flags
      />

      {/* Botão de salvar */}
      <Button type="submit" className="w-full">
        Criar Produto
      </Button>
    </form>
  );
}
```

---

## 🔄 EXEMPLO: Integração com Importação NFe

```typescript
// src/services/sefaz-processor.ts

import { classifyItemByPcg } from "@/services/accounting/pcg-ncm-classifier";

async function importNFeAutomatically(...) {
  // ... parse NFe ...

  // Para cada item da NFe:
  for (const item of parsedNFe.items) {
    // 🔥 NOVO: Classifica usando PCG (ao invés de PCC)
    const pcgClassification = await classifyItemByPcg(
      item.ncm,
      organizationId
    );

    if (pcgClassification) {
      console.log(`✅ Item classificado:
        NCM: ${item.ncm}
        PCG: ${pcgClassification.pcgCode} (${pcgClassification.pcgName})
        Monofásico: ${pcgClassification.flags.pisCofinsMono}
        ICMS-ST: ${pcgClassification.flags.icmsSt}
      `);

      // Salva item com classificação PCG + flags
      await db.insert(payableItems).values({
        payableId,
        ncm: item.ncm,
        productName: item.productName,
        
        // Vincula com PCG (ao invés de PCC)
        pcgId: pcgClassification.pcgId,
        
        // Aplica flags fiscais automaticamente
        pisCofinsMono: pcgClassification.flags.pisCofinsMono,
        icmsSt: pcgClassification.flags.icmsSt,
        // ... outras flags
      });
    } else {
      console.log(`⚠️  NCM ${item.ncm} não tem regra configurada`);
      // Item fica sem classificação (requer atenção manual)
    }
  }
}
```

---

## 📊 EXEMPLO: API de Busca

### **1. Listar Contas Gerenciais:**

```bash
GET /api/pcg-ncm-rules?list_pcgs=true
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "G-1000",
      "name": "Custo Gerencial Diesel Provisao KM",
      "category": null
    },
    {
      "id": 2,
      "code": "G-1001",
      "name": "Custo Gerencial Manutencao Rateio",
      "category": null
    }
  ],
  "total": 2
}
```

### **2. Sugerir NCMs por PCG:**

```bash
GET /api/pcg-ncm-rules?pcg_id=1
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "ncmCode": "27101251",
      "ncmDescription": "Diesel S10 - Uso Veicular",
      "matchType": "EXACT",
      "flags": {
        "pisCofinsMono": true,
        "icmsSt": false,
        "icmsDif": false,
        "ipiSuspenso": false,
        "importacao": false
      },
      "priority": 10
    },
    {
      "ncmCode": "2710*",
      "ncmDescription": "Combustíveis Derivados de Petróleo (Genérico)",
      "matchType": "WILDCARD",
      "flags": {
        "pisCofinsMono": true,
        "icmsSt": false,
        "icmsDif": false,
        "ipiSuspenso": false,
        "importacao": false
      },
      "priority": 50
    }
  ],
  "total": 2,
  "pcgId": 1
}
```

### **3. Buscar Flags Fiscais por NCM:**

```bash
GET /api/pcg-ncm-rules/fiscal-flags?ncm_code=27101251
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "pcgId": 1,
    "pcgCode": "G-1000",
    "pcgName": "Custo Gerencial Diesel Provisao KM",
    "ncmCode": "27101251",
    "ncmDescription": "Diesel S10 - Uso Veicular",
    "flags": {
      "pisCofinsMono": true,
      "icmsSt": false,
      "icmsDif": false,
      "ipiSuspenso": false,
      "importacao": false
    },
    "matchType": "EXACT",
    "priority": 10
  }
}
```

---

## 🎨 PERSONALIZAÇÃO DO COMPONENTE

### **Opção 1: Sem Card de Flags**

```tsx
<PcgNcmSelector
  pcgId={formData.pcgId}
  ncmCode={formData.ncmCode}
  onChange={(pcgId, ncmCode, flags) => { /* ... */ }}
  showFlagsCard={false}  // ← Oculta card de flags
/>
```

### **Opção 2: Desabilitado (Modo Visualização)**

```tsx
<PcgNcmSelector
  pcgId={formData.pcgId}
  ncmCode={formData.ncmCode}
  onChange={() => {}}
  disabled={true}  // ← Modo leitura
/>
```

### **Opção 3: Integrado em Modal**

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Selecionar NCM</DialogTitle>
    </DialogHeader>
    
    <PcgNcmSelector
      pcgId={selectedPcgId}
      ncmCode={selectedNcmCode}
      onChange={(pcgId, ncmCode, flags) => {
        setSelectedPcgId(pcgId);
        setSelectedNcmCode(ncmCode);
        setSelectedFlags(flags);
      }}
    />
    
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🧪 TESTES

### **Teste 1: Match Exato**

```typescript
// Input: NCM 27101251
// Esperado: Match EXATO com regra "Diesel S10"
// Flags: pisCofinsMono = true

const flags = await getFiscalFlagsByNcm("27101251", 1);
expect(flags?.matchType).toBe("EXACT");
expect(flags?.flags.pisCofinsMono).toBe(true);
```

### **Teste 2: Match Wildcard**

```typescript
// Input: NCM 84212399 (não tem regra exata)
// Esperado: Match WILDCARD com regra "8421*" (Filtros)
// Flags: pisCofinsMono = false

const flags = await getFiscalFlagsByNcm("84212399", 1);
expect(flags?.matchType).toBe("WILDCARD");
expect(flags?.ncmCode).toBe("8421*");
```

### **Teste 3: NCM Não Encontrado**

```typescript
// Input: NCM 99999999 (não cadastrado)
// Esperado: null

const flags = await getFiscalFlagsByNcm("99999999", 1);
expect(flags).toBeNull();
```

---

## 📈 BENEFÍCIOS ALCANÇADOS

| Aspecto | Antes (PCC) | Depois (PCG) |
|---------|-------------|--------------|
| **Linguagem** | Contábil (4.1.01.001) ❌ | Operacional (Combustível) ✅ |
| **Sugestão NCM** | Manual ❌ | Automática ✅ |
| **Flags Fiscais** | Manual ❌ | Automática ✅ |
| **Erros de Classificação** | Frequentes ❌ | Raros ✅ |
| **Dependência Contábil** | Alta ❌ | Baixa ✅ |
| **Tempo de Cadastro** | 5-10 min ❌ | 1-2 min ✅ |

---

## 🚀 PRÓXIMOS PASSOS

1. **Adicionar mais regras PCG x NCM:**
   ```sql
   -- Exemplo: Material de Escritório
   INSERT INTO pcg_ncm_rules (organization_id, pcg_id, ncm_code, ncm_description, priority)
   VALUES (1, 3, '48201000', 'Papel A4 - Material Escritório', 10);
   ```

2. **Integrar com outros formulários:**
   - Cadastro de Produtos
   - Entrada de Mercadoria
   - Importação de NFe
   - Cadastro de Insumos

3. **Dashboard de Auditoria:**
   - NCMs sem regra configurada
   - Itens classificados manualmente vs automático
   - Taxa de sucesso de classificação

---

**Status:** ✅ Refatoração Completa e Documentada  
**Autor:** Sistema Aura Core  
**Data:** 11/12/2025





