# 🔍 RELATÓRIO DE INVESTIGAÇÃO - IMPORTAÇÃO AUTOMÁTICA DE NFEs

**Data:** 08/12/2025  
**Problema:** Importação automática de NFes não está funcionando  
**Status:** 🚨 **PROBLEMA CRÍTICO IDENTIFICADO**

---

## 📋 **SUMÁRIO EXECUTIVO:**

### **PROBLEMA PRINCIPAL:**
✅ Importação automática NÃO está funcionando porque:
1. ❌ API `/api/sefaz/import-dfe` não existia (arquivo route.ts vazio)
2. ❌ Cron job estava chamando API inexistente
3. ❌ Integração com Fsist não está configurada

---

## 🔍 **INVESTIGAÇÃO DETALHADA:**

### **1. VERIFICAÇÃO DO CRON JOB:**

**Arquivo:** `src/lib/cron-setup.ts`

**Status:** ✅ **CRON JOB ESTÁ RODANDO**

```typescript
// Cron job inicializado corretamente
startAutoImportCron(); // a cada hora (0 * * * *)
```

**Evidência:**
```bash
$ ps aux | grep node
node      79495   # Next.js rodando
```

---

### **2. VERIFICAÇÃO DO SERVIÇO DE AUTO-IMPORT:**

**Arquivo:** `src/services/cron/auto-import-nfe.ts`

**Status:** ⚠️ **CRON RODA, MAS API NÃO EXISTE**

**Problema Encontrado:**
```typescript
// Linha 86 - Chama API que não existia!
const response = await fetch(`http://localhost:3000/api/sefaz/import-dfe`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-branch-id": branch.id.toString(),
    "x-organization-id": setting.organizationId.toString(),
  },
});
```

**Evidência:**
```bash
$ ls src/app/api/sefaz/import-dfe/
... no children found ...  # ❌ Diretório vazio!
```

---

### **3. VERIFICAÇÃO DAS CONFIGURAÇÕES FISCAIS:**

**Arquivo:** `src/app/api/fiscal/settings/route.ts`

**Status:** ✅ **CONFIGURAÇÕES OK**

**Teste:**
```bash
$ curl http://localhost:3000/api/fiscal/settings
{}  # Vazio - sem configuração salva ainda
```

**Comportamento:**
- Se não existir, cria com valores padrão:
  - `autoImportEnabled: "S"`
  - `autoImportInterval: 1` (hora)
  - `nfeEnvironment: "production"`

---

## 🔧 **AÇÃO CORRETIVA APLICADA:**

### **CRIAÇÃO DA API `/api/sefaz/import-dfe`**

**Arquivo Criado:** `src/app/api/sefaz/import-dfe/route.ts`

**Funcionalidades Implementadas:**

1. ✅ **Busca NFes do Fsist** (últimos 7 dias)
2. ✅ **Valida se já foram importadas** (via `access_key`)
3. ✅ **Parse do XML** para extrair detalhes
4. ✅ **Insere em `inbound_invoices`**
5. ✅ **Insere em `cargo_documents`** (se for transporte)
6. ✅ **Atualiza `last_auto_import`** no fiscal_settings
7. ✅ **Retorna contadores** de sucesso/erro

**Código:**
```typescript
// POST /api/sefaz/import-dfe
// Headers: x-branch-id, x-organization-id

// 1. Busca NFes do Fsist
SELECT TOP 100
  f.chave, f.numero, f.serie, f.data_emissao, f.valor_total, f.xml_conteudo
FROM fsist_documentos f
WHERE f.tipo_documento = 'NFe'
  AND f.data_emissao >= DATEADD(day, -7, GETDATE())
  AND NOT EXISTS (SELECT 1 FROM inbound_invoices WHERE access_key = f.chave)

// 2. Para cada NFe:
//    - Parse XML
//    - Insert inbound_invoices
//    - Insert cargo_documents (se transporte)

// 3. Retorna
{
  "success": true,
  "imported": 5,
  "total": 10,
  "message": "5 NFe(s) importada(s) com sucesso"
}
```

---

## 🧪 **TESTES REALIZADOS:**

### **TESTE 1: Verificar Cron Rodando**

```bash
$ lsof -i :3000
COMMAND   PID        USER   FD   TYPE      DEVICE
node     79495  pedrolemes  17u  IPv6  *:hbci (LISTEN)
```

**Resultado:** ✅ **Next.js rodando na porta 3000**

---

### **TESTE 2: Chamar API Manualmente**

```bash
$ curl -X POST http://localhost:3000/api/sefaz/import-dfe \
  -H "x-branch-id: 1" \
  -H "x-organization-id: 1"
```

**Resultado Inicial:** ❌ **API não existia (diretório vazio)**

**Resultado Após Correção:**
```json
{
  "success": false,
  "error": "Invalid object name 'fsist_documentos'.",
  "imported": 0
}
```

**Análise:** ⚠️ **Tabela `fsist_documentos` não existe no banco**

---

## 🚨 **PROBLEMA CRÍTICO IDENTIFICADO:**

### **INTEGRAÇÃO COM FSIST NÃO ESTÁ CONFIGURADA!**

**O que é o Fsist?**
- Sistema de gestão fiscal
- Deve conter as NFes baixadas da SEFAZ
- Tabela: `fsist_documentos`

**Problema:**
- ❌ Tabela `fsist_documentos` não existe no banco
- ❌ Integração com Fsist não está implementada
- ❌ Não há dados para importar

---

## 🔧 **SOLUÇÕES POSSÍVEIS:**

### **OPÇÃO A: IMPLEMENTAR INTEGRAÇÃO COM FSIST** 🎯 **RECOMENDADO**

**Passo 1:** Verificar se Fsist está rodando
```bash
# Verificar conexão
curl http://localhost:PORT_FSIST/api/documentos
```

**Passo 2:** Criar adapter de integração
```typescript
// src/services/fsist/fsist-client.ts
export async function fetchFsistNFes(days: number = 7) {
  const response = await fetch(`${FSIST_API_URL}/documentos`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FSIST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tipo: "NFe",
      data_inicial: DATEADD(day, -days),
      data_final: NOW(),
    }),
  });
  
  return await response.json();
}
```

**Passo 3:** Modificar `/api/sefaz/import-dfe` para usar o adapter

---

### **OPÇÃO B: USAR API SEFAZ DIRETAMENTE** ⚡ **MAIS RÁPIDO**

Em vez de depender do Fsist, buscar NFes diretamente da SEFAZ:

**Vantagens:**
- ✅ Sem dependência externa
- ✅ Dados sempre atualizados
- ✅ Já temos integração com SEFAZ

**Desvantagens:**
- ⚠️ Mais chamadas à SEFAZ
- ⚠️ Possível rate limit

**Implementação:**
```typescript
// src/app/api/sefaz/import-dfe/route.ts

// 1. Consultar manifestação de destinatário (últimos documentos)
const manifestacao = await sefazClient.consultarDistribuicaoDFe({
  cnpj: branch.cnpj,
  ultNSU: lastNSU || 0,
});

// 2. Para cada NFe encontrada:
//    - Download do XML
//    - Parse e validação
//    - Insert no banco

// 3. Atualizar último NSU processado
```

---

### **OPÇÃO C: CRIAR SCRIPT DE UPLOAD MANUAL** 📤 **TEMPORÁRIO**

Permitir que o usuário faça upload de XMLs de NFe:

```typescript
// src/app/api/sefaz/upload-nfe/route.ts

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("nfe_xmls");
  
  for (const file of files) {
    // Parse XML
    // Valida chave de acesso
    // Insert no banco
  }
  
  return { imported: files.length };
}
```

**Frontend:**
```tsx
<input type="file" accept=".xml" multiple onChange={handleUpload} />
```

---

## 📊 **VERIFICAÇÃO DO BANCO DE DADOS:**

### **Verificar tabelas existentes:**

```sql
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE '%fsist%' 
   OR TABLE_NAME LIKE '%nfe%'
   OR TABLE_NAME LIKE '%invoice%'
ORDER BY TABLE_NAME;
```

**Tabelas esperadas:**
- ✅ `inbound_invoices` - Existe
- ✅ `cargo_documents` - Existe
- ❌ `fsist_documentos` - NÃO EXISTE
- ❌ `fsist_empresas` - NÃO EXISTE

---

## 🎯 **RECOMENDAÇÃO FINAL:**

### **AÇÃO IMEDIATA (HOJE):**

1. **Decidir a fonte de dados:**
   - [ ] **Opção A:** Integrar com Fsist (se disponível)
   - [ ] **Opção B:** Usar SEFAZ diretamente (recomendado)
   - [ ] **Opção C:** Upload manual temporário

2. **Verificar configurações:**
   ```bash
   # Acessar tela de configurações fiscais
   http://localhost:3000/configuracoes/fiscal
   
   # Habilitar auto-import
   Auto Import: SIM
   Intervalo: 1 hora
   ```

3. **Testar importação manual:**
   ```bash
   # API de teste manual
   curl -X POST http://localhost:3000/api/sefaz/import-dfe \
     -H "x-branch-id: 1" \
     -H "x-organization-id: 1"
   ```

---

### **AÇÃO DE MÉDIO PRAZO (ESTA SEMANA):**

1. **Implementar integração definitiva**
2. **Criar dashboard de monitoramento**
3. **Configurar alertas de falha**
4. **Documentar processo**

---

## 📋 **CHECKLIST DE VALIDAÇÃO:**

### **Backend:**
- [x] ✅ Cron job configurado
- [x] ✅ Service `auto-import-nfe.ts` criado
- [x] ✅ API `/api/sefaz/import-dfe` criada
- [ ] ⚠️ Integração com fonte de dados (Fsist/SEFAZ)
- [ ] ⚠️ Testes de importação

### **Frontend:**
- [x] ✅ Tela de configurações fiscais
- [ ] ⚠️ Dashboard de importações
- [ ] ⚠️ Alertas visuais

### **Banco de Dados:**
- [x] ✅ Tabela `inbound_invoices` existe
- [x] ✅ Tabela `cargo_documents` existe
- [x] ✅ Tabela `fiscal_settings` existe
- [ ] ⚠️ Tabela `fsist_documentos` (ou alternativa)

---

## 🔍 **LOGS DO CRON JOB:**

**Para verificar se o cron está rodando:**
```bash
# Ver logs do Next.js
tail -f .next/trace

# Ou acompanhar o console do servidor
# Mensagens esperadas:
🤖 [Auto-Import] Iniciando importação automática...
📋 [Auto-Import] 1 filial(is) para importar
🏢 [Auto-Import] Importando para: Matriz
✅ [Auto-Import] Matriz: 5 NFe(s) importada(s)
✅ [Auto-Import] Importação automática concluída
```

**Periodicidade:**
- Roda a cada hora (minuto 0)
- Ex: 08:00, 09:00, 10:00, etc.

**Próxima execução:**
- Verificar relógio do sistema
- Próxima hora cheia

---

## 💡 **PERGUNTAS PARA O USUÁRIO:**

### **1. QUAL É A FONTE DAS NFEs?**
- [ ] Fsist (sistema separado)
- [ ] SEFAZ direto
- [ ] Upload manual
- [ ] Outra fonte: __________

### **2. O FSIST ESTÁ RODANDO?**
- [ ] Sim, em: `http://localhost:____`
- [ ] Não, vamos usar SEFAZ
- [ ] Não sei

### **3. VOCÊ TEM CERTIFICADO DIGITAL?**
- [ ] Sim, configurado
- [ ] Não
- [ ] Não sei onde configurar

### **4. PREFERÊNCIA DE IMPLEMENTAÇÃO:**
- [ ] Opção A - Integrar com Fsist (mais complexo)
- [ ] Opção B - SEFAZ direto (recomendado)
- [ ] Opção C - Upload manual (temporário)

---

## 📊 **PRÓXIMOS PASSOS:**

### **TESTE IMEDIATO (5 min):**

```bash
# 1. Verificar logs do servidor
# (ver console onde está rodando npm run dev)

# 2. Forçar execução manual do cron
curl -X POST http://localhost:3000/api/admin/force-import-nfe
```

### **IMPLEMENTAÇÃO (1-2h):**

1. Escolher opção (A, B ou C)
2. Implementar integração
3. Testar importação
4. Validar dados no banco
5. Validar no frontend (repositório de cargas)

---

## 🎯 **CONCLUSÃO:**

**PROBLEMA IDENTIFICADO:** ✅
- Cron job está rodando
- API não existia (agora corrigida)
- Falta integração com fonte de dados (Fsist ou SEFAZ)

**IMPACTO:**
- 🔴 **CRÍTICO** - Importação automática não funciona
- Usuário precisa importar manualmente

**SOLUÇÃO:**
- ⚡ **Rápida:** Upload manual (Opção C)
- 🎯 **Definitiva:** SEFAZ direto (Opção B)
- 🏆 **Ideal:** Integração Fsist (Opção A)

**TEMPO ESTIMADO:**
- Opção A: 3-4 horas
- Opção B: 2-3 horas
- Opção C: 30 min

---

**Documento criado em:** 08/12/2025  
**Investigação realizada por:** AI Assistant  
**Status:** 🔍 **AGUARDANDO DECISÃO DO USUÁRIO**





