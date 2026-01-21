# 🚀 Deployment Guide

## Requisitos

### Hardware Mínimo

| Componente | Desenvolvimento | Produção |
|------------|-----------------|----------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disco | 20 GB | 50+ GB |

### Software

- Docker 24+
- Docker Compose 2.20+
- Kubernetes 1.28+ (para produção)

## Variáveis de Ambiente

### Obrigatórias

```bash
# LLM
ANTHROPIC_API_KEY=sk-ant-xxx       # API Key do Claude

# Database
DATABASE_URL=postgresql://...       # URL do banco de dados

# Cache
REDIS_URL=redis://localhost:6379    # URL do Redis
```

### Opcionais

```bash
# Ambiente
ENVIRONMENT=production              # development|staging|production
LOG_LEVEL=INFO                      # DEBUG|INFO|WARNING|ERROR
LOG_FORMAT=json                     # json|text

# API
API_PORT=8000                       # Porta da API
WORKERS=4                           # Número de workers uvicorn

# Rate Limiting
RATE_LIMIT_REQUESTS=100             # Requests por minuto
RATE_LIMIT_WINDOW=60                # Janela em segundos

# Google Cloud (Voice)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

## Docker Compose

### Desenvolvimento

```bash
# Iniciar com hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Apenas API
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up agents

# Logs
docker-compose logs -f agents

# Rebuild
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Produção

```bash
# Build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Iniciar
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Escalar
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale agents=3

# Verificar status
docker-compose ps
```

## Kubernetes

### Pré-requisitos

```bash
# Criar namespace
kubectl apply -f k8s/namespace.yaml

# Criar ConfigMap
kubectl apply -f k8s/configmap.yaml

# Criar Secrets (usar External Secrets em produção)
# Edite k8s/secret.yaml.template com valores reais
kubectl apply -f k8s/secret.yaml

# Criar ServiceAccount
kubectl apply -f k8s/serviceaccount.yaml
```

### Deploy

```bash
# Aplicar todos os manifests
kubectl apply -f k8s/

# Ou individualmente
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pdb.yaml

# Verificar status
kubectl get pods -n auracore
kubectl get svc -n auracore
kubectl get ingress -n auracore

# Logs
kubectl logs -f -l app=auracore-agents -n auracore --tail=100
```

### Scaling

```bash
# Manual
kubectl scale deployment/auracore-agents --replicas=5 -n auracore

# Verificar HPA (auto-scaling)
kubectl get hpa -n auracore

# Detalhes do HPA
kubectl describe hpa auracore-agents -n auracore
```

### Rollback

```bash
# Ver histórico de deployments
kubectl rollout history deployment/auracore-agents -n auracore

# Rollback para versão anterior
kubectl rollout undo deployment/auracore-agents -n auracore

# Rollback para versão específica
kubectl rollout undo deployment/auracore-agents --to-revision=2 -n auracore

# Verificar status do rollout
kubectl rollout status deployment/auracore-agents -n auracore
```

## Health Checks

### Endpoints

```bash
# Liveness - aplicação está rodando
curl http://localhost:8000/health/live

# Readiness - aplicação está pronta para tráfego
curl http://localhost:8000/health/ready

# Status completo
curl http://localhost:8000/health
```

### Resposta do Health Check

```json
{
  "status": "healthy",
  "timestamp": "2026-01-20T15:30:00Z",
  "version": "2.1.0",
  "uptime_seconds": 3600,
  "checks": {
    "redis": {"status": "healthy", "latency_ms": 2},
    "llm": {"status": "healthy"}
  }
}
```

## Monitoramento

### Prometheus

Métricas disponíveis em `/metrics`:

| Métrica | Descrição |
|---------|-----------|
| `auracore_requests_total` | Total de requisições |
| `auracore_request_duration_seconds` | Duração das requisições |
| `auracore_agent_calls_total` | Chamadas por agente |
| `auracore_tokens_total` | Tokens consumidos |
| `auracore_errors_total` | Total de erros |

### Grafana

Dashboards pré-configurados em `monitoring/grafana/`:

- **AuraCore Overview**: Visão geral do sistema
- **Agents Performance**: Performance por agente
- **Error Analysis**: Análise de erros

## Troubleshooting

### Container não inicia

```bash
# Verificar logs
docker logs auracore-agents

# Verificar recursos
docker stats auracore-agents

# Verificar variáveis de ambiente
docker exec auracore-agents env | grep -E "(API|REDIS|DATABASE)"
```

### Conexão recusada

1. Verificar se o container está rodando: `docker ps`
2. Verificar se a porta está exposta: `docker port auracore-agents`
3. Verificar network: `docker network ls`

### Alta latência

1. Verificar métricas de CPU/memória
2. Verificar conexão com Redis: `redis-cli ping`
3. Verificar rate limiting do Claude API
4. Verificar logs para timeouts

### Erros 5xx

1. Verificar logs de erro: `docker logs auracore-agents | grep ERROR`
2. Verificar health checks: `curl localhost:8000/health`
3. Verificar dependências externas (Redis, Claude API)
4. Verificar espaço em disco

### Pod em CrashLoopBackOff

```bash
# Ver eventos do pod
kubectl describe pod <pod-name> -n auracore

# Ver logs do pod anterior
kubectl logs <pod-name> -n auracore --previous

# Verificar recursos
kubectl top pod -n auracore
```

## Backup e Restore

### Redis

```bash
# Backup
redis-cli BGSAVE
cp /data/dump.rdb /backup/redis-$(date +%Y%m%d).rdb

# Restore
cp /backup/redis-20260120.rdb /data/dump.rdb
redis-cli SHUTDOWN NOSAVE
redis-server
```

### Logs de Auditoria

```bash
# Exportar via API
curl "https://api.auracore.com.br/v1/audit/export?format=json" \
  -H "X-API-Key: $API_KEY" \
  -o audit-logs-$(date +%Y%m%d).json
```
