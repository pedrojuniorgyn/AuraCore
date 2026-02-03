# 🔍 DIAGNÓSTICO ERRO 500 - userId Schema Mismatch

**Erro:** `"Invalid column name 'userId'"`  
**Status:** Fase 13 corrigiu mas erro persiste em produção

---

## 🚀 EXECUTAR DIAGNÓSTICO NO SERVIDOR

### **Passo 1: Copiar script para o servidor**

```bash
# No seu Mac
scp ~/aura_core/scripts/debug-coolify-schema.sh root@srv1195982:/tmp/

# Ou copiar conteúdo manualmente e criar no servidor
```

### **Passo 2: Executar no servidor Coolify**

```bash
# SSH no servidor
ssh root@srv1195982

# Dar permissão de execução
chmod +x /tmp/debug-coolify-schema.sh

# EXECUTAR DIAGNÓSTICO COMPLETO
/tmp/debug-coolify-schema.sh
```

---

## 📊 O QUE O SCRIPT VAI VERIFICAR

1. ✅ **Containers ativos** (web e sql)
2. ✅ **Commit deployado** (qual versão está rodando)
3. ✅ **Schema Drizzle deployado** (o que está no container)
4. ✅ **Estrutura REAL do banco** (SQL Server)
5. ✅ **Nome exato da coluna** (userId vs user_id)
6. ✅ **Logs de erro recentes**
7. ✅ **Diagnóstico final** (MATCH ou MISMATCH)

---

## 🎯 RESULTADOS POSSÍVEIS

### **Cenário 1: MISMATCH (Mais Provável)**

```
❌ MISMATCH! Schema usa user_id mas banco tem userId
```

**Causa:** Correção da Fase 13 foi na direção errada  
**Solução:** Reverter schema para `userId` (camelCase)

**Comando de correção:**
```bash
# Voltar para seu Mac
cd ~/aura_core

# Editar schema.ts (reverter para camelCase)
# Ver seção "CORREÇÃO" abaixo

git add src/lib/db/schema.ts
git commit -m "fix(critical): reverter schema para userId (camelCase) - banco usa camelCase"
git push origin main

# Aguardar deploy automático (2-3 min)
```

### **Cenário 2: MATCH mas erro persiste**

```
✅ MATCH! Schema e banco estão alinhados.
```

**Possíveis causas:**
- Cache do container Next.js
- Build antiga ainda ativa
- Erro em outra tabela (sessions, verificationTokens)

**Solução:** Restart do container
```bash
# No servidor Coolify
docker restart web-zksk8s0kk08sksgwggkos0gw-[timestamp]

# Ou via painel Coolify:
# coolify.auracore.cloud → AuraCore → Restart
```

### **Cenário 3: Coluna não existe**

```
❌ Nenhuma coluna encontrada!
```

**Causa:** Tabela `accounts` não existe ou foi dropada  
**Solução:** Re-criar tabela (migration ou seed)

---

## 🔧 CORREÇÃO (SE MISMATCH)

### **Se banco usa `userId` (camelCase):**

**Arquivo:** `src/lib/db/schema.ts`

```typescript
// ANTES (ERRADO):
export const accounts = mssqlTable("accounts", {
  userId: nvarchar("user_id", { length: 255 })  // ❌ ERRADO
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // ...
});

// DEPOIS (CORRETO):
export const accounts = mssqlTable("accounts", {
  userId: nvarchar("userId", { length: 255 })  // ✅ CORRETO (camelCase)
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // ...
});
```

**Outros campos para verificar:**
```typescript
// sessions table
sessionToken: nvarchar("sessionToken", { length: 255 })  // ✅ camelCase
userId: nvarchar("userId", { length: 255 })  // ✅ camelCase

// verificationTokens table (se existir)
identifier: nvarchar("identifier", { length: 255 })  // ✅ camelCase
token: nvarchar("token", { length: 255 })  // ✅ camelCase
```

### **Se banco usa `user_id` (snake_case):**

**Nesse caso a Fase 13 estava certa!**  
Problema pode ser cache ou outra tabela.

---

## 📋 CHECKLIST DE VALIDAÇÃO

Após executar correção:

```bash
# 1. Verificar commit local
git log -1 --oneline
# Deve mostrar commit de correção

# 2. Push
git push origin main

# 3. Aguardar deploy (verificar no Coolify)
# coolify.auracore.cloud → AuraCore → Deployments

# 4. Re-executar script de diagnóstico no servidor
ssh root@srv1195982
/tmp/debug-coolify-schema.sh

# 5. Testar API
curl https://tcl.auracore.cloud/api/admin/users
# Deve retornar 200 OK com lista de usuários

# 6. Testar UI
# https://tcl.auracore.cloud/configuracoes/usuarios
# Deve carregar lista de usuários
```

---

## 🚨 DIAGNÓSTICO RÁPIDO (ALTERNATIVA)

Se não conseguir executar o script completo, faça manualmente:

```bash
# SSH no servidor
ssh root@srv1195982

# 1. Ver container web ativo
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
echo $WEB

# 2. Ver commit deployado
docker ps --filter "name=$WEB" --format "{{.Image}}"

# 3. Ver schema deployado
docker exec $WEB cat /app/src/lib/db/schema.ts | grep -A5 "export const accounts"

# 4. Conectar no SQL e verificar colunas
SQL=$(docker ps --filter "name=sql-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)

docker exec $SQL /opt/mssql-tools/bin/sqlcmd \
  -S localhost \
  -U sa \
  -P "pepked-qogbYt-vyfpa4" \
  -d AuraCore \
  -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'accounts'" \
  -h -1

# 5. Ver logs de erro
docker logs $WEB --tail=20 | grep -i userId
```

---

## 🎯 HISTÓRICO DE CORREÇÕES

### **Fase 13 (03/02/2026):**
- **Commit:** cc4e1f0e
- **Mudança:** `userId` → `user_id` (schema.ts)
- **Problema:** Pode ter sido direção errada!

### **Provável causa raiz:**
O banco de dados foi criado com **camelCase** (userId, sessionToken, etc).  
A Fase 13 tentou corrigir para **snake_case** mas deveria manter camelCase.

**Solução final:** Reverter para camelCase no schema.ts

---

## 📞 PRÓXIMOS PASSOS

1. ✅ **Executar script de diagnóstico** no servidor
2. 📊 **Analisar output** (MATCH ou MISMATCH)
3. 🔧 **Aplicar correção** conforme resultado
4. ✅ **Validar** com curl e UI

**Após diagnóstico, me envie o output completo do script!**

---

**Criado por:** AgenteAura ⚡  
**Data:** 2026-02-03  
**Script:** `scripts/debug-coolify-schema.sh`
