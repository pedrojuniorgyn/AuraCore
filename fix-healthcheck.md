# FIX HEALTHCHECK - Guia de Correção

## 🔍 Problema Identificado

O healthcheck está falhando porque:
1. ⚠️ **APP_URL tem TYPO**: `https://tcl.auracore.clud` (deve ser `.cloud`)
2. ✅ AUTH_SECRET existe (OK)
3. ✅ DATABASE_URL existe (OK)
4. ❓ Tabela `idempotency_keys` pode não existir

---

## 🔧 SOLUÇÃO 1: Corrigir APP_URL (CRÍTICO)

### No Coolify → Environment Variables:

**Encontrar:**
```
APP_URL=https://tcl.auracore.clud
```

**Corrigir para:**
```
APP_URL=https://tcl.auracore.cloud
```

**Ação:**
1. Clicar em "Update" ao lado de APP_URL
2. Alterar valor de `clud` para `cloud`
3. Salvar

---

## 🔧 SOLUÇÃO 2: Verificar Tabela idempotency_keys

### Executar no servidor:

```bash
# Conectar ao container
CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

# Verificar se tabela existe
docker exec $CONTAINER node -e "
const { pool } = require('./src/lib/db/index.ts');
(async () => {
  try {
    const r = await pool.request().query(\`
      SELECT CASE WHEN OBJECT_ID('dbo.idempotency_keys','U') IS NULL THEN 0 ELSE 1 END as exists
    \`);
    console.log('Tabela existe:', r.recordset[0].exists === 1 ? 'SIM' : 'NÃO');
  } catch (e) {
    console.error('Erro:', e.message);
  }
})();
"
```

**Se tabela NÃO existe:**

```bash
# Rodar migrations
docker exec $CONTAINER npm run migrate

# OU executar SQL manualmente
docker exec $CONTAINER node -e "
const { pool } = require('./src/lib/db/index.ts');
(async () => {
  await pool.request().query(\`
    CREATE TABLE dbo.idempotency_keys (
      id INT IDENTITY(1,1) PRIMARY KEY,
      organization_id INT NOT NULL,
      scope VARCHAR(128) NOT NULL,
      key VARCHAR(128) NOT NULL,
      status VARCHAR(32) NOT NULL,
      result_ref VARCHAR(256),
      expires_at DATETIME2,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT UQ_idempotency UNIQUE (organization_id, scope, key)
    )
  \`);
  console.log('Tabela criada!');
})();
"
```

---

## 🔧 SOLUÇÃO 3: Verificar TODAS Variáveis Obrigatórias

O healthcheck verifica estas variáveis:
- ✅ DB_HOST
- ✅ DB_USER
- ✅ DB_PASSWORD
- ✅ DB_NAME
- ✅ AUTH_SECRET
- ⚠️ APP_URL (TEM TYPO!)

**Executar no servidor:**

```bash
CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

echo "=== VARIÁVEIS OBRIGATÓRIAS ==="
docker exec $CONTAINER env | grep -E "^(DB_HOST|DB_USER|DB_PASSWORD|DB_NAME|AUTH_SECRET|APP_URL)=" | sort

echo ""
echo "=== TYPO EM APP_URL? ==="
docker exec $CONTAINER env | grep APP_URL | grep "clud" && echo "⚠️  TYPO DETECTADO: 'clud' deve ser 'cloud'" || echo "✅ Sem typo"
```

---

## 📋 ROTEIRO COMPLETO DE CORREÇÃO

### 1️⃣ No Coolify (2 minutos):

1. Acessar: Environment Variables
2. Procurar: `APP_URL`
3. Clicar: "Update"
4. Alterar: `clud` → `cloud`
5. Salvar
6. **NÃO fazer redeploy ainda**

### 2️⃣ No Servidor via SSH (3 minutos):

```bash
# Verificar se tabela idempotency_keys existe
CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

docker logs $CONTAINER 2>&1 | grep "idempotency" | tail -10

# Se aparecer erro de tabela não existente:
# docker exec $CONTAINER npm run migrate
```

### 3️⃣ Redeploy (5 minutos):

1. No Coolify → "Redeploy"
2. Aguardar build completar

### 4️⃣ Validar (2 minutos):

```bash
CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

# Verificar healthcheck
docker logs $CONTAINER 2>&1 | grep "ops.health" | tail -5

# Deve aparecer:
# {"status":"SUCCEEDED","failedCount":0}
```

---

## ✅ VALIDAÇÃO FINAL

Após correções, executar:

```bash
CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

echo "=== 1. APP_URL CORRIGIDA? ==="
docker exec $CONTAINER env | grep APP_URL
# Deve mostrar: APP_URL=https://tcl.auracore.cloud (sem 'clud')

echo ""
echo "=== 2. HEALTHCHECK OK? ==="
docker logs $CONTAINER 2>&1 | grep "ops.health.finished" | tail -1
# Deve mostrar: "status":"SUCCEEDED"

echo ""
echo "=== 3. APLICAÇÃO FUNCIONANDO? ==="
curl -I https://tcl.auracore.cloud/api/notifications?limit=5
# Deve mostrar: HTTP/2 401
```

---

## 🎯 PRIORIDADE

| Item | Prioridade | Impacto |
|------|------------|---------|
| Corrigir APP_URL (clud→cloud) | 🔴 ALTA | Healthcheck + Redirects |
| Verificar tabela idempotency_keys | 🟡 MÉDIA | Apenas healthcheck |
| Redeploy após correções | 🔴 ALTA | Aplicar mudanças |

---

## 📊 RESULTADO ESPERADO

Após correções:

```json
{
  "status": "SUCCEEDED",
  "failedCount": 0,
  "checks": [
    {"name": "db.connectivity", "ok": true},
    {"name": "idempotency.table", "ok": true},
    {"name": "idempotency.behavior", "ok": true}
  ]
}
```

---

## ⚠️ OBSERVAÇÃO

**O typo em APP_URL pode causar outros problemas além do healthcheck:**
- ❌ Redirects do OAuth podem falhar
- ❌ Callbacks do Google podem ir para URL errada
- ❌ Links gerados pela aplicação podem estar quebrados

**Correção é ALTAMENTE RECOMENDADA!**
