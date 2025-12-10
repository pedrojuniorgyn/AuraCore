# 🏦 BTG PACTUAL - GUIA DE AMBIENTES

**Data:** 08/12/2025  
**Assunto:** Diferenças entre Sandbox e Produção

---

## 🎯 **RESUMO EXECUTIVO:**

O BTG Pactual possui **2 ambientes distintos**:

| Ambiente | URL | CNPJ/Company ID | Dados |
|----------|-----|-----------------|-------|
| **Sandbox (Testes)** | `api.sandbox.empresas.btgpactual.com` | `30306294000145` | Fictícios |
| **Produção** | `api.empresas.btgpactual.com` | Seu CNPJ real | Reais |

---

## 🧪 **AMBIENTE SANDBOX (TESTES):**

### **Características:**

- ✅ **Gratuito** para testes
- ✅ **Dados fictícios** - nada é real
- ✅ **CNPJ padrão obrigatório:** `30306294000145`
- ⚠️ **Não processa pagamentos reais**
- ⚠️ **Não gera boletos válidos**
- ⚠️ **QR Codes Pix não funcionam para pagamento**

### **Configuração no `.env`:**

```env
# SANDBOX (TESTES)
BTG_ENVIRONMENT=sandbox
BTG_API_BASE_URL=https://api.sandbox.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.sandbox.btgpactual.com

# CNPJ FICTÍCIO OBRIGATÓRIO PARA SANDBOX
BTG_COMPANY_ID=30306294000145

# Suas credenciais de teste (recebeu no email de aprovação)
BTG_CLIENT_ID=sua-client-id-sandbox
BTG_CLIENT_SECRET=seu-client-secret-sandbox
```

### **O que funciona no Sandbox:**

- ✅ Autenticação OAuth2
- ✅ Health check
- ✅ Criar boleto (fictício)
- ✅ Criar Pix QR Code (fictício)
- ✅ Consultar DDAs (vazio ou fictício)
- ✅ Listar transações (fictícias)

### **O que NÃO funciona no Sandbox:**

- ❌ Pagamentos reais
- ❌ Boletos válidos para banco
- ❌ Pix QR Code válido para pagamento
- ❌ Webhooks reais (pode simular)
- ❌ Integração com conta bancária real

---

## 🏢 **AMBIENTE PRODUÇÃO:**

### **Características:**

- 💰 **Requer conta BTG Empresas ativa**
- ✅ **Dados reais**
- ✅ **Usa seu CNPJ real**
- ✅ **Processa pagamentos reais**
- ✅ **Gera boletos válidos**
- ✅ **QR Codes Pix funcionam para pagamento**

### **Configuração no `.env`:**

```env
# PRODUÇÃO (REAL)
BTG_ENVIRONMENT=production
BTG_API_BASE_URL=https://api.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.btgpactual.com

# SEU CNPJ REAL (SEM PONTOS E TRAÇOS)
BTG_COMPANY_ID=12345678000190

# Suas credenciais de produção
BTG_CLIENT_ID=sua-client-id-producao
BTG_CLIENT_SECRET=seu-client-secret-producao

# Dados da sua conta BTG real
BTG_ACCOUNT_NUMBER=seu-numero-conta
BTG_AGENCY=sua-agencia
BTG_PIX_KEY=sua-chave-pix
```

### **⚠️ ATENÇÃO - PRODUÇÃO:**

- 🔴 **Pagamentos são REAIS** e **NÃO podem ser estornados**
- 🔴 **Boletos gerados são VÁLIDOS** e clientes podem pagar
- 🔴 **Pix QR Codes são VÁLIDOS** e podem receber pagamento
- 🔴 **Teste tudo no Sandbox ANTES de ir para produção**

---

## 🔄 **MUDANDO DE AMBIENTE:**

### **Sandbox → Produção:**

**PASSO 1:** Obter credenciais de produção no portal BTG

**PASSO 2:** Atualizar `.env`:
```env
BTG_ENVIRONMENT=production
BTG_API_BASE_URL=https://api.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.btgpactual.com
BTG_COMPANY_ID=SEU_CNPJ_REAL
BTG_CLIENT_ID=client-id-producao
BTG_CLIENT_SECRET=client-secret-producao
```

**PASSO 3:** Reiniciar Next.js:
```bash
npm run dev
```

**PASSO 4:** Testar health check:
```bash
curl http://localhost:3000/api/btg/health
```

---

## 🧪 **TESTANDO CADA AMBIENTE:**

### **TESTE 1: Verificar Ambiente Ativo**

Acesse: http://localhost:3000/financeiro/btg-dashboard

**Verifique:**
- 🟢 **Sandbox:** Mostra "sandbox" e URL `api.sandbox...`
- 🔴 **Produção:** Mostra "production" e URL `api.empresas...`

### **TESTE 2: Health Check**

```bash
curl http://localhost:3000/api/btg/health
```

**Resposta Sandbox:**
```json
{
  "success": true,
  "environment": "sandbox",
  "apiUrl": "https://api.sandbox.empresas.btgpactual.com"
}
```

**Resposta Produção:**
```json
{
  "success": true,
  "environment": "production",
  "apiUrl": "https://api.empresas.btgpactual.com"
}
```

---

## 📋 **CHECKLIST DE VALIDAÇÃO:**

### **Antes de ir para PRODUÇÃO:**

- [ ] ✅ Todos os testes passaram no **Sandbox**
- [ ] ✅ Boletos sendo gerados corretamente
- [ ] ✅ Pix sendo criado sem erros
- [ ] ✅ DDA sincronizando (se disponível)
- [ ] ✅ Webhooks testados (simulação)
- [ ] ✅ Integração com Billing funcionando
- [ ] ✅ Credenciais de **produção** obtidas
- [ ] ✅ Conta BTG Empresas **ativa**
- [ ] ✅ DDA **ativado** no internet banking (se usar)

---

## 🔍 **TROUBLESHOOTING:**

### **Erro: "Company not found" ou "404" no Sandbox**

**Causa:** Usando CNPJ real ao invés do fictício.

**Solução:**
```env
BTG_COMPANY_ID=30306294000145  # CNPJ fictício obrigatório
```

### **Erro: "Invalid credentials" no Sandbox**

**Causa:** Usando credenciais de produção no sandbox.

**Solução:** Use credenciais de **sandbox** (ambiente de testes).

### **Erro: "Unauthorized" na Produção**

**Causa:** Usando credenciais de sandbox na produção.

**Solução:** Use credenciais de **produção** (ambiente real).

---

## 📊 **DIFERENÇAS DETALHADAS:**

| Funcionalidade | Sandbox | Produção |
|----------------|---------|----------|
| **Autenticação** | ✅ Funciona | ✅ Funciona |
| **Boletos** | ✅ Fictícios | ✅ Reais e válidos |
| **Pix QR Code** | ✅ Fictício | ✅ Real e válido |
| **DDA** | ⚠️ Vazio/Limitado | ✅ Real |
| **Pagamentos** | ❌ Não processa | ✅ Processa real |
| **Webhooks** | ⚠️ Simulado | ✅ Real |
| **Saldo/Extrato** | ⚠️ Fictício | ✅ Real |
| **Taxas** | ✅ Sem custo | 💰 Conforme contrato |

---

## 🎯 **RECOMENDAÇÕES:**

### **1. DESENVOLVIMENTO:**
- ✅ Use **Sandbox** para todo desenvolvimento
- ✅ CNPJ: `30306294000145`
- ✅ Teste todas as funcionalidades

### **2. HOMOLOGAÇÃO:**
- ✅ Continue no **Sandbox**
- ✅ Teste fluxos completos
- ✅ Valide integrações

### **3. PRODUÇÃO:**
- ✅ Somente após aprovação total no Sandbox
- ✅ Use **seu CNPJ real**
- ✅ Monitore de perto os primeiros usos

---

## 📝 **CONFIGURAÇÃO ATUAL RECOMENDADA:**

Para o **AuraCore em desenvolvimento**, mantenha no `.env`:

```env
# ==========================================
# BTG PACTUAL - AMBIENTE SANDBOX (TESTES)
# ==========================================

BTG_ENVIRONMENT=sandbox
BTG_CLIENT_ID=f737a371-13bc-4202-ba23-e41fdd2f4e78
BTG_CLIENT_SECRET=Dg1jCRu0ral3UU_8bX9tEY0q_ogdCu045vjVqDOY0ZdubQwblGfElayI8qZSA0CqEVDmZ0iuaLGXcqrSX5_KMA
BTG_API_BASE_URL=https://api.sandbox.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.sandbox.btgpactual.com

# CNPJ FICTÍCIO OBRIGATÓRIO PARA SANDBOX
BTG_COMPANY_ID=30306294000145

# Dados fictícios para testes
BTG_ACCOUNT_NUMBER=14609960
BTG_AGENCY=0050
BTG_PIX_KEY=04058687000177
```

---

**Status:** 🟢 **CONFIGURADO PARA SANDBOX!**

**Próximo passo:** Testar DDA e Pix com o Company ID correto! 🚀





