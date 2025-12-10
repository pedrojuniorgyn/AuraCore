# 🚀 COMANDOS DE TERMINAL - IMPORTAÇÃO AUTOMÁTICA

**Data:** 08/12/2025  
**Propósito:** Executar importação manual via terminal

---

## 📋 **COMANDOS DISPONÍVEIS:**

### **1. FORÇAR IMPORTAÇÃO AGORA (Recomendado)**

```bash
curl -X POST http://localhost:3000/api/admin/force-auto-import
```

**O que faz:**
- ✅ Executa importação IMEDIATAMENTE
- ✅ Não aguarda cron job
- ✅ Logs detalhados no terminal Next.js
- ✅ Retorna JSON com resultado

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Importação automática executada com sucesso!",
  "note": "Verifique os logs acima para detalhes da importação."
}
```

---

### **2. VER INSTRUÇÕES DA API**

```bash
curl http://localhost:3000/api/admin/force-auto-import
```

**Retorna:**
```json
{
  "endpoint": "/api/admin/force-auto-import",
  "method": "POST",
  "description": "Força execução manual da importação automática de NFes",
  "usage": {
    "curl": "curl -X POST http://localhost:3000/api/admin/force-auto-import",
    "browser": "POST http://localhost:3000/api/admin/force-auto-import"
  }
}
```

---

### **3. FORÇAR IMPORTAÇÃO COM RESPOSTA FORMATADA**

```bash
curl -X POST http://localhost:3000/api/admin/force-auto-import | jq
```

**Requer:** `jq` instalado (`brew install jq`)

**Resultado:**
```json
{
  "success": true,
  "message": "Importação automática executada com sucesso!",
  "note": "Verifique os logs acima para detalhes da importação."
}
```

---

### **4. TESTAR CONEXÃO SEFAZ (Sem importar)**

```bash
curl -X POST http://localhost:3000/api/sefaz/test-connection \
  -H "Content-Type: application/json" \
  -d '{"branchId": 1}'
```

**O que faz:**
- ✅ Testa conexão com SEFAZ
- ✅ Valida certificado
- ✅ NÃO importa documentos
- ✅ Útil para debug

---

## 🎯 **EXEMPLO DE USO COMPLETO:**

### **Cenário: Testar importação agora**

**Passo 1: Executar importação**
```bash
curl -X POST http://localhost:3000/api/admin/force-auto-import
```

**Passo 2: Acompanhar logs no terminal Next.js**
```
🔧 [FORCE] Iniciando importação manual forçada...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 [Auto-Import] Iniciando importação automática...
📋 [Auto-Import] 1 filial(is) para importar
🏢 [Auto-Import] Importando para: TCL Transporte Rodoviario Costa Lemes Ltda
📦 Documentos recebidos da SEFAZ: 0
✅ [Auto-Import] TCL Transporte...: 0 NFe(s) importada(s)
✅ [Auto-Import] Importação automática concluída
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [FORCE] Importação manual concluída!
```

**Passo 3: Verificar resultado**
```json
{
  "success": true,
  "message": "Importação automática executada com sucesso!"
}
```

---

## 🔍 **INTERPRETANDO OS LOGS:**

### **Sucesso - Nenhum documento novo:**
```
📦 Documentos recebidos da SEFAZ: 0
✅ [Auto-Import] TCL...: 0 NFe(s) importada(s)
```
**Significa:** Nenhuma NFe nova disponível desde o último NSU

---

### **Sucesso - Documentos importados:**
```
📦 Documentos recebidos da SEFAZ: 5
✅ NFe importada com sucesso!
✅ NFe importada com sucesso!
✅ [Auto-Import] TCL...: 5 NFe(s) importada(s)
```
**Significa:** 5 NFes importadas com sucesso!

---

### **Erro SEFAZ 656:**
```
⚠️  Erro SEFAZ: 656 - Rejeicao: Consumo Indevido
🔧 Atualizando NSU para ultNSU: 000000001129072
⏰ Aguarde 1 hora antes de nova consulta
```
**Significa:** Precisa aguardar 1 hora (política da SEFAZ)

---

### **Erro de autenticação (não deve mais acontecer!):**
```
❌ [Auto-Import] TCL...: Erro na API
```
**Solução:** Já corrigido! Agora chama serviço direto.

---

## 🛠️ **COMANDOS ÚTEIS ADICIONAIS:**

### **Verificar status do Next.js:**
```bash
curl http://localhost:3000/api/health
```

### **Listar NFes importadas recentemente:**
```bash
curl http://localhost:3000/api/inbound-invoices?_start=0&_end=10
```

### **Verificar configurações fiscais:**
```bash
curl http://localhost:3000/api/fiscal/settings
```

---

## 📊 **FREQUÊNCIA RECOMENDADA:**

| Situação | Frequência | Comando |
|----------|-----------|---------|
| **Teste inicial** | 1x agora | `curl -X POST .../force-auto-import` |
| **Debug** | Quando necessário | `curl -X POST .../force-auto-import` |
| **Produção** | Automático (cron 1h) | Não precisa executar manual |

---

## ⚠️ **OBSERVAÇÕES IMPORTANTES:**

1. **Não execute em loop rápido**
   - SEFAZ tem limite de requisições
   - Erro 656 se consultar muito rápido
   - Aguarde pelo menos 5 minutos entre execuções manuais

2. **Logs aparecem no terminal Next.js**
   - Não no terminal onde você executou o curl
   - Verifique o terminal onde o `npm run dev` está rodando

3. **Cron continua rodando**
   - Execução manual NÃO interfere no cron
   - Cron continuará rodando a cada 1 hora

---

## 🎯 **ATALHOS (Alias):**

Adicione ao seu `~/.zshrc` ou `~/.bashrc`:

```bash
# Importação automática NFe
alias import-nfe='curl -X POST http://localhost:3000/api/admin/force-auto-import'
alias import-nfe-log='curl -X POST http://localhost:3000/api/admin/force-auto-import | jq'
```

**Uso:**
```bash
import-nfe
# ou
import-nfe-log
```

---

## 🚀 **RESUMO RÁPIDO:**

**Comando principal:**
```bash
curl -X POST http://localhost:3000/api/admin/force-auto-import
```

**Onde ver logs:** Terminal do Next.js

**Frequência:** Quando quiser testar

**Cuidado:** Não execute em loop (SEFAZ tem limites)

---

**Criado em:** 08/12/2025  
**Arquivo de API:** `src/app/api/admin/force-auto-import/route.ts`
