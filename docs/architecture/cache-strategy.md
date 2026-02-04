# Cache Strategy - AuraCore

**Última atualização:** 04/02/2026  
**Status:** ✅ Produção validada

---

## 📊 Visão Geral

Sistema de cache distribuído usando **Redis Labs** para otimizar performance de queries complexas e reduzir carga no SQL Server.

### Métricas Validadas (Produção)

| Endpoint | Sem Cache | Com Cache | Redução |
|----------|-----------|-----------|---------|
| Strategic Dashboard | 125ms | 3ms | **-97.6%** ⚡ |
| KPIs List | ~500ms | ~50ms | **-90%** (estimado) |

---

## 🔧 Configuração Redis

### Provider
- **Serviço:** Redis Labs (AWS sa-east-1-2)
- **Host:** `redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com:12302`
- **Biblioteca:** `ioredis` v5.9.2
- **Configuração:** `src/lib/cache.ts`

### Variáveis de Ambiente
```bash
REDIS_ENABLED=true
REDIS_URL=redis://default:PASSWORD@HOST:PORT/0
REDIS_HOST=redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12302
REDIS_PASSWORD=***
REDIS_DB=0
```

### Conexão
- **Pooling:** Singleton connection via `ioredis`
- **Retry:** Automático (backoff exponencial)
- **Timeout:** 5s por comando
- **Health Check:** `/api/admin/cache/stats`

---

## 📦 Caches Implementados

### 1. Strategic Dashboard Data
**Use Case:** `GetDashboardDataQuery`

```typescript
// Chave
strategic:dashboard-data:{organizationId}:{branchId}

// Exemplo
strategic:dashboard-data:1:1

// TTL
300 segundos (5 minutos)

// Invalidação
Manual via API ou automática (expiração)
```

**Dados cacheados:**
- Health Score (calculado)
- Perspectivas BSC (Financial, Customer, Internal, Learning)
- Alertas de KPIs críticos
- Action Plans em risco
- Trend data (últimos 5 dias)
- Aurora Insight (gerado)

**Performance:**
- Cache MISS: ~125ms
- Cache HIT: ~3ms (97.6% faster)
- Hit Rate esperado: 80-95%

---

### 2. KPIs List
**Rota:** `/api/strategic/kpis`

```typescript
// Chave
kpis:org:{organizationId}:branch:{branchId}:filters:{hash}

// Exemplo
kpis:org:1:branch:1:filters:eyJwYWdlIjoxfQ==

// TTL
300 segundos (CacheTTL.SHORT)

// Invalidação
Automática em POST/PUT/DELETE de KPIs
```

**Dados cacheados:**
- Lista paginada de KPIs
- Filtros aplicados (goalId, status, ownerUserId)
- Total de registros

**Headers de resposta:**
```http
X-Cache: HIT | MISS
X-Cache-Key: kpis:org:1:branch:1:filters:...
X-Cache-TTL: 300
```

---

## 🔄 Estratégias de Invalidação

### 1. Time-Based (TTL)
Todos os caches expiram automaticamente após o TTL configurado.

| TTL | Uso |
|-----|-----|
| 60s | Dados altamente voláteis (dashboards em tempo real) |
| 300s | Dados médios (listas, agregações) |
| 3600s | Dados estáveis (configurações, metadados) |

### 2. Event-Based
Invalidação explícita após operações de escrita:

```typescript
// Após criar/atualizar/deletar KPI
await CacheService.invalidatePattern('*', 'kpis:');

// Após atualizar dashboard
await CacheService.del('dashboard-data:1:1', 'strategic:');
```

### 3. Manual
Endpoint administrativo para invalidação forçada:

```bash
# Invalidar cache específico
POST /api/admin/cache/invalidate
{
  "prefix": "strategic:",
  "pattern": "dashboard-data:*"
}

# Limpar tudo (usar com cuidado)
POST /api/admin/cache/flush
```

---

## 📈 Monitoramento

### Métricas Disponíveis
`GET /api/admin/cache/stats`

```json
{
  "status": "healthy",
  "connected": true,
  "uptime": 86400,
  "keys": {
    "strategic": 12,
    "kpis": 45,
    "total": 57
  },
  "memory": {
    "used": "2.3MB",
    "peak": "4.1MB"
  },
  "hitRate": 0.87,
  "hits": 1523,
  "misses": 234
}
```

### Logs
Todos os eventos de cache são logados com prefixo `[Cache]`:

```
[Cache] Redis cache initialized
[Cache] Connected to Redis
[Cache] Cache HIT: strategic:dashboard-data:1:1 (3ms)
[Cache] Cache MISS: kpis:org:1:branch:2:filters:abc (125ms)
[Cache] Invalidated pattern: kpis:*
```

---

## 🎯 Boas Práticas

### DO ✅
- **Sempre incluir organizationId/branchId na chave** (multi-tenancy)
- **Usar prefixos semânticos** (`strategic:`, `kpis:`, `goals:`)
- **Hash filtros complexos** para chaves mais curtas
- **Retornar headers X-Cache** para debug
- **Invalidar em operações de escrita**
- **Monitorar hit rate** (alvo: >70%)

### DON'T ❌
- **Nunca cachear dados sensíveis sem encryption**
- **Evitar TTLs muito longos** (dados ficam stale)
- **Não invalidar padrões muito amplos** (`*`)
- **Não cachear erros** (apenas sucessos)
- **Não depender 100% de cache** (graceful degradation)

---

## 🚀 Próximas Implementações

### High Priority
- [ ] **Cache Warming** automático no startup
- [ ] **Hit rate tracking** persistido (histórico)
- [ ] **Latency monitoring** real (não mock)

### Medium Priority
- [ ] **Cache de permissões** (user roles/branches)
- [ ] **Cache de departamentos** (OrgChart)
- [ ] **Compression** (Redis > 1MB)

### Low Priority
- [ ] **Redis Cluster** (sharding para scale)
- [ ] **Read replicas** (geographic distribution)
- [ ] **Cache preloading** (ML-based prediction)

---

## 🔧 Troubleshooting

### Cache não está funcionando
```bash
# 1. Verificar conexão
docker exec <container> node -e "
const Redis = require('ioredis');
const client = new Redis(process.env.REDIS_URL);
client.ping().then(res => console.log('✅ PONG:', res));
"

# 2. Verificar chaves
docker exec <container> node -e "
const Redis = require('ioredis');
const client = new Redis(process.env.REDIS_URL);
client.keys('strategic:*').then(keys => console.log(keys));
"

# 3. Ver logs
docker logs <container> 2>&1 | grep -i cache | tail -50
```

### Performance degradada
- Verificar hit rate (`/api/admin/cache/stats`)
- Se <50%: revisar TTLs e padrões de invalidação
- Se >90% mas lento: verificar latência do Redis (network)

### Redis desconectado
Sistema degrada gracefully:
- Cache MISS → query normal no banco
- Sem erros 500 (try/catch em CacheService)
- Logs de warning gerados

---

## 📚 Referências

- **Redis Best Practices:** https://redis.io/docs/manual/patterns/
- **ioredis Docs:** https://github.com/redis/ioredis
- **Multi-Tenant Caching:** https://aws.amazon.com/blogs/database/multi-tenant-caching-strategies/
- **Código:** `src/lib/cache.ts`, `src/services/cache.service.ts`

---

**Validado em produção:** 04/02/2026  
**Equipe:** AuraCore DevOps  
**Status:** ✅ Stable
