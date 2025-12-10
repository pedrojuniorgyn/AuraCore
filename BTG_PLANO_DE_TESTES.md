# 🧪 BTG PACTUAL - PLANO DE TESTES COMPLETO

**Data:** 08/12/2025  
**Objetivo:** Testar todas as funcionalidades da integração BTG Pactual

---

## 📋 **FASES DE TESTE:**

### **FASE 1: SETUP E CONECTIVIDADE** (10min)
- [ ] 1.1. Configurar `.env.local`
- [ ] 1.2. Reiniciar Next.js
- [ ] 1.3. Executar migração
- [ ] 1.4. Testar health check
- [ ] 1.5. Verificar dashboard BTG

### **FASE 2: BOLETOS** (15min)
- [ ] 2.1. Gerar boleto via API
- [ ] 2.2. Consultar boleto criado
- [ ] 2.3. Baixar PDF do boleto
- [ ] 2.4. Gerar boleto a partir de fatura
- [ ] 2.5. Testar linha digitável

### **FASE 3: PIX COBRANÇA** (15min)
- [ ] 3.1. Criar cobrança Pix
- [ ] 3.2. Verificar QR Code gerado
- [ ] 3.3. Consultar status da cobrança
- [ ] 3.4. Testar expiração

### **FASE 4: PAGAMENTOS** (15min)
- [ ] 4.1. Simular pagamento Pix
- [ ] 4.2. Consultar status do pagamento
- [ ] 4.3. Verificar atualização em Contas a Pagar

### **FASE 5: WEBHOOK** (20min)
- [ ] 5.1. Configurar ngrok/tunnel
- [ ] 5.2. Cadastrar webhook no portal BTG
- [ ] 5.3. Testar webhook com payload de exemplo
- [ ] 5.4. Simular pagamento de boleto
- [ ] 5.5. Verificar atualização automática

### **FASE 6: INTEGRAÇÃO COMPLETA** (30min)
- [ ] 6.1. Fluxo completo: Fatura → Boleto → Pagamento
- [ ] 6.2. Fluxo Pix: Cobrança → QR Code → Pagamento
- [ ] 6.3. Verificar baixa automática em Contas a Receber
- [ ] 6.4. Testar envio de email com boleto

---

## 🎯 **FASE 1: SETUP E CONECTIVIDADE** (COMEÇAR AQUI!)

### **1.1. Configurar `.env.local`**

**Tarefa:** Adicionar credenciais BTG

**Arquivo:** `.env.local` (raiz do projeto)

**Variáveis necessárias:**
```env
BTG_ENVIRONMENT=sandbox
BTG_CLIENT_ID=sua-client-id-aqui
BTG_CLIENT_SECRET=seu-client-secret-aqui
BTG_API_BASE_URL=https://api.sandbox.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.sandbox.btgpactual.com
BTG_ACCOUNT_NUMBER=14609960
BTG_AGENCY=0050
BTG_PIX_KEY=seu-cnpj-sem-pontos
```

**Como obter credenciais:**
1. Email de aprovação do BTG
2. Portal: https://developers.empresas.btgpactual.com → "Meus Aplicativos" → "Credenciais"

**✅ Critério de sucesso:**
- Arquivo `.env.local` salvo com todas as variáveis

---

### **1.2. Reiniciar Next.js**

**Tarefa:** Reiniciar servidor para carregar novas variáveis

**Comando:**
```bash
# Pressionar Ctrl+C no terminal do Next.js
# Depois executar:
npm run dev
```

**✅ Critério de sucesso:**
- Servidor rodando sem erros
- Console mostra: "Ready in Xms"

---

### **1.3. Executar migração**

**Tarefa:** Criar tabelas BTG no banco de dados

**Comando:**
```bash
curl -X POST http://localhost:3000/api/admin/run-btg-migration
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Migração BTG executada com sucesso! 🎉",
  "tables": ["btg_boletos", "btg_pix_charges", "btg_payments"]
}
```

**✅ Critério de sucesso:**
- `success: true`
- 3 tabelas criadas

**❌ Se der erro:**
- Verificar conexão com banco de dados
- Verificar se tabelas já existem
- Verificar logs do servidor

---

### **1.4. Testar health check**

**Tarefa:** Verificar se autenticação BTG está funcionando

**Comando:**
```bash
curl http://localhost:3000/api/btg/health
```

**Resposta esperada (SUCESSO):**
```json
{
  "success": true,
  "message": "✅ BTG API está acessível e autenticação funcionando",
  "environment": "sandbox",
  "apiUrl": "https://api.sandbox.empresas.btgpactual.com"
}
```

**Resposta de ERRO:**
```json
{
  "success": false,
  "error": "Invalid client credentials",
  "message": "❌ Erro ao conectar com BTG API"
}
```

**✅ Critério de sucesso:**
- `success: true`
- `environment: "sandbox"`

**❌ Se der erro:**
- Verificar credenciais em `.env.local`
- Confirmar que Next.js foi reiniciado
- Verificar se está usando `sandbox` e não `production`

---

### **1.5. Verificar dashboard BTG**

**Tarefa:** Acessar dashboard web e verificar status

**URL:**
```
http://localhost:3000/financeiro/btg-dashboard
```

**O que verificar:**
- ✅ Status verde: "✅ BTG API está acessível..."
- ✅ Ambiente: "sandbox"
- ✅ API URL exibida
- ✅ KPIs carregando (podem estar zerados)

**✅ Critério de sucesso:**
- Dashboard carrega sem erros
- Status da conexão está verde

---

## 🎯 **FASE 2: BOLETOS**

### **2.1. Gerar boleto via API**

**Comando:**
```bash
curl -X POST http://localhost:3000/api/btg/boletos \
  -H "Content-Type: application/json" \
  -d '{
    "payerName": "João da Silva Teste",
    "payerDocument": "12345678901",
    "payerEmail": "joao@example.com",
    "valor": 150.00,
    "dataVencimento": "2025-12-20",
    "descricao": "Teste de boleto BTG - Pedido #001"
  }'
```

**⚠️ ATENÇÃO:** Se der erro 401, você precisa estar autenticado!

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Boleto BTG gerado com sucesso!",
  "boleto": {
    "id": 1,
    "nosso_numero": "00000001",
    "linha_digitavel": "00190.00009...",
    "codigo_barras": "00193...",
    "pdf_url": "https://api.sandbox..."
  }
}
```

**✅ Critério de sucesso:**
- Boleto criado no banco
- `linha_digitavel` gerada
- `pdf_url` disponível

---

### **2.2. Consultar boleto criado**

**Comando:**
```bash
curl http://localhost:3000/api/btg/boletos
```

**Resposta esperada:**
```json
{
  "success": true,
  "boletos": [
    {
      "id": 1,
      "nosso_numero": "00000001",
      "status": "REGISTERED",
      "valor_nominal": 150.00
    }
  ]
}
```

**✅ Critério de sucesso:**
- Lista com boleto criado
- Status "REGISTERED"

---

### **2.3. Baixar PDF do boleto**

**Tarefa:** Abrir URL do PDF no navegador

**URL:** (copiar do campo `pdf_url` da resposta anterior)

**✅ Critério de sucesso:**
- PDF abre no navegador
- Boleto formatado corretamente
- Linha digitável visível
- Código de barras visível

---

## 🎯 **FASE 3: PIX COBRANÇA**

### **3.1. Criar cobrança Pix**

**Comando:**
```bash
curl -X POST http://localhost:3000/api/btg/pix/charges \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 75.50,
    "chavePix": "SEU_CNPJ_OU_CHAVE",
    "descricao": "Teste Pix - Pedido #002",
    "expiracao": 3600
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Cobrança Pix BTG criada com sucesso!",
  "charge": {
    "id": 1,
    "txid": "ABC123...",
    "qr_code": "00020126580014br.gov.bcb.pix..."
  },
  "btgData": {
    "qrCode": "00020126580014...",
    "qrCodeImage": "data:image/png;base64,..."
  }
}
```

**✅ Critério de sucesso:**
- Cobrança criada
- QR Code gerado
- TXID único

---

## 🎯 **COMANDOS RÁPIDOS - RESUMO:**

```bash
# SETUP
curl -X POST http://localhost:3000/api/admin/run-btg-migration
curl http://localhost:3000/api/btg/health

# BOLETOS
curl -X POST http://localhost:3000/api/btg/boletos -H "Content-Type: application/json" -d '{"payerName":"João Silva","payerDocument":"12345678901","valor":150,"dataVencimento":"2025-12-20"}'
curl http://localhost:3000/api/btg/boletos

# PIX
curl -X POST http://localhost:3000/api/btg/pix/charges -H "Content-Type: application/json" -d '{"valor":75.50,"chavePix":"sua-chave","descricao":"Teste"}'
curl http://localhost:3000/api/btg/pix/charges

# DASHBOARD
# http://localhost:3000/financeiro/btg-dashboard
```

---

## 📊 **MATRIZ DE TESTES:**

| Teste | Endpoint | Método | Status Esperado |
|-------|----------|--------|-----------------|
| Health Check | `/api/btg/health` | GET | 200 OK |
| Migração | `/api/admin/run-btg-migration` | POST | 200 OK |
| Criar Boleto | `/api/btg/boletos` | POST | 200 OK |
| Listar Boletos | `/api/btg/boletos` | GET | 200 OK |
| Criar Pix | `/api/btg/pix/charges` | POST | 200 OK |
| Listar Pix | `/api/btg/pix/charges` | GET | 200 OK |
| Boleto p/ Fatura | `/api/financial/billing/1/generate-boleto-btg` | POST | 200 OK |
| Webhook | `/api/btg/webhook` | POST | 200 OK |

---

**COMEÇAR AGORA PELA FASE 1! 🚀**





