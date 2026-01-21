# ADR-001: Uso do FastAPI como Framework Web

## Status

**Aceito** (2025-11-01)

## Contexto

Precisamos escolher um framework web Python para a API dos agentes IA.

### Requisitos

- Alta performance para operações I/O bound
- Suporte nativo a async/await
- Validação automática de dados
- Documentação OpenAPI automática
- Integração fácil com bibliotecas async

### Opções Consideradas

1. **Flask**: Framework tradicional, grande ecossistema
2. **Django**: Framework full-stack, muito maduro
3. **FastAPI**: Framework moderno, foco em performance

## Decisão

Escolhemos **FastAPI** como framework web principal.

## Justificativa

### Performance

FastAPI é um dos frameworks Python mais rápidos, comparável a Node.js e Go:

- Baseado em Starlette para alto throughput
- Uvicorn como server ASGI de alta performance
- Benchmarks mostram ~15,000 req/s para endpoints simples

### Async Nativo

Suporte completo a `async/await`, essencial para:

- Chamadas ao LLM (Claude API)
- Operações de cache (Redis)
- Processamento de voz (Google Cloud)
- Queries ao banco de dados

### Type Hints e Validação

Integração com Pydantic para:

- Validação automática de input
- Serialização de output
- Type hints para IDE
- Schemas reutilizáveis

```python
from pydantic import BaseModel

class ChatRequest(BaseModel):
    agent: str
    message: str
    context: dict | None = None

@app.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    ...
```

### OpenAPI Automático

Documentação gerada automaticamente:

- Swagger UI em `/docs`
- ReDoc em `/redoc`
- Schema JSON em `/openapi.json`

### Moderno e Pythonic

- Sintaxe limpa e legível
- Dependency injection built-in
- Background tasks nativo
- WebSocket support

## Consequências

### Positivas

- ✅ Excelente performance para I/O bound
- ✅ Documentação automática da API
- ✅ Validação de dados robusta
- ✅ Código mais limpo com type hints
- ✅ Comunidade ativa e crescente

### Negativas

- ❌ Curva de aprendizado para async
- ❌ Ecossistema menor que Flask/Django
- ❌ Menos middlewares prontos
- ❌ Debugging de async pode ser complexo

### Mitigações

- Documentação interna sobre async patterns
- Wrappers para sync quando necessário
- Uso de bibliotecas async testadas (httpx, redis-py)

## Referências

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Starlette](https://www.starlette.io/)
- [Pydantic](https://docs.pydantic.dev/)
- [Uvicorn](https://www.uvicorn.org/)
