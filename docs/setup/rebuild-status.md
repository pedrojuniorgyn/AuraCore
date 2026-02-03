# 🚀 REBUILD EM ANDAMENTO

**Commit:** `70b8822b` - Force rebuild to clear Docker cache  
**Push:** ✅ Realizado  
**Status:** Deploy automático iniciado  

---

## ⏱️ AGUARDAR 3-5 MINUTOS

O Coolify está fazendo rebuild completo SEM CACHE:

```
1. ⏳ Detectando novo commit (30s)
2. 🏗️ Build do Next.js (2-3min)
3. 📦 Criando novo container (30s)
4. 🚀 Iniciando aplicação (30s)
```

**Total:** ~3-5 minutos

---

## 🔍 MONITORAR DEPLOY

### **Opção 1: Painel Coolify (Visual)**

```
https://coolify.auracore.cloud
→ AuraCore
→ Deployments
→ Ver log em tempo real
```

### **Opção 2: Via SSH (Terminal)**

```bash
ssh root@srv1195982 << 'EOF'
# Ver containers ativos
docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"

# Ver logs do novo container (quando aparecer)
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
docker logs $WEB --tail=20 -f
# Ctrl+C para sair
EOF
```

### **Opção 3: Polling Simples**

```bash
# Executar a cada 30 segundos até ver novo container
watch -n 30 'ssh root@srv1195982 "docker ps --filter name=web-zksk8s0kk08sksgwggkos0gw --format \"{{.Names}} - {{.CreatedAt}}\""'
```

---

## ✅ VALIDAÇÃO (APÓS 3-5 MIN)

### **1. Verificar novo container criado:**

```bash
ssh root@srv1195982 << 'EOF'
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
IMAGE=$(docker ps --filter "name=$WEB" --format "{{.Image}}")
COMMIT=$(echo $IMAGE | grep -oE '[a-f0-9]{40}' | head -c 8)
CREATED=$(docker ps --filter "name=$WEB" --format "{{.CreatedAt}}")
echo "Container: $WEB"
echo "Commit: $COMMIT"
echo "Criado: $CREATED"
EOF
```

**Esperado:**
- Commit: `70b8822b` ✅
- Criado: Data/hora recente (últimos 5 minutos) ✅

### **2. Verificar schema deployado:**

```bash
ssh root@srv1195982 << 'EOF'
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
echo "Schema deployado:"
docker exec $WEB grep 'userId.*nvarchar' /app/src/lib/db/schema.ts | head -3
EOF
```

**Esperado:**
```
userId: nvarchar("userId", { length: 255 })  ✅ CORRETO!
```

**Se ainda mostrar `user_id`:** ❌ Cache não foi limpo, executar Opção 4 abaixo.

### **3. Testar API:**

```bash
curl -s https://tcl.auracore.cloud/api/admin/users | jq .
```

**Esperado:**
```json
[
  {
    "id": "...",
    "name": "Pedro Lemes",
    "email": "pedro.lemes@tcltransporte.com.br",
    ...
  }
]
```

**Se retornar 500:** ❌ Problema persiste, executar Opção 4 abaixo.

### **4. Testar UI:**

```
https://tcl.auracore.cloud/configuracoes/usuarios
```

**Esperado:**
- ✅ Página carrega
- ✅ Lista de usuários aparece
- ✅ Sem erro 500

---

## 🔥 OPÇÃO 4: SE AINDA FALHAR (REBUILD FORÇADO MANUAL)

Se após 5 minutos o erro persistir:

### **Via Painel Coolify:**
1. Acessar: https://coolify.auracore.cloud
2. AuraCore → Settings
3. Procurar opção "Clear Build Cache" ou similar
4. Clicar "Redeploy" com flag "No Cache"

### **Via CLI (último recurso):**
```bash
ssh root@srv1195982 << 'EOF'
# Parar container atual
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
docker stop $WEB

# Limpar TODAS as imagens antigas
docker images | grep "zksk8s0kk08sksgwggkos0gw_web" | awk '{print $3}' | xargs -r docker rmi -f

# Limpar build cache
docker builder prune -af

# Forçar novo deploy via webhook Coolify (se tiver)
# Ou fazer pelo painel: Deploy → Redeploy
EOF
```

Depois de limpar, fazer outro commit dummy:
```bash
cd ~/aura_core
echo "# Force rebuild 2 - $(date)" >> .rebuild-trigger
git add .rebuild-trigger
git commit -m "chore: force rebuild #2"
git push origin main
```

---

## 📊 HISTÓRICO DO BUG

| Commit | Schema | Status |
|--------|--------|--------|
| 17fe732b | `user_id` | ❌ Introduziu bug |
| cc4e1f0e | `userId` | ✅ Corrigiu |
| 7f65ac15 | `userId` (local) / `user_id` (prod) | ❌ Build cache |
| **70b8822b** | `userId` | ✅ **DEVE CORRIGIR** |

---

## 🎯 CHECKLIST COMPLETO

- [ ] Aguardou 3-5 minutos
- [ ] Verificou novo container criado (commit 70b8822b)
- [ ] Verificou schema deployado (`userId` correto)
- [ ] Testou API (`curl /api/admin/users` retorna 200)
- [ ] Testou UI (lista de usuários carrega)

**Se TUDO passar:** ✅ BUG RESOLVIDO!  
**Se FALHAR:** Executar Opção 4 acima

---

## 📞 APÓS VALIDAR

Me envie o resultado de:

```bash
# 1. Container e commit
ssh root@srv1195982 << 'EOF'
WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
IMAGE=$(docker ps --filter "name=$WEB" --format "{{.Image}}")
COMMIT=$(echo $IMAGE | grep -oE '[a-f0-9]{40}' | head -c 8)
echo "Commit em prod: $COMMIT"
docker exec $WEB grep 'userId.*nvarchar' /app/src/lib/db/schema.ts | head -1
EOF

# 2. API test
curl -s https://tcl.auracore.cloud/api/admin/users | jq '. | length'
# Deve retornar número de usuários (ex: 5)
```

---

**Gerado por:** AgenteAura ⚡  
**Data:** 2026-02-03  
**Commit de correção:** 70b8822b  
**Status:** ⏳ Aguardando deploy (3-5 min)
