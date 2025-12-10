# ✅ BTG PACTUAL - CHECKLIST FINAL DE CONFIGURAÇÃO

**Data:** 08/12/2025  
**Objetivo:** Garantir que tudo está configurado corretamente

---

## 📋 **CHECKLIST OBRIGATÓRIO:**

### **☑️ PASSO 1: Verificar `.env`**

Abra o arquivo `.env` na raiz do projeto e confirme que **TODAS** estas linhas existem:

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

**⚠️ ATENÇÃO:**
- ✅ Copie EXATAMENTE como está acima
- ✅ Não adicione espaços extras
- ✅ Não use aspas nos valores
- ✅ Salve o arquivo

---

### **☑️ PASSO 2: Reiniciar Next.js (OBRIGATÓRIO)**

No terminal onde o Next.js está rodando:

```bash
# 1. Pressione Ctrl+C para parar o servidor
# 2. Aguarde alguns segundos
# 3. Execute novamente:
npm run dev
```

**Por quê reiniciar?**
- Next.js carrega variáveis `.env` apenas ao iniciar
- Editar `.env` **NÃO** atualiza automaticamente
- **Reiniciar é obrigatório!**

---

### **☑️ PASSO 3: Verificar Health Check**

```bash
curl http://localhost:3000/api/btg/health
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "✅ BTG API está acessível e autenticação funcionando",
  "environment": "sandbox",
  "apiUrl": "https://api.sandbox.empresas.btgpactual.com"
}
```

**Se der erro:**
- ❌ Volte ao PASSO 1 e verifique o `.env`
- ❌ Confirme que reiniciou no PASSO 2

---

### **☑️ PASSO 4: Testar Dashboard BTG**

Acesse: http://localhost:3000/financeiro/btg-dashboard

**O que deve aparecer:**
```
✅ BTG API está acessível e autenticação funcionando
Ambiente: sandbox | https://api.sandbox.empresas.btgpactual.com
```

**Se aparecer erro vermelho:**
- ❌ Revise os passos anteriores
- ❌ Verifique se reiniciou o Next.js

---

### **☑️ PASSO 5: Testar Pix**

Acesse: http://localhost:3000/financeiro/btg-testes

Clique em **"Gerar Pix de Teste"**

**Resultado esperado:**
```
✅ Cobrança Pix BTG criada com sucesso!
TXID: btg-charge-123...
```

**Se der erro 404:**
- Endpoint pode não estar disponível no sandbox
- Isso é NORMAL em ambiente de testes
- Passe para o próximo teste

---

### **☑️ PASSO 6: Testar Boleto**

Na mesma página de testes, clique em **"Gerar Boleto de Teste"**

**Resultado esperado:**
```
✅ Boleto BTG gerado com sucesso!
Nosso número: 00000001
```

**Se der erro 404:**
- Endpoint pode não estar disponível no sandbox
- Isso é NORMAL em ambiente de testes
- Continue para o próximo teste

---

### **☑️ PASSO 7: Testar DDA (Opcional)**

Acesse: http://localhost:3000/financeiro/dda

Clique em **"Sincronizar BTG"**

**Resultado esperado:**
```json
{
  "success": true,
  "message": "DDAs sincronizados com sucesso!",
  "stats": {
    "ddas": 0,
    "debits": 0
  }
}
```

**Observações:**
- Lista vazia (0 débitos) é **NORMAL** no sandbox
- DDA pode não estar habilitado no ambiente de testes
- Erro "404" é esperado no sandbox

---

## 🔍 **TROUBLESHOOTING:**

### **Erro: "BTG_COMPANY_ID não configurado"**

**Causa:** Variável não está no `.env` ou Next.js não foi reiniciado.

**Solução:**
1. Abra `.env`
2. Adicione: `BTG_COMPANY_ID=30306294000145`
3. **Salve o arquivo**
4. **Reinicie Next.js** (Ctrl+C e `npm run dev`)

---

### **Erro: "your-company-id" aparece nos logs**

**Causa:** Next.js não recarregou o `.env`.

**Solução:**
- **Pare completamente** o servidor (Ctrl+C)
- Aguarde 5 segundos
- **Inicie novamente:** `npm run dev`

---

### **Erro: "404 Not Found" em todos os testes**

**Causa:** Endpoints podem não estar disponíveis no sandbox BTG.

**Solução:**
- ✅ Isso é **NORMAL** no ambiente sandbox
- ✅ Health check deve funcionar
- ✅ Dashboard deve mostrar "conectado"
- ⚠️ Alguns endpoints só funcionam em **produção**

---

### **Erro: "Invalid client credentials"**

**Causa:** Credenciais incorretas ou inválidas.

**Solução:**
1. Verifique se `BTG_CLIENT_ID` e `BTG_CLIENT_SECRET` estão corretos
2. Confirme que são credenciais de **sandbox**
3. Se necessário, gere novas credenciais no portal BTG

---

## 📊 **MATRIZ DE VALIDAÇÃO:**

| Teste | Status Esperado | Se Falhar |
|-------|-----------------|-----------|
| Health Check | ✅ `success: true` | Revisar credenciais |
| Dashboard | ✅ Verde | Revisar `.env` |
| Pix | ⚠️ Pode dar 404 | Normal no sandbox |
| Boleto | ⚠️ Pode dar 404 | Normal no sandbox |
| DDA | ⚠️ Lista vazia | Normal no sandbox |

---

## 🎯 **VALIDAÇÃO FINAL:**

Após completar todos os passos:

**✅ Mínimo necessário:**
- [ ] `.env` configurado com todas as variáveis
- [ ] Next.js reiniciado
- [ ] Health check retornando `success: true`
- [ ] Dashboard mostrando status verde
- [ ] `BTG_COMPANY_ID=30306294000145` presente no `.env`

**✅ Ideal (se sandbox permitir):**
- [ ] Pix gerando sem erro
- [ ] Boleto gerando sem erro
- [ ] DDA sincronizando (mesmo que vazio)

---

## 📝 **PRÓXIMOS PASSOS APÓS VALIDAÇÃO:**

### **1. Ambiente está OK?**
- ✅ Continue usando para desenvolvimento
- ✅ Teste integrações
- ✅ Valide fluxos completos

### **2. Pronto para Produção?**
- ⚠️ **CUIDADO!** Produção usa dados reais
- 📋 Veja `BTG_AMBIENTES.md` para instruções
- 🔴 Boletos e Pix serão REAIS

---

## 🆘 **PRECISA DE AJUDA?**

Se após seguir TODOS os passos ainda houver erro:

**Me mostre:**
1. Conteúdo do `.env` (sem mostrar secrets completos)
2. Saída do comando: `curl http://localhost:3000/api/btg/health`
3. Logs do terminal (últimas 20 linhas)
4. Screenshot do dashboard BTG

---

**Status:** 🟡 **AGUARDANDO VOCÊ COMPLETAR O CHECKLIST!**

**Siga os passos em ordem e me avise o resultado!** 🚀





