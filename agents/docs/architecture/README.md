# 🏗️ Architecture Documentation

## Overview

O AuraCore Agents é um sistema de agentes IA especializados para ERP logístico brasileiro, 
construído com arquitetura modular e escalável.

## Princípios de Design

1. **Separação de Responsabilidades**: Cada agente é especialista em um domínio
2. **Extensibilidade**: Novos agentes e tools podem ser adicionados facilmente
3. **Observabilidade**: Logging, métricas e tracing em todos os componentes
4. **Segurança**: Autenticação, autorização e auditoria em todas as camadas
5. **Resiliência**: Circuit breakers, retries e graceful degradation

## Componentes Principais

### API Gateway (FastAPI)

Ponto de entrada único para todas as requisições:

- **Autenticação**: API Key e JWT
- **Autorização**: RBAC com permissions granulares
- **Rate Limiting**: Controle de requisições por plano
- **Validação**: Schemas Pydantic para input/output
- **Roteamento**: Direcionamento para serviços internos

### Agents

8 agentes especializados, cada um com conhecimento específico:

| Agente | Domínio | Tools |
|--------|---------|-------|
| Fiscal | ICMS, PIS, COFINS, SPED | calculate_icms, validate_nfe, ... |
| Financial | Títulos, Pagamentos, DDA | create_title, process_payment, ... |
| Accounting | Contabilização, Balancetes | post_entry, generate_balance, ... |
| TMS | Transporte, Frete, CTe | calculate_freight, track_shipment, ... |
| WMS | Armazém, Estoque | check_stock, reserve_inventory, ... |
| CRM | Clientes, Vendas | create_opportunity, send_proposal, ... |
| Fleet | Frota, Manutenção | schedule_maintenance, check_vehicle, ... |
| Strategic | BSC, PDCA, KPIs | update_kpi, create_action_plan, ... |

### Voice Service

Processamento de voz para interação natural:

- **STT (Speech-to-Text)**: Google Cloud Speech-to-Text
- **TTS (Text-to-Speech)**: Google Cloud Text-to-Speech
- **Idiomas**: pt-BR, en-US, es-ES

### RAG Service

Retrieval-Augmented Generation para consulta de legislação:

- **Embeddings**: OpenAI/Google para vetorização
- **Vector Store**: ChromaDB para busca semântica
- **Coleções**: Legislação fiscal, trabalhista, tributária

### Background Workers (ARQ)

Processamento assíncrono de tarefas:

- **Webhooks**: Entrega de eventos
- **Analytics**: Agregação de métricas
- **Cleanup**: Limpeza de dados temporários
- **Indexing**: Atualização de índices RAG

## Fluxo de Requisição

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Client  │────▶│   Gateway   │────▶│  Middleware  │────▶│  Router │
└──────────┘     └─────────────┘     └──────────────┘     └────┬────┘
                                                               │
                 ┌─────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐     ┌─────────────┐     ┌──────────┐
        │     Agent      │────▶│    Tools    │────▶│   LLM    │
        └────────────────┘     └─────────────┘     └──────────┘
                 │
                 ▼
        ┌────────────────┐     ┌─────────────┐
        │   Response     │────▶│   Audit     │
        └────────────────┘     └─────────────┘
```

## Infraestrutura

### Desenvolvimento

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Agents  │  │  Redis  │  │ ChromaDB│  │ Worker  │        │
│  │  :8000  │  │  :6379  │  │  :8001  │  │         │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Produção (Kubernetes)

```
┌─────────────────────────────────────────────────────────────┐
│                        Kubernetes                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    Ingress (nginx)                  │     │
│  └───────────────────────┬────────────────────────────┘     │
│                          │                                   │
│  ┌───────────────────────┴────────────────────────────┐     │
│  │                    Service                          │     │
│  └───────────────────────┬────────────────────────────┘     │
│                          │                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Pod 1   │  │  Pod 2   │  │  Pod 3   │ ◀─── HPA        │
│  │ (Agent)  │  │ (Agent)  │  │ (Agent)  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│       │             │             │                         │
│       └─────────────┴─────────────┘                         │
│                     │                                        │
│  ┌──────────────────┴───────────────────┐                  │
│  │              Redis (Cache)            │                  │
│  └───────────────────────────────────────┘                  │
│                                                              │
│  ┌───────────────────────────────────────┐                  │
│  │           Worker Deployment           │                  │
│  └───────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Segurança

### Camadas de Proteção

1. **Network**: TLS em todas as comunicações
2. **Authentication**: API Keys rotacionáveis e JWT
3. **Authorization**: RBAC com 20+ permissions
4. **Audit**: Logs imutáveis de todas as ações
5. **Encryption**: Dados sensíveis criptografados at-rest

### RBAC

| Role | Permissions |
|------|-------------|
| admin | * (all) |
| manager | agents:*, analytics:read, audit:read |
| user | agents:chat, voice:*, rag:query |
| api_client | agents:chat, voice:transcribe |

## Decision Records

| ADR | Título | Status |
|-----|--------|--------|
| [ADR-001](adr/001-fastapi.md) | Uso do FastAPI | Aceito |
| [ADR-002](adr/002-claude-llm.md) | Claude como LLM principal | Aceito |
| [ADR-003](adr/003-redis-cache.md) | Redis para cache e filas | Aceito |
| [ADR-004](adr/004-multi-agent.md) | Arquitetura multi-agentes | Aceito |

## Métricas e Observabilidade

### Prometheus Metrics

- `auracore_requests_total`: Total de requisições
- `auracore_request_duration_seconds`: Latência
- `auracore_agent_calls_total`: Chamadas por agente
- `auracore_tokens_total`: Tokens LLM consumidos
- `auracore_cache_hits_total`: Cache hits
- `auracore_errors_total`: Erros por tipo

### Logs Estruturados

```json
{
  "timestamp": "2026-01-20T15:30:00Z",
  "level": "INFO",
  "message": "Agent request completed",
  "agent": "fiscal",
  "duration_ms": 1250,
  "tokens": {"input": 150, "output": 80},
  "user_id": "usr_xxx",
  "request_id": "req_xxx"
}
```

## Performance

### Benchmarks

| Operação | P50 | P95 | P99 |
|----------|-----|-----|-----|
| Agent Chat | 800ms | 1500ms | 2500ms |
| Voice Transcribe | 500ms | 1000ms | 1500ms |
| RAG Query | 200ms | 400ms | 600ms |

### Otimizações

1. **Cache**: Redis para respostas frequentes
2. **Connection Pooling**: Reutilização de conexões
3. **Async I/O**: Operações não-bloqueantes
4. **Batching**: Agrupamento de operações
