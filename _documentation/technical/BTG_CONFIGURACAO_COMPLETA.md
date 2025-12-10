# 🏦 BTG PACTUAL - CONFIGURAÇÃO COMPLETA PASSO A PASSO

**Data:** 08/12/2025  
**Objetivo:** Configurar e testar integração BTG Pactual no AuraCore

---

## 📋 **CHECKLIST DE CONFIGURAÇÃO:**

- [ ] **PASSO 1:** Adicionar variáveis de ambiente
- [ ] **PASSO 2:** Executar migração do banco
- [ ] **PASSO 3:** Testar autenticação BTG
- [ ] **PASSO 4:** Configurar webhook no portal BTG
- [ ] **PASSO 5:** Executar testes completos

---

## 🔧 **PASSO 1: CONFIGURAR VARIÁVEIS DE AMBIENTE**

### **1.1. Abrir arquivo `.env.local`**

Localize o arquivo `.env.local` na raiz do projeto.

### **1.2. Adicionar as seguintes variáveis:**

```env
# ==========================================
# BTG PACTUAL - BANKING API
# ==========================================

# Ambiente (sandbox para testes, production para produção)
BTG_ENVIRONMENT=sandbox

# Credenciais OAuth2 (você recebeu isso no email de aprovação do BTG)
BTG_CLIENT_ID=f737a371-13bc-4202-ba23-e41fdd2f4e78
BTG_CLIENT_SECRET=Dg1jCRu0ral3UU_8bX9tEY0q_ogdCu045vjVqDOY0ZdubQwblGfElayI8qZSA0CqEVDmZ0iuaLGXcqrSX5_KMA

# URLs da API
BTG_API_BASE_URL=https://api.sandbox.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.sandbox.btgpactual.com

# Conta BTG
BTG_ACCOUNT_NUMBER=14609960
BTG_AGENCY=0050

# Chave Pix da empresa (CNPJ, email, telefone ou aleatória)
BTG_PIX_KEY=seu-cnpj-aqui-sem-pontos
```

### **1.3. ⚠️ IMPORTANTE: Onde encontrar suas credenciais?**

**Opção A:** Email de aprovação do BTG  
Procure no email um assunto como: **"Seu aplicativo foi aprovado para testes"**

**Opção B:** Portal BTG  
1. Acesse: https://developers.empresas.btgpactual.com
2. Faça login
3. Vá em **"Meus Aplicativos"** → **"Aura Core"**
4. Clique em **"Credenciais"** ou **"Chaves"**
5. Copie:
   - `Client ID`
   - `Client Secret`

### **1.4. Reiniciar Next.js**

Após salvar o `.env.local`:

```bash
# Pressione Ctrl+C no terminal do Next.js
npm run dev
```

---

## 🗄️ **PASSO 2: EXECUTAR MIGRAÇÃO DO BANCO**

### **2.1. Executar via cURL:**

```bash
curl -X POST http://localhost:3000/api/admin/run-btg-migration
```

### **2.2. Resposta esperada:**

```json
{
  "success": true,
  "message": "Migração BTG executada com sucesso! 🎉",
  "tables": ["btg_boletos", "btg_pix_charges", "btg_payments"]
}
```

### **2.3. Tabelas criadas:**

- ✅ `btg_boletos` - Armazena boletos gerados
- ✅ `btg_pix_charges` - Armazena cobranças Pix
- ✅ `btg_payments` - Armazena pagamentos realizados

---

## 🔐 **PASSO 3: TESTAR AUTENTICAÇÃO BTG**

### **3.1. Testar Health Check:**

```bash
curl http://localhost:3000/api/btg/health
```

### **3.2. Respostas possíveis:**

**✅ SUCESSO (API acessível):**
```json
{
  "success": true,
  "message": "✅ BTG API está acessível e autenticação funcionando",
  "environment": "sandbox",
  "apiUrl": "https://api.sandbox.empresas.btgpactual.com"
}
```

**❌ ERRO (credenciais inválidas):**
```json
{
  "success": false,
  "error": "Invalid client credentials",
  "message": "❌ Erro ao conectar com BTG API"
}
```

### **3.3. Se der erro:**

**Verifique:**
1. Se o `.env.local` foi salvo corretamente
2. Se o Next.js foi reiniciado após editar `.env.local`
3. Se as credenciais estão corretas (Client ID e Secret)
4. Se você está usando `BTG_ENVIRONMENT=sandbox`

---

## 🔔 **PASSO 4: CONFIGURAR WEBHOOK NO PORTAL BTG**

### **4.1. O que é Webhook?**

Webhook é uma **URL** que o BTG vai chamar automaticamente quando:
- 💰 Um boleto for pago
- 💳 Um Pix for recebido
- ✅ Um pagamento for confirmado

**Sem webhook:** Você precisa consultar manualmente  
**Com webhook:** Sistema atualiza automaticamente em tempo real! 🚀

### **4.2. Onde configurar?**

No **print que você enviou**, há um botão: **"Adicionar webhook +"**

### **4.3. Passos no portal BTG:**

1. **Acesse:** https://developers.empresas.btgpactual.com
2. **Faça login**
3. **Vá em:** "Detalhes do app" → aba **"Webhooks"**
4. **Clique em:** "Adicionar webhook +"
5. **Preencha:**

#### **📝 DADOS DO WEBHOOK:**

| Campo | Valor |
|-------|-------|
| **URL do Endpoint** | `https://SEU-DOMINIO.com/api/btg/webhook` |
| **Eventos** | Selecione todos relacionados a pagamentos |

**⚠️ IMPORTANTE:**  
- Para **TESTES LOCAIS**, você precisa de uma URL pública
- Use **ngrok** ou **Cloudflare Tunnel** para expor localhost

#### **🌐 Como expor localhost (TESTES):**

**Opção A: ngrok (mais fácil)**

```bash
# Instalar ngrok
brew install ngrok

# Expor porta 3000
ngrok http 3000

# Você receberá uma URL tipo:
# https://abc123.ngrok.io
```

**Então use no webhook:**  
`https://abc123.ngrok.io/api/btg/webhook`

**Opção B: Cloudflare Tunnel**

```bash
# Instalar cloudflared
brew install cloudflared

# Criar túnel
cloudflared tunnel --url http://localhost:3000
```

### **4.4. Eventos para selecionar:**

Marque os seguintes eventos no portal BTG:

- ✅ `billing.slip.paid` - Boleto pago
- ✅ `billing.slip.cancelled` - Boleto cancelado
- ✅ `pix.received` - Pix recebido
- ✅ `pix.cash_in.paid` - Cobrança Pix paga
- ✅ `payment.approved` - Pagamento aprovado
- ✅ `payment.failed` - Pagamento falhou

### **4.5. Testar webhook:**

Após configurar, o BTG permite testar enviando um payload de exemplo.

---

## 🧪 **PASSO 5: EXECUTAR TESTES COMPLETOS**

### **TESTE 1: Gerar Boleto de Teste**

```bash
curl -X POST http://localhost:3000/api/btg/boletos \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN_AQUI" \
  -d '{
    "payerName": "João da Silva Teste",
    "payerDocument": "12345678901",
    "payerEmail": "joao.teste@example.com",
    "valor": 150.00,
    "dataVencimento": "2025-12-20",
    "descricao": "Teste de boleto BTG"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Boleto BTG gerado com sucesso!",
  "boleto": {
    "id": 1,
    "nosso_numero": "00000001",
    "linha_digitavel": "...",
    "pdf_url": "https://..."
  },
  "btgData": {
    "id": "btg_12345",
    "nosso_numero": "00000001",
    "linha_digitavel": "00190.00009 01234.567891 23456.789012 3 12340000015000",
    "codigo_barras": "00193123400000150000000001234567891234567890",
    "pdf_url": "https://api.sandbox.empresas.btgpactual.com/slips/btg_12345/pdf"
  }
}
```

### **TESTE 2: Gerar Pix QR Code de Teste**

```bash
curl -X POST http://localhost:3000/api/btg/pix/charges \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN_AQUI" \
  -d '{
    "valor": 75.50,
    "chavePix": "seu-cnpj-aqui",
    "descricao": "Teste Pix QR Code",
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
    "txid": "ABC123DEF456GHI789...",
    "qr_code": "00020126580014br.gov.bcb.pix..."
  },
  "btgData": {
    "txid": "ABC123DEF456GHI789...",
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "qrCodeImage": "data:image/png;base64,...",
    "valor": 75.50,
    "status": "ACTIVE"
  }
}
```

### **TESTE 3: Integração com Faturamento**

```bash
# 1. Criar uma fatura de teste primeiro
# 2. Depois gerar boleto BTG para ela:

curl -X POST http://localhost:3000/api/financial/billing/1/generate-boleto-btg \
  -H "Cookie: next-auth.session-token=SEU_TOKEN_AQUI"
```

### **TESTE 4: Verificar Dashboard**

1. Acesse: http://localhost:3000/financeiro/btg-dashboard
2. Verifique se:
   - ✅ Status está verde
   - ✅ Ambiente mostra "sandbox"
   - ✅ KPIs mostram os boletos/pix criados

### **TESTE 5: Consultar Boleto**

```bash
curl http://localhost:3000/api/btg/boletos
```

### **TESTE 6: Consultar Pix**

```bash
curl http://localhost:3000/api/btg/pix/charges
```

---

## 🎯 **RESUMO - ORDEM DE EXECUÇÃO:**

```bash
# 1. Configurar .env.local (adicionar credenciais BTG)
# 2. Reiniciar Next.js
npm run dev

# 3. Executar migração
curl -X POST http://localhost:3000/api/admin/run-btg-migration

# 4. Testar autenticação
curl http://localhost:3000/api/btg/health

# 5. Configurar webhook no portal BTG (depois de configurar ngrok)

# 6. Testar criação de boleto
curl -X POST http://localhost:3000/api/btg/boletos -H "Content-Type: application/json" -d '{...}'

# 7. Testar criação de Pix
curl -X POST http://localhost:3000/api/btg/pix/charges -H "Content-Type: application/json" -d '{...}'

# 8. Acessar dashboard
# http://localhost:3000/financeiro/btg-dashboard
```

---

## ⚠️ **TROUBLESHOOTING:**

### **Erro: "BTG API não está acessível"**

**Causas:**
1. Credenciais inválidas no `.env.local`
2. Next.js não foi reiniciado após editar `.env.local`
3. Ambiente errado (sandbox vs production)

**Solução:**
```bash
# Verificar se .env.local está correto
cat .env.local | grep BTG

# Reiniciar Next.js
# Ctrl+C e depois:
npm run dev
```

### **Erro: "401 Unauthorized"**

**Causa:** Token de autenticação inválido ou expirado

**Solução:**
- Verificar se `BTG_CLIENT_ID` e `BTG_CLIENT_SECRET` estão corretos
- Confirmar que as credenciais são do ambiente correto (sandbox)

### **Erro: "Module not found"**

**Causa:** Falta instalar dependências

**Solução:**
```bash
npm install
```

---

## 📚 **LINKS ÚTEIS:**

- 📖 **Documentação BTG:** https://developers.empresas.btgpactual.com/docs
- 🔌 **API Reference:** https://developers.empresas.btgpactual.com/reference
- 🔔 **Webhooks:** https://developers.empresas.btgpactual.com/docs/webhooks
- 💬 **Comunidade:** https://developers.empresas.btgpactual.com/comunidade

---

## ✅ **CHECKLIST FINAL:**

- [ ] Variáveis BTG configuradas em `.env.local`
- [ ] Next.js reiniciado
- [ ] Migração executada com sucesso
- [ ] Health check retornando `success: true`
- [ ] Webhook configurado no portal BTG (opcional para testes iniciais)
- [ ] Boleto de teste gerado com sucesso
- [ ] Pix de teste gerado com sucesso
- [ ] Dashboard BTG mostrando status verde

---

**Status:** 🟢 **PRONTO PARA CONFIGURAR E TESTAR!**

**Próximo passo:** Seguir os 5 passos acima em ordem! 🚀





