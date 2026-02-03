# Redis Setup - Comandos Rápidos (45min)

## ⚡ Copy/Paste - Execução Sequencial

### 1️⃣ Instalar Dependências (2min)
```bash
cd /Users/pedrolemes/aura_core
npm install ioredis @types/ioredis
```

### 2️⃣ Criar Arquivo de Configuração Redis (3min)
```bash
cat > src/lib/redis.ts << 'EOF'
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

export default redis;
EOF
```

### 3️⃣ Adicionar Variáveis de Ambiente (.env.local) (2min)
```bash
cat >> .env.local << 'EOF'

# Redis Configuration (GCP southamerica-east1)
REDIS_HOST=redis-12302.crce181.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12302
REDIS_PASSWORD=i2VxZjhnZWMqyjA5Yli5Rg6rMY8jsHFu
REDIS_DB=0
REDIS_ENABLED=true
EOF
```

### 4️⃣ Criar Serviço de Cache (5min)
```bash
cat > src/services/cache.service.ts << 'EOF'
import redis from '@/lib/redis';

export class CacheService {
  private static TTL = {
    SHORT: 60 * 5,        // 5 minutos
    MEDIUM: 60 * 30,      // 30 minutos
    LONG: 60 * 60 * 24,   // 24 horas
  };

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl: number = this.TTL.MEDIUM): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  static async flush(): Promise<void> {
    try {
      await redis.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }
}
EOF
```

### 5️⃣ Criar Hook de Cache para Departments (8min)
```bash
cat > src/hooks/useDepartmentsCache.ts << 'EOF'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface Department {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  level: number;
}

export const useDepartmentsCache = () => {
  const queryClient = useQueryClient();

  const { data: departments, isLoading, error } = useQuery({
    queryKey: ['departments', 'tree'],
    queryFn: async () => {
      const response = await api.get<Department[]>('/api/admin/departments/tree');
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
    cacheTime: 1000 * 60 * 60, // 1 hora
  });

  const invalidateCache = () => {
    queryClient.invalidateQueries(['departments']);
  };

  return {
    departments: departments || [],
    isLoading,
    error,
    invalidateCache,
  };
};
EOF
```

### 6️⃣ Atualizar API de Departments com Cache (10min)
```bash
cat > src/app/api/admin/departments/tree/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '@/services/cache.service';

const prisma = new PrismaClient();
const CACHE_KEY = 'departments:tree';

export async function GET(request: NextRequest) {
  try {
    // Tentar buscar do cache
    const cached = await CacheService.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    // Se não houver cache, buscar do banco
    const departments = await prisma.department.findMany({
      orderBy: [{ path: 'asc' }],
      select: {
        id: true,
        name: true,
        parentId: true,
        path: true,
        level: true,
      },
    });

    // Salvar no cache (30 minutos)
    await CacheService.set(CACHE_KEY, departments, 60 * 30);

    return NextResponse.json(departments, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}
EOF
```

### 7️⃣ Atualizar POST/PUT/DELETE para Invalidar Cache (5min)
```bash
# Adicionar ao final de cada mutation (POST/PUT/DELETE):
cat >> src/app/api/admin/departments/route.ts << 'EOF'

import { CacheService } from '@/services/cache.service';

// No final de POST/PUT/DELETE, adicionar:
await CacheService.invalidatePattern('departments:*');
EOF
```

### 8️⃣ Criar Script de Teste Redis (3min)
```bash
cat > scripts/test-redis.ts << 'EOF'
import redis from '../src/lib/redis';

async function testRedis() {
  try {
    await redis.connect();
    
    console.log('🔍 Testing Redis connection...');
    
    // Test SET
    await redis.set('test:key', 'Hello Redis!');
    console.log('✅ SET operation successful');
    
    // Test GET
    const value = await redis.get('test:key');
    console.log('✅ GET operation successful:', value);
    
    // Test DELETE
    await redis.del('test:key');
    console.log('✅ DELETE operation successful');
    
    // Test connection info
    const info = await redis.info('server');
    console.log('📊 Redis Server Info:', info.split('\n')[1]);
    
    await redis.quit();
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
EOF

# Adicionar script ao package.json:
npm pkg set scripts.test:redis="tsx scripts/test-redis.ts"
```

### 9️⃣ Executar Teste (2min)
```bash
npm run test:redis
```

### 🔟 Commit (2min)
```bash
git add .
git commit -m "feat: Redis cache implementation

- Install ioredis + types
- Create Redis client with retry strategy
- Add CacheService with get/set/delete/invalidate
- Implement departments cache with 30min TTL
- Add cache invalidation on mutations
- Add test script for Redis connection
- Configure GCP southamerica-east1 Redis

Refs: REDIS_SETUP"

git push origin main
```

---

## 🔍 Validação Pós-Deploy (3min)

```bash
# 1. Verificar se Redis está conectado nos logs
curl https://tcl.auracore.cloud/api/health | grep -i redis

# 2. Testar cache MISS (primeira requisição)
curl -I https://tcl.auracore.cloud/api/admin/departments/tree | grep X-Cache
# Esperado: X-Cache: MISS

# 3. Testar cache HIT (segunda requisição)
curl -I https://tcl.auracore.cloud/api/admin/departments/tree | grep X-Cache
# Esperado: X-Cache: HIT
```

---

## 📋 Checklist Final

- [ ] `npm install ioredis @types/ioredis` executado
- [ ] `src/lib/redis.ts` criado
- [ ] `src/services/cache.service.ts` criado
- [ ] `.env.local` com credenciais Redis GCP
- [ ] `src/hooks/useDepartmentsCache.ts` criado
- [ ] API `/api/admin/departments/tree` com cache
- [ ] Invalidação de cache em mutations
- [ ] `npm run test:redis` passou
- [ ] Commit + push realizado
- [ ] Deploy automático concluído (3-5min)
- [ ] Validação `X-Cache: HIT/MISS` funcionando

---

## ⏱️ Tempo Total Estimado: **42 minutos**

## 🚨 Troubleshooting Rápido

**Erro de conexão Redis:**
```bash
# Verificar credenciais
cat .env.local | grep REDIS

# Testar conexão manual
redis-cli -h your-host -p 6379 -a your-password ping
```

**Cache não invalidando:**
```bash
# Flush manual
redis-cli -h your-host -p 6379 -a your-password FLUSHDB
```

**Não Realizar Push sem ser Autorizado**
