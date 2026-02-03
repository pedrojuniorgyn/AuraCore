# Redis Setup - AuraCore (FINAL)

## 📊 Status da Implementação

| Item | Status | Arquivo |
|------|--------|---------|
| Client Redis | ✅ Implementado | `src/lib/redis.ts` |
| Retry Strategy | ✅ Exponential backoff (50ms → 2000ms) | `src/lib/redis.ts` |
| Event Listeners | ✅ error, connect, ready, reconnecting, close | `src/lib/redis.ts` |
| Validação de ENV | ✅ Throw error se REDIS_HOST não definido | `src/lib/redis.ts` |
| Username Support | ✅ Redis Cloud (default: 'default') | `src/lib/redis.ts` |
| Script de Teste | ✅ 6 testes completos | `scripts/test-redis.ts` |
| npm script | ✅ `npm run test:redis` | `package.json` |
| Documentação | ✅ Este arquivo | `REDIS_SETUP_FINAL.md` |

---

## 🔧 Configuração Atual

**Arquivo:** `.env`

```bash
REDIS_HOST=redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12302
REDIS_PASSWORD=Si2VxZjhnZWMqyjA5Yli5Rg6rMY8jsHFu
REDIS_DB=0
REDIS_ENABLED=true
```

---

## ⚠️ PROBLEMA DETECTADO: WRONGPASS

**Erro:**
```
❌ Redis connection error: WRONGPASS invalid username-password pair
```

**Causa:**
As credenciais no `.env` estão **incorretas ou desatualizadas**.

**Solução:**
Validar credenciais no console do Redis Cloud.

---

## 🔑 Como Obter Credenciais Corretas (Redis Cloud)

### Passo 1: Acessar Console Redis Cloud

1. Ir para: https://app.redislabs.com/
2. Login com conta do projeto
3. Navegar para: **Databases** → Seu database

### Passo 2: Copiar Credenciais

Na página do database, você verá:

```
Endpoint: redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com:12302
Username: default
Password: [clique em "Show" para revelar]
```

### Passo 3: Atualizar .env

```bash
REDIS_HOST=redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12302
REDIS_PASSWORD=<COLE_A_SENHA_AQUI>
REDIS_USERNAME=default  # Opcional (já é o default)
REDIS_DB=0
```

### Passo 4: Testar Novamente

```bash
npm run test:redis
```

**Saída esperada:**
```
🔍 Starting Redis connection tests...

✅ Test 1: Connection - PASS
✅ Test 2: SET operation - PASS
✅ Test 3: GET operation - PASS
✅ Test 4: TTL check - PASS
✅ Test 5: DELETE operation - PASS
✅ Test 6: Server info - PASS

📊 Test Summary:
   Total tests: 6
   Passed: 6
   Failed: 0
   Total time: 156ms

✅ All tests passed! Redis is ready to use.
```

---

## 🧪 Validação Manual com redis-cli

Se tiver `redis-cli` instalado:

```bash
redis-cli -h redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com \
          -p 12302 \
          -a "SUA_SENHA_AQUI" \
          --user default \
          ping
```

**Esperado:** `PONG`

---

## 📝 Testes Disponíveis

### Teste 1: Conexão Básica (test-redis.ts)

```bash
npm run test:redis
```

**O que testa:**
1. ✅ Connection
2. ✅ SET operation
3. ✅ GET operation
4. ✅ TTL check
5. ✅ DELETE operation
6. ✅ Server info

### Teste 2: Cache Avançado (test-redis-cache.ts)

```bash
npx tsx scripts/test-redis-cache.ts
```

**O que testa:**
1. ✅ Connection
2. ✅ SET/GET
3. ✅ Remember (cache-aside pattern)
4. ✅ Invalidate (pattern matching)
5. ✅ Delete
6. ✅ Stats

---

## 🏗️ Arquitetura do Client Redis

### src/lib/redis.ts (Client Básico)

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: config.host,
  port: config.port,
  username: config.username, // 'default' para Redis Cloud
  password: config.password,
  db: config.db,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Event listeners para monitoring
redis.on('error', (err) => console.error('❌', err.message));
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('ready', () => console.log('✅ Redis ready'));
redis.on('reconnecting', () => console.warn('⚠️ Reconnecting...'));
redis.on('close', () => console.warn('⚠️ Connection closed'));

export default redis;
```

### src/lib/cache/RedisCache.ts (Cache Layer)

Implementação completa com:
- ✅ Singleton pattern
- ✅ TTL configurável
- ✅ Prefix para namespacing
- ✅ Cache-aside pattern (`remember()`)
- ✅ Pattern invalidation (`invalidate('user:*')`)
- ✅ Stats do Redis

---

## 🔄 Retry Strategy

**Configuração:** Exponential backoff

| Tentativa | Delay |
|-----------|-------|
| 1 | 50ms |
| 2 | 100ms |
| 3 | 150ms |
| ... | ... |
| 40+ | 2000ms (max) |

**Max retries por request:** 3

---

## 📊 Environment Variables

| Variável | Obrigatório | Default | Descrição |
|----------|-------------|---------|-----------|
| `REDIS_HOST` | ✅ SIM | - | Hostname do Redis |
| `REDIS_PORT` | ❌ | 6379 | Porta do Redis |
| `REDIS_PASSWORD` | ❌ | - | Senha (recomendado) |
| `REDIS_USERNAME` | ❌ | 'default' | Username (Redis Cloud) |
| `REDIS_DB` | ❌ | 0 | Database number (0-15) |
| `REDIS_ENABLED` | ❌ | - | Flag para habilitar cache |

---

## 🚨 Troubleshooting

### Erro: "REDIS_HOST is not defined"

**Causa:** Variável `REDIS_HOST` não está no `.env`

**Solução:**
```bash
# Adicionar ao .env
REDIS_HOST=redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com
```

### Erro: "WRONGPASS invalid username-password pair"

**Causa:** Senha incorreta ou desatualizada

**Solução:**
1. Acessar console do Redis Cloud
2. Revelar senha atual
3. Atualizar `.env`
4. Testar novamente

### Erro: "Connection refused"

**Causa:** Host ou porta incorretos, ou Redis não está rodando

**Solução:**
1. Verificar se o Redis Cloud está ativo
2. Validar host e porta no console
3. Verificar firewall/security groups

### Erro: "Connection timeout"

**Causa:** Rede bloqueando conexão

**Solução:**
1. Verificar se sua rede permite saída para porta 12302
2. Verificar se o IP está na whitelist (Redis Cloud)
3. Testar de outra rede

---

## ✅ Checklist de Validação

Antes de considerar o setup completo:

- [x] ✅ Client `src/lib/redis.ts` implementado
- [x] ✅ Retry strategy configurada
- [x] ✅ Event listeners adicionados
- [x] ✅ Validação de ENV implementada
- [x] ✅ Username support para Redis Cloud
- [x] ✅ Script `test-redis.ts` criado
- [x] ✅ Script adicionado ao `package.json`
- [ ] ⏳ Credenciais validadas no Redis Cloud
- [ ] ⏳ Teste `npm run test:redis` passando
- [ ] ⏳ TypeScript sem erros
- [ ] ⏳ Documentação atualizada

---

## 🎯 Próximos Passos (Task 02)

Após validar credenciais e testes passarem:

1. **Task 02:** Implementar cache em endpoints críticos
   - `GET /api/departments`
   - `GET /api/users`
   - `GET /api/auth/permissions`
   
2. **Task 03:** Monitoramento e métricas
   - Dashboard de cache hits/misses
   - Alertas de conexão

3. **Task 04:** Estratégia de invalidação
   - Invalidar cache ao atualizar registros
   - TTL por tipo de endpoint

---

## 📚 Referências

- **ioredis:** https://github.com/luin/ioredis
- **Redis Cloud:** https://redis.com/try-free/
- **Redis Commands:** https://redis.io/commands
- **Next.js + Redis:** https://vercel.com/guides/redis

---

**Data:** 03/02/2026  
**Autor:** AuraCore Team  
**Status:** ⏳ **AGUARDANDO VALIDAÇÃO DE CREDENCIAIS**
