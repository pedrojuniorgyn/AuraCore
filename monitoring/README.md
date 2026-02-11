# 📊 AuraCore Monitoring Stack

Stack de monitoramento para o AuraCore com Prometheus, Grafana e Alertmanager.

## Visão Geral

| Componente | Porta | Descrição |
|------------|-------|-----------|
| Prometheus | 9090 | Coleta e armazenamento de métricas |
| Grafana | 3001 | Visualização e dashboards |
| Alertmanager | 9093 | Gerenciamento de alertas |

## Início Rápido

```bash
# Iniciar stack
./start.sh

# Parar stack
./stop.sh
```

## URLs

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / auracore2026 |
| Prometheus | http://localhost:9090 | - |
| Alertmanager | http://localhost:9093 | - |

## Dashboards

### AuraCore - ERP Overview (auracore-erp.json) **[E17.3]**
- HTTP requests/s por rota e método
- Latência P50/P95/P99 por rota
- Taxa de erro (5xx) global e por rota
- Conexões ativas
- Database query latency
- Top rotas por volume e latência

> **Nota:** As métricas ERP são coletadas automaticamente pelo wrapper `withDI`
> que envolve todas as rotas API (~120 rotas). Nenhuma configuração por rota é necessária.

### AuraCore - Agents Overview
- Requests totais e por agente
- Latência P95 por agente
- Taxa de erro
- Distribuição de uso por agente
- Tools mais usadas
- Status dos serviços

### AuraCore - Voice Interface
- Transcrições e sínteses (24h)
- Latência P95 de voz
- Taxa de erro voice
- Operações por tipo e status
- Distribuição por idioma

### AuraCore - RAG & Knowledge Base
- Documentos na Knowledge Base
- Queries RAG (24h)
- Latência RAG P95
- Imports por tipo de documento
- Queries por tipo de filtro
- Chunks indexados

## Métricas Coletadas

### ERP HTTP (coletadas automaticamente via `withDI`) **[E17.3]**
| Métrica | Tipo | Labels | Descrição |
|---------|------|--------|-----------|
| `http_requests_total` | Counter | method, path, status_code | Total de HTTP requests |
| `http_request_duration_seconds` | Histogram | method, path | Latência por rota (P50/P95/P99) |
| `http_request_errors_total` | Counter | method, path, error_type | Erros HTTP (5xx + exceções) |
| `database_query_duration_seconds` | Histogram | — | Latência de queries ao banco |
| `active_connections` | Gauge | — | Conexões HTTP ativas |

> Todas as rotas que usam `withDI` (padrão em ~120 rotas API) emitem estas
> métricas automaticamente. O endpoint `/api/metrics` expõe os dados no formato
> Prometheus text exposition para scrape.

### Agentes
| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `auracore_agent_requests_total` | Counter | Total de requests por agente |
| `auracore_agent_latency_seconds` | Histogram | Latência de resposta |
| `auracore_tool_calls_total` | Counter | Chamadas de tools |
| `auracore_tool_duration_seconds` | Histogram | Duração das tools |
| `auracore_active_sessions` | Gauge | Sessões ativas |

### Voice
| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `auracore_voice_operations_total` | Counter | Operações de voz |
| `auracore_voice_duration_seconds` | Histogram | Duração das operações |

### RAG
| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `auracore_rag_queries_total` | Counter | Queries RAG |
| `auracore_rag_duration_seconds` | Histogram | Latência RAG |
| `auracore_knowledge_base_documents` | Gauge | Docs na KB |

### Documents
| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `auracore_document_imports_total` | Counter | Imports de docs |
| `auracore_document_chunks_total` | Counter | Chunks indexados |

## Alertas Configurados

| Alerta | Condição | Severidade |
|--------|----------|------------|
| HighAgentLatency | P95 > 5s por 2min | warning |
| HighErrorRate | Erro > 10% por 5min | critical |
| ToolHighErrorRate | Tool erro > 20% por 5min | warning |
| SlowVoiceProcessing | Voice P95 > 10s por 2min | warning |
| VoiceTranscriptionErrors | STT erro > 10% por 5min | warning |
| RAGNoResults | > 50% vazio por 10min | warning |
| SlowRAGQueries | RAG P95 > 3s por 5min | warning |
| EmptyKnowledgeBase | < 10 docs por 5min | critical |
| DocumentImportErrors | Import erro > 30% por 10min | warning |
| ServiceDown | up == 0 por 1min | critical |

## Configuração

### Variáveis de Ambiente

```bash
# Copiar o .env.example e preencher os valores
cp .env.example .env

# Variáveis obrigatórias:
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=sua_senha_segura
GRAFANA_ROOT_URL=http://seu-dominio:3001

# SMTP para alertas (Google Workspace):
SMTP_USER=alerts@auracore.cloud     # Email do Google Workspace
SMTP_PASS=xxxx-xxxx-xxxx-xxxx       # App Password (16 chars)
SMTP_FROM=alerts@auracore.cloud     # Remetente dos alertas
ALERT_EMAIL_TO=admin@auracore.cloud # Destinatário dos alertas
```

> **Google Workspace App Password:** Acesse https://myaccount.google.com/apppasswords,
> gere uma senha de app para "Mail" e use-a como `SMTP_PASS`.

### Adicionar Novo Target

Edite `prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'novo-servico'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host:porta']
```

Depois reinicie o Prometheus:

```bash
docker restart auracore_prometheus
```

### Adicionar Novo Dashboard

1. Crie arquivo JSON em `grafana/dashboards/`
2. Aguarde 30 segundos (auto-reload)
3. Ou reinicie Grafana: `docker restart auracore_grafana`

### Adicionar Novo Alerta

1. Edite `prometheus/alerts.yml`
2. Reinicie Prometheus ou use reload:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Estrutura de Diretórios

```
monitoring/
├── docker-compose.yml          # Stack principal
├── .env.example                # Template de variáveis de ambiente
├── start.sh                    # Script de inicialização
├── stop.sh                     # Script de parada
├── README.md                   # Esta documentação
├── prometheus/
│   ├── prometheus.yml          # Configuração Prometheus
│   └── alerts.yml              # Regras de alerta
├── alertmanager/
│   └── alertmanager.yml        # Configuração alertas (SMTP Google Workspace)
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── datasources.yml # Datasource Prometheus
    │   └── dashboards/
    │       └── dashboards.yml  # Config auto-provisioning
    └── dashboards/
        ├── auracore-erp.json   # Dashboard ERP (HTTP metrics via withDI)
        ├── agents-overview.json
        ├── voice-interface.json
        └── rag-knowledge.json
```

## Troubleshooting

### Prometheus não coleta métricas

```bash
# Verificar targets
curl http://localhost:9090/api/v1/targets

# Ver status no UI
# http://localhost:9090/targets
```

### Grafana não mostra dados

1. Verifique se Prometheus está UP: http://localhost:9090
2. Verifique datasource: Grafana > Configuration > Data Sources
3. Teste query no Explore: `up{job="auracore-agents"}`

### Container não inicia

```bash
# Ver logs
docker logs auracore_prometheus
docker logs auracore_grafana
docker logs auracore_alertmanager

# Verificar volumes
docker volume ls | grep auracore
```

### Resetar dados

```bash
# Parar e remover volumes
./stop.sh
docker volume rm monitoring_prometheus_data monitoring_grafana_data monitoring_alertmanager_data

# Reiniciar
./start.sh
```

## Referências

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
