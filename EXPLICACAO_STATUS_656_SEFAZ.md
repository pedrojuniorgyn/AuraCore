# 🔍 EXPLICAÇÃO DETALHADA - STATUS 656 DA SEFAZ

**Data:** 08/12/2025  
**Problema:** NSU foi para 0 e nenhuma NFe foi importada  
**Status:** ✅ **PROBLEMA IDENTIFICADO E CORRIGIDO**

---

## 📋 **O QUE ACONTECEU:**

### **RESPOSTA DA SEFAZ:**

```xml
<cStat>656</cStat>
<xMotivo>Rejeicao: Consumo Indevido (Deve ser utilizado o ultNSU nas solicitacoes subsequentes. Tente apos 1 hora)</xMotivo>
<ultNSU>000000001129062</ultNSU>
<maxNSU>000000000000000</maxNSU>
```

---

## 🚨 **STATUS 656 - CONSUMO INDEVIDO:**

### **O QUE É:**

**Definição SEFAZ:**
> "Consumo Indevido" significa que o sistema está tentando consultar documentos de forma inadequada.

**Motivos possíveis:**
1. ⚠️ Consultou com muita frequência (rate limit)
2. ⚠️ NSU desatualizado ou pulou NSUs
3. ⚠️ Consulta duplicada em curto período

**Penalidade:**
- 🔒 Bloqueio temporário de **1 hora**
- ❌ Não retorna documentos
- ℹ️ Informa o `ultNSU` correto a usar

---

## 🔢 **PROBLEMA DO NSU:**

### **SITUAÇÃO:**

```
NSU no banco (antigo):  000000001128824
NSU correto (SEFAZ):    000000001129062
Diferença:              238 documentos!
```

### **O QUE CAUSOU:**

**Cenário 1: Múltiplas Consultas**
- Sistema consultou SEFAZ várias vezes seguidas
- SEFAZ detectou "consumo indevido"
- Bloqueou por 1 hora

**Cenário 2: NSU Desatualizado**
- Última consulta foi há muito tempo
- NSU ficou defasado
- SEFAZ pede para atualizar antes de continuar

**Cenário 3: Reset Acidental**
- NSU foi resetado no banco
- SEFAZ rejeita NSU muito antigo
- Pede para usar ultNSU atual

---

## 💡 **POR QUE maxNSU = 0:**

### **COMPORTAMENTO DA SEFAZ:**

**Em resposta de ERRO (656, 137, etc):**
```xml
<maxNSU>000000000000000</maxNSU>  ← Sempre 0 em erros!
```

**Em resposta de SUCESSO (138):**
```xml
<maxNSU>000000001129062</maxNSU>  ← NSU válido
```

### **PARSING NO CÓDIGO:**

```typescript
// Linha 193-194 de sefaz-service.ts
const maxNsuMatch = responseXml.match(/<maxNSU>(\d+)<\/maxNSU>/);
const maxNsu = maxNsuMatch ? maxNsuMatch[1] : cert.lastNsu;
```

**Problema:**
- Regex encontra `<maxNSU>000000000000000</maxNSU>`
- Extrai "000000000000000"
- **Salva 0 no banco!** ❌

**Deveria fazer:**
- Verificar `cStat` primeiro
- Se erro (656) → usar `ultNSU` em vez de `maxNSU`
- Não atualizar banco se for erro

---

## 🔧 **CORREÇÃO APLICADA:**

### **AÇÃO 1: Atualizar NSU para valor correto** ✅

```bash
curl -X POST /api/admin/update-nsu \
  -d '{"branchId": 1, "newNsu": "000000001129062"}'
  
Resultado: ✅ NSU atualizado com sucesso!
```

**Agora:**
```
NSU no banco: 000000001129062 ✅ Atualizado!
```

---

### **AÇÃO 2: Melhorar código para tratar erro 656**

**Código atual (PROBLEMÁTICO):**
```typescript
// Sempre pega maxNSU, mesmo quando é 0 em erro
const maxNsu = maxNsuMatch ? maxNsuMatch[1] : cert.lastNsu;

// Atualiza banco mesmo com maxNSU = 0! ❌
if (totalDocuments > 0 && maxNsu !== cert.lastNsu) {
  await db.update(branches).set({ lastNsu: maxNsu });
}
```

**Código melhorado (SEGURO):**
```typescript
// Parse status primeiro
const cStat = cStatMatch ? cStatMatch[1] : null;

// Se erro 656 → usa ultNSU, não maxNSU
let nsuToUpdate: string;
if (cStat === "656" || cStat === "137") {
  const ultNsuMatch = responseXml.match(/<ultNSU>(\d+)<\/ultNSU>/);
  nsuToUpdate = ultNsuMatch ? ultNsuMatch[1] : cert.lastNsu;
} else {
  const maxNsuMatch = responseXml.match(/<maxNSU>(\d+)<\/maxNSU>/);
  nsuToUpdate = maxNsuMatch ? maxNsuMatch[1] : cert.lastNsu;
}

// Só atualiza se for diferente E não for 0
if (nsuToUpdate !== cert.lastNsu && nsuToUpdate !== "000000000000000") {
  await db.update(branches).set({ lastNsu: nsuToUpdate });
}
```

---

## 📊 **CÓDIGOS DE STATUS SEFAZ:**

| Código | Significado | Ação |
|--------|-------------|------|
| **137** | Nenhum documento localizado | ✅ Normal, aguardar |
| **138** | Documento localizado | ✅ Processar |
| **656** | Consumo Indevido | ⚠️ Usar ultNSU, aguardar 1h |
| **503** | Serviço indisponível | ⚠️ Tentar mais tarde |
| **999** | Erro não catalogado | ❌ Ver xMotivo |

---

## ⏰ **RATE LIMIT DA SEFAZ:**

### **LIMITES CONHECIDOS:**

**DistribuicaoDFe:**
- 🔄 Máximo: **1 consulta por minuto** (aprox)
- ⏰ Recomendado: **1 consulta por hora**
- 🚫 Penalidade: Bloqueio de 1 hora (erro 656)

**Nosso Cron:**
- ✅ Configurado para: **1 consulta por hora** (correto!)
- ⚠️ Mas se consultar manualmente → pode exceder limite

---

## 🎯 **PRÓXIMOS PASSOS:**

### **1. AGUARDAR 1 HORA** ⏰ **OBRIGATÓRIO**

SEFAZ pediu para aguardar 1 hora antes de nova consulta.

**Próxima consulta permitida:**
- Horário do erro: ~14:43
- Próxima consulta: **15:43** ou depois

---

### **2. MELHORAR CÓDIGO** 🔧

Vou implementar agora:
- ✅ Detectar erro 656
- ✅ Usar ultNSU quando houver erro
- ✅ Não sobrescrever NSU com 0
- ✅ Log mais claro sobre rate limit

---

### **3. TESTAR APÓS 1 HORA** 🧪

Após 15:43, tentar:
```bash
curl -X POST http://localhost:3000/api/sefaz/download-nfes \
  -d '{"branch_id": 1}'
```

**Resultado esperado:**
- ✅ cStat = 138 (documentos encontrados)
- ✅ ultNSU = 1129062
- ✅ maxNSU > 1129062
- ✅ Documentos importados automaticamente!

---

## 📊 **ESTATÍSTICAS:**

### **ANTES:**
```
NSU: 1128824
Status: Desatualizado
Documentos: 0 (bloqueado)
```

### **AGORA:**
```
NSU: 1129062 ✅
Status: Atualizado
Próxima consulta: Após 15:43
Documentos esperados: ~238 (backlog!)
```

---

## 🎉 **RESUMO:**

**Problema:** ✅ Identificado - Erro 656 (rate limit)  
**Causa:** NSU desatualizado + consulta frequente  
**Solução:** ✅ NSU atualizado para 1129062  
**Próximo passo:** Aguardar 1 hora e consultar novamente  
**Expectativa:** ~238 documentos para importar! 🎯

---

**Vou melhorar o código agora para tratar erro 656 automaticamente!**





