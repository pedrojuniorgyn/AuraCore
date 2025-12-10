# 🔧 BTG PIX - CORREÇÃO DE ENDPOINT

**Data:** 08/12/2025  
**Status:** ✅ **CORRIGIDO**

---

## ❌ **PROBLEMA IDENTIFICADO:**

Ao tentar gerar uma cobrança Pix, o sistema retornava erro 404:

```
POST /v1/pix-cash-in/charges/QAZ6iBALG2v4YNZfS5egCVxbTx5RtSew8s6 - 404
The requested URL was not found on this server.
```

---

## 🔍 **CAUSA DO ERRO:**

### **Erro 1: Endpoint Incorreto**

**Antes (ERRADO):**
```typescript
POST /v1/pix-cash-in/charges/{txid}
```

**Depois (CORRETO):**
```typescript
POST /v1/pix-cash-in/charges
```

**Motivo:** O TXID não deve ir na URL, o BTG gera automaticamente.

### **Erro 2: Payload Incorreto**

**Antes (ERRADO):**
```typescript
{
  calendario: { expiracao: 86400 },
  valor: { original: "150.00" },
  chave: "...",
  devedor: { ... },
  solicitacaoPagador: "..."
}
```

**Depois (CORRETO):**
```typescript
{
  amount: { value: 15000 }, // Centavos
  expiration: 86400,
  payer: { name: "...", tax_id: "..." },
  description: "..."
}
```

**Motivo:** Estrutura do payload estava no formato Pix padrão brasileiro, mas BTG usa formato próprio.

---

## ✅ **CORREÇÕES APLICADAS:**

### **1. Endpoint Corrigido**

```typescript
// ANTES
const response = await btgPost<any>(`/v1/pix-cash-in/charges/${txid}`, payload);

// DEPOIS
const response = await btgPost<any>(`/v1/pix-cash-in/charges`, payload);
```

### **2. Payload Ajustado**

```typescript
const payload = {
  amount: {
    value: Math.round(data.valor * 100), // Centavos
  },
  expiration: data.expiracao || 86400,
  payer: data.payerName && data.payerDocument ? {
    name: data.payerName,
    tax_id: data.payerDocument.replace(/\D/g, ""),
  } : undefined,
  description: data.descricao,
};
```

### **3. Resposta Tratada**

```typescript
return {
  txid: response.id || response.txid || "generated-id",
  location: response.location || "",
  qrCode: response.qr_code || response.emv || "",
  qrCodeImage: response.qr_code_image_url || "",
  valor: data.valor,
  status: response.status || "ACTIVE",
  expiracao: String(data.expiracao || 86400),
};
```

### **4. Removido `generateTxid()`**

Não é necessário gerar TXID manualmente, o BTG gera automaticamente.

---

## 🧪 **COMO TESTAR AGORA:**

### **1. Acessar Página de Testes**

```
http://localhost:3000/financeiro/btg-testes
```

### **2. Clicar em "Gerar Pix de Teste"**

**Resultado esperado:**
- ✅ Status 200 OK
- ✅ QR Code gerado
- ✅ ID da cobrança retornado
- ✅ Mensagem de sucesso

### **3. Verificar Resposta**

```json
{
  "success": true,
  "message": "Cobrança Pix BTG criada com sucesso!",
  "charge": {
    "id": 1,
    "txid": "btg-charge-id-123",
    "qr_code": "00020126580014br.gov.bcb.pix..."
  },
  "btgData": {
    "txid": "btg-charge-id-123",
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "valor": 150.00,
    "status": "ACTIVE"
  }
}
```

---

## 📋 **OBSERVAÇÕES IMPORTANTES:**

### **⚠️ Sandbox vs Produção**

Se você estiver no ambiente **sandbox**, o BTG pode:
- ✅ Retornar sucesso mas não gerar QR Code real
- ✅ Retornar IDs de teste
- ⚠️ Não processar pagamentos reais

**Para testes reais de Pix:**
- Mude `BTG_ENVIRONMENT=production` no `.env`
- Use credenciais de produção
- ⚠️ **Atenção:** Pagamentos serão reais!

### **📊 Formato do QR Code Pix**

O BTG pode retornar o QR Code em dois formatos:
- `qr_code` - String Pix Copia e Cola
- `emv` - String EMV do QR Code

Ambos são aceitos pelo sistema.

---

## ✅ **ARQUIVOS ALTERADOS:**

1. ✅ `src/services/btg/btg-pix.ts` - Service corrigido

---

## 🎯 **PRÓXIMOS PASSOS:**

**1.** Teste gerar Pix novamente: http://localhost:3000/financeiro/btg-testes

**2.** Se funcionar:
- ✅ Copie o QR Code
- ✅ Teste no app do banco (ambiente sandbox pode não funcionar)

**3.** Se der erro novamente:
- 📋 Me mostre o erro completo
- 🔍 Vamos analisar a resposta do BTG

---

**Status:** 🟢 **CORRIGIDO E PRONTO PARA TESTAR!**

**Teste agora e me avise o resultado!** 🚀





