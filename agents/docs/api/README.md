# 📡 API Reference

## Base URL

```
Production: https://api.auracore.com.br/v1
Staging: https://staging-api.auracore.com.br/v1
Local: http://localhost:8000/v1
```

## Autenticação

Todas as requisições requerem autenticação via API Key ou JWT.

### API Key

```bash
curl -X GET "https://api.auracore.com.br/v1/agents" \
  -H "X-API-Key: ac_live_xxxxxxxxxxxxxxxxxxxx"
```

### JWT (Bearer Token)

```bash
curl -X GET "https://api.auracore.com.br/v1/agents" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Rate Limiting

| Plano | Requests/min | Requests/dia |
|-------|--------------|--------------|
| Free | 10 | 1.000 |
| Pro | 100 | 50.000 |
| Enterprise | 1.000 | Ilimitado |

Headers de resposta:
- `X-RateLimit-Limit`: Limite total
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Unix timestamp do reset

## Endpoints

### Agents

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/agents` | Listar agentes disponíveis |
| POST | `/agents/chat` | Chat com agente |

### Voice

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/voice/transcribe` | Transcrever áudio para texto |
| POST | `/voice/synthesize` | Sintetizar texto para áudio |

### RAG

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/rag/query` | Query de legislação brasileira |
| GET | `/rag/collections` | Listar coleções disponíveis |

### Documents

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/documents/upload` | Upload de documento |
| POST | `/documents/{id}/process` | Processar documento |
| GET | `/documents/{id}` | Obter documento |
| DELETE | `/documents/{id}` | Remover documento |

### Analytics

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/analytics/usage` | Estatísticas de uso |
| GET | `/analytics/cost` | Estimativa de custo |
| GET | `/analytics/top-agents` | Top agentes usados |
| GET | `/analytics/top-tools` | Top tools usadas |

### Audit

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/audit/events` | Buscar eventos de auditoria |
| GET | `/audit/events/{id}` | Detalhes do evento |
| GET | `/audit/integrity` | Verificar integridade |
| GET | `/audit/export` | Exportar logs |

### Feature Flags

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/features` | Listar flags |
| GET | `/features/evaluate` | Avaliar todas as flags |
| GET | `/features/{key}` | Avaliar uma flag |

### Health

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Status completo |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

## Exemplos

### Chat com Agente Fiscal

```bash
curl -X POST "https://api.auracore.com.br/v1/agents/chat" \
  -H "X-API-Key: ac_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "fiscal",
    "message": "Calcule o ICMS para venda de SP para RJ, valor R$ 1.000"
  }'
```

**Resposta:**

```json
{
  "message": "O ICMS para operação interestadual de SP para RJ é de 12%. Para um valor de R$ 1.000,00, o ICMS será R$ 120,00.",
  "agent": "fiscal",
  "tool_calls": [
    {
      "tool": "calculate_icms",
      "input": {"origin": "SP", "destination": "RJ", "value": 1000},
      "output": {"rate": 0.12, "tax": 120}
    }
  ],
  "tokens_input": 150,
  "tokens_output": 80,
  "duration_ms": 1250
}
```

### Transcrição de Áudio

```bash
curl -X POST "https://api.auracore.com.br/v1/voice/transcribe" \
  -H "X-API-Key: ac_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "base64_encoded_audio...",
    "language": "pt-BR"
  }'
```

**Resposta:**

```json
{
  "text": "Olá, preciso calcular o ICMS para uma venda interestadual.",
  "language": "pt-BR",
  "confidence": 0.95,
  "duration_seconds": 3.2
}
```

### Query RAG

```bash
curl -X POST "https://api.auracore.com.br/v1/rag/query" \
  -H "X-API-Key: ac_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Qual a base de cálculo do PIS?",
    "collection": "legislacao_fiscal",
    "top_k": 5
  }'
```

**Resposta:**

```json
{
  "results": [
    {
      "content": "Art. 1º A Contribuição para o PIS/Pasep...",
      "source": "Lei 10.637/2002",
      "relevance": 0.92
    }
  ],
  "query": "Qual a base de cálculo do PIS?",
  "total_results": 5
}
```

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Parâmetros inválidos |
| 401 | Unauthorized - API Key inválida ou ausente |
| 403 | Forbidden - Sem permissão para o recurso |
| 404 | Not Found - Recurso não encontrado |
| 422 | Validation Error - Falha na validação dos dados |
| 429 | Rate Limited - Limite de requisições excedido |
| 500 | Server Error - Erro interno do servidor |

## Formato de Erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "O campo 'agent' é obrigatório",
    "details": {
      "field": "agent",
      "reason": "required"
    }
  }
}
```

## Webhooks

Veja [Webhooks Documentation](webhooks.md) para eventos disponíveis.

## SDKs

- [Python SDK](../sdk/python.md)
- JavaScript SDK (em desenvolvimento)
