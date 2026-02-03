# 🚀 Configurar Redis no Coolify (Produção)

## 📋 Passo a Passo

### 1. Acessar Painel Coolify
```
https://coolify.auracore.cloud
```

### 2. Navegar para o Projeto
```
Applications → AuraCore (seu projeto)
```

### 3. Ir para Environment Variables
```
Configuration → Environment
ou
Settings → Environment Variables
```

### 4. Adicionar Variáveis Redis

Clique em **"Add Variable"** ou **"Edit"** e adicione:

```bash
REDIS_HOST=redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12302
REDIS_PASSWORD=sua-senha-real-do-painel-redis-cloud
REDIS_DB=0
REDIS_ENABLED=true
```

### 5. Salvar e Rebuild

Após adicionar as variáveis:

**Opção A: Rebuild Manual**
```
Actions → Rebuild
ou
Deploy → Redeploy
```

**Opção B: Git Push (Deploy Automático)**
```bash
cd /Users/pedrolemes/aura_core
git add .
git commit -m "chore: update Redis environment variables"
git push origin main
```

O Coolify vai detectar o push e fazer deploy automático.

---

## 🔍 Verificar se Funcionou

### Via Logs do Container

```bash
# SSH no servidor
ssh root@coolify.auracore.cloud

# Ver logs do container web
docker logs web-zksk8s0kk08sksgwggkos0gw-* --tail 100 | grep -i redis

# Deve aparecer:
# ✅ Redis connected: redis-12302.crce181...
# ✅ Redis ready to accept commands
```

### Via API em Produção

```bash
# Testar endpoint com cache
curl -I https://tcl.auracore.cloud/api/admin/departments/tree | grep X-Cache

# Primeira vez: X-Cache: MISS
# Segunda vez: X-Cache: HIT
```

---

## ⚠️ Importante: Segurança

**NÃO commitar o arquivo `.env` com a senha!**

```bash
# Verificar se .env está no .gitignore
grep "\.env$" .gitignore

# Se não estiver, adicionar:
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

**Variáveis sensíveis devem estar APENAS:**
- ✅ No Coolify (Environment Variables)
- ✅ No seu `.env` local (não commitado)
- ❌ NUNCA no Git!

---

## 🎯 Resumo: Onde Configurar?

| Ambiente | Onde | Quando | Prioridade |
|----------|------|--------|------------|
| **Local** | `/Users/pedrolemes/aura_core/.env` | Desenvolvimento/Testes | 🟡 Opcional |
| **Produção** | Coolify → Environment Variables | App real em produção | 🔴 **OBRIGATÓRIO** |

---

## 📝 Checklist de Configuração

### Local (Desenvolvimento)
- [ ] ✅ Copiar senha do Redis Cloud
- [ ] ✅ Atualizar `.env` com senha
- [ ] ✅ Testar: `npm run test:redis`

### Produção (Coolify)
- [ ] ✅ Acessar painel Coolify
- [ ] ✅ Adicionar variáveis REDIS_* no Environment
- [ ] ✅ Salvar e rebuild/redeploy
- [ ] ✅ Verificar logs: `docker logs web-*` | grep redis
- [ ] ✅ Testar API: `curl -I https://tcl.auracore.cloud/api/admin/departments/tree`

---

## 🚨 Troubleshooting

### "Redis connection error" nos logs de produção

**Causa:** Variáveis não configuradas no Coolify

**Solução:**
1. Verificar se variáveis estão no painel Coolify
2. Fazer rebuild forçado (limpa cache de build)
3. Verificar logs novamente

### "WRONGPASS" em produção mas local funciona

**Causa:** Senha diferente entre local e Coolify

**Solução:**
1. Copiar senha novamente do Redis Cloud
2. Atualizar no Coolify
3. Rebuild

---

## 🔗 Links Úteis

- **Coolify:** https://coolify.auracore.cloud
- **App Produção:** https://tcl.auracore.cloud
- **Redis Cloud:** https://app.redislabs.com
- **Docs Coolify Env Vars:** https://coolify.io/docs/knowledge-base/environment-variables
