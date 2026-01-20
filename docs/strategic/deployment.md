# 🚀 Deployment - Módulo Strategic

Guia de deploy do módulo Strategic em ambientes de produção.

## Requisitos

### Infraestrutura

| Componente | Requisito |
|------------|-----------|
| Node.js | 20.x LTS |
| SQL Server | 2022 |
| RAM | Mínimo 4GB (recomendado 8GB) |
| CPU | 2 cores (recomendado 4 cores) |

### Variáveis de Ambiente

```bash
# Database
DATABASE_URL="sqlserver://user:password@host:1433;database=auracore;encrypt=true"

# Auth
NEXTAUTH_SECRET="sua-chave-secreta-32-chars"
NEXTAUTH_URL="https://seu-dominio.com"

# Integrações (opcional)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
TEAMS_WEBHOOK_URL="https://outlook.office.com/webhook/..."
```

## Deploy com Coolify

O AuraCore utiliza [Coolify](https://coolify.io/) para deploy.

### 1. Configurar Projeto

```yaml
# docker-compose.coolify.yml
version: '3.8'

services:
  auracore:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 2. Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Instalar dependências
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Produção
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### 3. Deploy

```bash
# Via Coolify CLI
coolify deploy --project auracore --branch main
```

## Migrations

### Executar Migrations

```bash
# Gerar migration a partir do schema
npm run db:generate

# Aplicar migrations
npm run db:migrate

# Ou manualmente
npx drizzle-kit migrate
```

### Rollback

```sql
-- Exemplo de rollback manual
-- Sempre testar em ambiente de homologação primeiro!
DROP INDEX IF EXISTS idx_strategic_kpis_tenant;
```

## Cache

### Configuração de Cache

O módulo usa Next.js `unstable_cache` com tags para invalidação:

```typescript
// Revalidação manual via API
POST /api/revalidate?tag=strategic-dashboard
```

### CDN Cache Headers

```typescript
// Retornados automaticamente pelas APIs
{
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  'CDN-Cache-Control': 'public, s-maxage=60',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60'
}
```

## Monitoramento

### Health Check

```bash
GET /api/health

# Response
{
  "status": "healthy",
  "database": "connected",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### Logs

```bash
# Coolify logs
coolify logs auracore --tail 100

# Docker logs
docker logs -f auracore-container
```

### Métricas

O módulo expõe métricas para Prometheus:

```
GET /api/metrics

# Métricas disponíveis
auracore_strategic_kpis_total{perspective="financial"} 10
auracore_strategic_health_score 72
auracore_strategic_action_plans_overdue 3
```

## Performance

### Otimizações Aplicadas

1. **Virtualização de listas** - Listas grandes usam `@tanstack/react-virtual`
2. **Lazy loading** - Widgets carregam sob demanda
3. **Cache Layer** - Dados cacheados por 60-300 segundos
4. **Debounce** - Inputs de busca com debounce de 500ms

### Benchmarks Esperados

| Métrica | Target | Atual |
|---------|--------|-------|
| First Contentful Paint | < 1.5s | ~1.2s |
| Time to Interactive | < 3s | ~2.5s |
| Lighthouse Score | > 90 | ~92 |

## Troubleshooting

### Problema: Dashboard lento

**Causa:** Muitos KPIs sem virtualização.

**Solução:** Verificar se `VirtualizedKpiList` está sendo usado.

---

### Problema: Cache não invalida

**Causa:** Tag de cache incorreta.

**Solução:**

```bash
# Forçar revalidação
curl -X POST "https://seu-dominio.com/api/revalidate?tag=strategic-dashboard"
```

---

### Problema: Erro de multi-tenancy

**Causa:** Query sem filtro de organizationId/branchId.

**Solução:** Verificar se todas queries usam `getTenantContext()`.

---

### Problema: Erro 500 em produção

**Passos:**

1. Verificar logs: `coolify logs auracore`
2. Verificar conexão com banco
3. Verificar variáveis de ambiente
4. Verificar migrations aplicadas

## Segurança

### Checklist de Segurança

- [ ] `NEXTAUTH_SECRET` com 32+ caracteres
- [ ] HTTPS habilitado
- [ ] Headers de segurança configurados
- [ ] Rate limiting nas APIs
- [ ] Logs de auditoria habilitados

### Headers de Segurança

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];
```

## Rollback

### Procedimento de Rollback

1. Identificar versão anterior estável
2. Reverter deploy no Coolify
3. Verificar migrations compatíveis
4. Testar funcionalidades críticas

```bash
# Rollback via Coolify
coolify rollback auracore --to-version v1.0.0

# Ou via Git
git revert HEAD
git push origin main
```
