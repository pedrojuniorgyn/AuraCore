# ⚡ DIAGNÓSTICO RÁPIDO - Erro 500 userId

**Copie e cole estes comandos no seu terminal (Mac):**

---

## 🎯 OPÇÃO 1: Comando Único (Recomendado)

```bash
ssh root@srv1195982 << 'EOF'
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
IMAGE=$(docker ps --filter "name=$WEB" --format "{{.Image}}")
COMMIT=$(echo $IMAGE | grep -oE '[a-f0-9]{40}' | head -c 8)
echo "🔖 Commit em produção: $COMMIT"
echo ""
echo "📄 Schema deployado:"
docker exec $WEB grep -A3 'userId.*nvarchar' /app/src/lib/db/schema.ts | head -5
echo ""
echo "🗄️ Coluna no banco:"
SQL=$(docker ps --filter "name=sql-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
docker exec $SQL /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "pepked-qogbYt-vyfpa4" -d AuraCore -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'accounts' AND COLUMN_NAME LIKE '%user%'" -h -1 -W | grep -v '^$'
EOF
```

**Output esperado:**
```
🔖 Commit em produção: 8f53f457  (ou 7f65ac15)
📄 Schema deployado:
    userId: nvarchar("userId", { length: 255 })
🗄️ Coluna no banco:
userId
```

### **✅ Se mostrar isso:** Tudo correto! Problema pode ser cache.

### **❌ Se mostrar `user_id` no banco ou schema:** MISMATCH confirmado.

---

## 🎯 OPÇÃO 2: Passo a Passo (Se Opção 1 falhar)

### **1. Ver commit em produção:**

```bash
ssh root@srv1195982 "docker ps --filter 'name=web-zksk8s0kk08sksgwggkos0gw' --format '{{.Image}}' | head -1"
```

**Procure o hash de 8 caracteres.** Exemplo: `8f53f457`

### **2. Ver schema deployado:**

```bash
ssh root@srv1195982 << 'EOF'
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
docker exec $WEB grep 'userId.*nvarchar' /app/src/lib/db/schema.ts | head -5
EOF
```

**Deve mostrar:** `userId: nvarchar("userId"` ✅  
**Se mostrar:** `userId: nvarchar("user_id"` ❌ BUG

### **3. Ver coluna real no banco:**

```bash
ssh root@srv1195982 << 'EOF'
SQL=$(docker ps --filter "name=sql-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
docker exec $SQL /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "pepked-qogbYt-vyfpa4" -d AuraCore -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'accounts' AND COLUMN_NAME LIKE '%user%'" -h -1 -W
EOF
```

**Deve mostrar:** `userId` ✅  
**Se mostrar:** `user_id` ❌ MISMATCH

---

## 📊 INTERPRETAÇÃO DOS RESULTADOS

### **Cenário A: Commit em prod é ANTIGO (antes de cc4e1f0e)**

**Problema:** Deploy não foi feito ou falhou  
**Solução:**
```bash
# 1. Ver último commit local
cd ~/aura_core
git log -1 --oneline
# Deve ser: 8f53f457 ou 7f65ac15

# 2. Forçar push (se não foi)
git push origin main

# 3. Aguardar 2-3 minutos (deploy automático)

# 4. Re-verificar commit em produção
ssh root@srv1195982 "docker ps --filter 'name=web-zksk8s0kk08sksgwggkos0gw' --format '{{.Image}}'"
```

### **Cenário B: Commit OK mas schema ERRADO no container**

**Problema:** Build cache ou deploy parcial  
**Solução:**
```bash
# Via painel Coolify (recomendado)
1. Acessar: https://coolify.auracore.cloud
2. AuraCore → Deployments
3. Clicar "Redeploy" (força rebuild completo)
4. Aguardar 3-5 minutos
5. Testar: curl https://tcl.auracore.cloud/api/admin/users
```

### **Cenário C: Schema OK mas BANCO usa snake_case**

**Problema:** Banco foi criado com user_id (migration antiga)  
**Solução:** Alterar schema para `user_id` (snake_case)

**Editar:** `src/lib/db/schema.ts`
```typescript
// Mudar de:
userId: nvarchar("userId", { length: 255 })

// Para:
userId: nvarchar("user_id", { length: 255 })
```

**Commit e push:**
```bash
cd ~/aura_core
git add src/lib/db/schema.ts
git commit -m "fix(schema): ajustar para user_id conforme banco real"
git push origin main
```

---

## 🔥 SOLUÇÃO RÁPIDA (RESTART CONTAINER)

Se tudo parecer correto mas erro persiste, tente **restart**:

```bash
ssh root@srv1195982 << 'EOF'
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
echo "♻️  Reiniciando container: $WEB"
docker restart $WEB
echo "✅ Container reiniciado!"
echo "Aguarde 30 segundos e teste: curl https://tcl.auracore.cloud/api/admin/users"
EOF
```

---

## ✅ VALIDAÇÃO FINAL

Após qualquer correção:

```bash
# 1. Testar API
curl https://tcl.auracore.cloud/api/admin/users

# Deve retornar 200 OK com JSON dos usuários
# Se retornar 500: Erro persiste

# 2. Testar UI
# Abrir: https://tcl.auracore.cloud/configuracoes/usuarios
# Deve carregar lista de usuários
```

---

## 📋 RESUMO DOS COMANDOS

### **Diagnóstico completo (1 comando):**
```bash
ssh root@srv1195982 << 'EOF'
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
echo "Commit: $(docker ps --filter "name=$WEB" --format "{{.Image}}" | grep -oE '[a-f0-9]{40}' | head -c 8)"
echo "Schema:" && docker exec $WEB grep 'userId.*nvarchar' /app/src/lib/db/schema.ts | head -2
SQL=$(docker ps --filter "name=sql-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
echo "Banco:" && docker exec $SQL /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "pepked-qogbYt-vyfpa4" -d AuraCore -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'accounts' AND COLUMN_NAME LIKE '%user%'" -h -1 -W | grep -v '^$'
EOF
```

### **Restart container (emergência):**
```bash
ssh root@srv1195982 "docker restart \$(docker ps --filter 'name=web-zksk8s0kk08sksgwggkos0gw' --format '{{.Names}}' | head -1)"
```

### **Forçar redeploy (Coolify):**
```
https://coolify.auracore.cloud → AuraCore → Deployments → Redeploy
```

---

**Execute a OPÇÃO 1 e me envie o output! 🚀**
