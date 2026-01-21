# 🔔 Webhooks

## Configuração

Webhooks podem ser configurados via API ou dashboard.

```bash
curl -X POST "https://api.auracore.com.br/v1/webhooks" \
  -H "X-API-Key: ac_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["agent.request.completed", "document.processed"],
    "secret": "your_webhook_secret"
  }'
```

## Eventos Disponíveis

### Agents

| Evento | Descrição |
|--------|-----------|
| `agent.request.started` | Requisição de agente iniciada |
| `agent.request.completed` | Requisição de agente completada |
| `agent.request.failed` | Requisição de agente falhou |
| `agent.tool.called` | Tool foi executada |

### Voice

| Evento | Descrição |
|--------|-----------|
| `voice.transcription.completed` | Transcrição concluída |
| `voice.transcription.failed` | Transcrição falhou |
| `voice.synthesis.completed` | Síntese concluída |
| `voice.synthesis.failed` | Síntese falhou |

### Documents

| Evento | Descrição |
|--------|-----------|
| `document.uploaded` | Documento enviado |
| `document.processing` | Documento em processamento |
| `document.processed` | Documento processado com sucesso |
| `document.failed` | Processamento falhou |
| `document.deleted` | Documento removido |

### RAG

| Evento | Descrição |
|--------|-----------|
| `rag.query.completed` | Query RAG completada |
| `rag.index.updated` | Índice atualizado |

### System

| Evento | Descrição |
|--------|-----------|
| `system.error` | Erro crítico do sistema |
| `system.alert` | Alerta do sistema |
| `system.maintenance` | Manutenção programada |

## Payload

Todos os webhooks seguem o mesmo formato:

```json
{
  "id": "evt_xxxxxxxxxxxx",
  "type": "agent.request.completed",
  "created_at": "2026-01-20T15:30:00Z",
  "data": {
    "agent": "fiscal",
    "message": "...",
    "tokens_input": 150,
    "tokens_output": 80,
    "duration_ms": 1250
  }
}
```

## Headers

| Header | Descrição |
|--------|-----------|
| `X-Webhook-Signature` | Assinatura HMAC-SHA256 |
| `X-Webhook-Timestamp` | Timestamp do envio |
| `X-Webhook-ID` | ID único do evento |

## Verificação de Assinatura

É **altamente recomendado** verificar a assinatura de todos os webhooks recebidos.

### Python

```python
import hmac
import hashlib

def verify_webhook_signature(
    payload: bytes, 
    signature: str, 
    secret: str
) -> bool:
    """Verifica assinatura do webhook."""
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(
        f"sha256={expected}", 
        signature
    )

# Uso
@app.post("/webhook")
async def handle_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-Webhook-Signature")
    
    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = json.loads(payload)
    # Processar evento...
```

### Node.js

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expected}`),
    Buffer.from(signature)
  );
}
```

## Retry Policy

Se o endpoint retornar erro (status >= 400), tentaremos novamente:

| Tentativa | Delay |
|-----------|-------|
| 1 | Imediato |
| 2 | 30 segundos |
| 3 | 2 minutos |
| 4 | 10 minutos |
| 5 | 1 hora |

Após 5 tentativas falhadas, o webhook é marcado como falho e uma notificação é enviada.

## Boas Práticas

1. **Responda rapidamente**: Retorne 200 em até 5 segundos
2. **Processe assincronamente**: Use filas para processamento pesado
3. **Implemente idempotência**: Use o `X-Webhook-ID` para evitar duplicatas
4. **Monitore falhas**: Configure alertas para webhooks falhando
5. **Verifique assinaturas**: Sempre valide a autenticidade

## Testando Webhooks

Use o endpoint de teste para simular eventos:

```bash
curl -X POST "https://api.auracore.com.br/v1/webhooks/test" \
  -H "X-API-Key: ac_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_id": "wh_xxx",
    "event_type": "agent.request.completed"
  }'
```
