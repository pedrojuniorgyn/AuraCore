# Estratégia de Cache - AuraCore

**Versão:** 1.0.0  
**Data:** 03/02/2026  
**Módulo:** Strategic (expansível para outros)

---

## 📋 VISÃO GERAL

AuraCore implementa cache distribuído usando **Redis** para otimizar queries lentas e reduzir carga no SQL Server.

**Arquitetura:**
- **Cache Layer:** Redis (ioredis)
- **Pattern:** Cache-Aside (Lazy Loading)
- **TTL:** 5-60 minutos (configurável por query)
- **Invalidação:** Explícita via CacheInvalidationService

---

## 🎯 QUERIES CACHEADAS (Módulo Strategic)

| Query | TTL | Chave | Invalidação |
|----|----|-----|-----|
| Executive Dashboard | 5 min | `strategic:executive-dashboard:{org}:{branch}:{strategyId}` | UpdateKPI, UpdateGoal |
| Dashboard Data | 5 min | `strategic:dashboard-data:{org}:{branch}` | UpdateKPI, UpdateGoal, UpdateActionPlan |
| KPI Summary | 15 min | `strategic:kpi-summary:{org}:{branch}` | UpdateKPI, CreateKPI, DeleteKPI |
| Department Tree | 1h | `strategic:department-tree:{org}:{branch}` | UpdateDepartment, CreateDepartment |
| Strategies List | 10 min | `strategic:strategy-list:{org}:{branch}:{cursor}` | UpdateStrategy, CreateStrategy |

---

## 🚀 COMO USAR

### 1. Em Queries (Read Operations)

```typescript
import { redisCache } from '@/lib/cache';

export class GetExecutiveDashboardQuery {
  async execute(input, context) {
    // 1. Construir chave única
    const cacheKey = `executive-dashboard:${context.organizationId}:${context.branchId}:${input.strategyId || 'all'}`;
    
    // 2. Verificar cache
    const cached = await redisCache.get<ExecutiveDashboardOutput>(cacheKey, 'strategic:');
    if (cached) {
      return Result.ok(cached);
    }

    // 3. Cache miss: buscar do banco
    const result = await this.fetchFromDatabase(input, context);

    // 4. Cachear resultado
    await redisCache.set(cacheKey, result, { 
      ttl: 300, // 5 minutos
      prefix: 'strategic:' 
    });

    return Result.ok(result);
  }
}
```

### 2. Em Commands (Write Operations)

**SEMPRE invalidar cache após modificar dados:**

```typescript
import { inject } from 'tsyringe';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { CacheInvalidationService } from '../services/CacheInvalidationService';

export class UpdateKPICommand {
  constructor(
    @inject(STRATEGIC_TOKENS.CacheInvalidationService)
    private readonly cacheInvalidation: CacheInvalidationService
  ) {}

  async execute(input, context) {
    // 1. Atualizar KPI
    await this.kpiRepository.save(kpi);

    // 2. Invalidar cache relacionado
    await this.cacheInvalidation.invalidateKPIs(
      context.organizationId,
      context.branchId
    );

    return Result.ok(kpi);
  }
}
```

---

## 🔄 PADRÃO CACHE-ASIDE (Remember)

Helper para simplificar cache:

```typescript
const dashboardData = await redisCache.remember(
  `dashboard-data:${orgId}:${branchId}`,
  async () => {
    // Função executada apenas se cache miss
    return await this.fetchDashboardData();
  },
  { ttl: 300, prefix: 'strategic:' }
);
```

---

## ⚠️ REGRAS CRÍTICAS

### Cache Keys

1. **SEMPRE** incluir `organizationId` e `branchId` na chave (multi-tenancy)
2. **SEMPRE** usar prefixo `strategic:` (namespace)
3. **NUNCA** incluir dados sensíveis na chave
4. **Formato:** `strategic:{entity}:{orgId}:{branchId}:{params}`

### TTL Guidelines

| Tipo de Dado | TTL Recomendado | Motivo |
|---|---|---|
| Dashboards críticos | 5 min | Alta volatilidade |
| Listagens de entidades | 10 min | Balanceamento |
| KPI summary | 15 min | Cálculos pesados |
| Configurações | 30 min | Baixa volatilidade |
| Hierarquias (departments) | 1h | Raramente muda |

### Invalidação

**SEMPRE invalidar em:**
- CreateEntity → `invalidateEntity()`
- UpdateEntity → `invalidateEntity()`
- DeleteEntity → `invalidateEntity()`
- BulkOperations → `invalidateOrganization()`

**NUNCA:**
- Deixar cache stale após mudança
- Invalidar cache em Queries
- Usar TTL como única estratégia

---

## 📊 MONITORAMENTO

### Ver estatísticas do Redis

```typescript
import { redisCache } from '@/lib/cache';

const stats = await redisCache.getStats();
console.log(stats); // { total_commands_processed, used_memory, ... }
```

### Verificar conexão

```typescript
const isConnected = redisCache.isConnected();
// true se Redis disponível, false caso contrário
```

### Flush cache (DEV only)

```typescript
await redisCache.flush(); // CUIDADO: Remove TUDO!
```

---

## 🐛 TROUBLESHOOTING

### Cache não funciona

1. Verificar `REDIS_ENABLED=true` no `.env`
2. Verificar `REDIS_URL` correto
3. Verificar Redis rodando: `redis-cli ping` → `PONG`
4. Verificar logs: `[RedisCache] Connected to Redis`

### Cache stale (dados desatualizados)

1. Verificar se invalidação está sendo chamada
2. Verificar chave de cache correta
3. Forçar invalidação manual: `redisCache.invalidate('pattern*')`

### Performance não melhorou

1. Verificar query plan: `EXPLAIN` no SQL
2. Verificar índices criados: migration `2026-02-03_performance_indexes_strategic.sql`
3. Verificar hit rate do cache (logs)

---

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente

```bash
# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

### Docker Compose (Local)

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

### Produção (Railway/AWS)

- Railway Redis addon: automático
- AWS ElastiCache: configurar `REDIS_URL` com endpoint

---

## 📚 REFERÊNCIAS

- [Redis Best Practices](https://redis.io/docs/management/optimization/)
- [Cache-Aside Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- `src/lib/cache/RedisCache.ts` - Implementação
- `src/modules/strategic/application/services/CacheInvalidationService.ts` - Invalidação
