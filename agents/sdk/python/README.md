# AuraCore Python SDK

SDK oficial para integração com a API do AuraCore ERP.

## Instalação

```bash
pip install auracore
```

## Quick Start

```python
from auracore import AuraCore

# Inicializar cliente
client = AuraCore(api_key="ac_live_xxx")

# Chat com agent fiscal
response = client.agents.chat_sync(
    agent="fiscal",
    message="Calcule o ICMS para uma venda de SP para RJ no valor de R$ 1.000,00"
)
print(response.message)

# Transcrição de áudio
result = client.voice.transcribe_sync("audio.wav")
print(result.text)

# Query RAG
result = client.rag.query_sync("legislação ICMS interestadual")
print(result.answer)
```

## Uso Async

```python
import asyncio
from auracore import AuraCore

async def main():
    async with AuraCore(api_key="ac_live_xxx") as client:
        response = await client.agents.chat(
            agent="fiscal",
            message="Qual a alíquota de ICMS para SP?"
        )
        print(response.message)

asyncio.run(main())
```

## CLI

```bash
# Configurar API key
export AURACORE_API_KEY=ac_live_xxx

# Chat
auracore chat send fiscal "Calcule o ICMS"

# Listar agents
auracore chat list

# Transcrição
auracore voice transcribe audio.wav

# Síntese
auracore voice synthesize "Olá, mundo!" -o output.mp3

# RAG
auracore rag query "legislação PIS/COFINS"

# Listar coleções RAG
auracore rag collections

# Upload de documento
auracore docs upload nota.pdf --type nfe

# Versão
auracore version
```

## Agents Disponíveis

| Agent | Descrição |
|-------|-----------|
| `fiscal` | Cálculos fiscais (ICMS, PIS, COFINS, SPED) |
| `financial` | Operações financeiras |
| `accounting` | Contabilidade |
| `tms` | Gestão de transporte |
| `wms` | Gestão de armazém |
| `crm` | Relacionamento com clientes |
| `fleet` | Gestão de frota |
| `strategic` | Gestão estratégica |

## Resources

### Agents

```python
# Chat com agent
response = await client.agents.chat("fiscal", "Qual o ICMS de SP?")
print(response.message)

# Com contexto
response = await client.agents.chat(
    agent="fiscal",
    message="Calcule o imposto",
    context={"valor": 1000, "origem": "SP", "destino": "RJ"}
)

# Listar agents
agents = await client.agents.list_agents()
```

### Voice

```python
# Transcrição
result = await client.voice.transcribe("audio.wav")
print(result.text, result.confidence)

# Síntese
result = await client.voice.synthesize("Olá, mundo!")
with open("output.mp3", "wb") as f:
    import base64
    f.write(base64.b64decode(result.audio_base64))
```

### RAG

```python
# Query
result = await client.rag.query("legislação ICMS")
print(result.answer)
for source in result.sources:
    print(f"- {source['title']}")

# Listar coleções
collections = await client.rag.list_collections()
```

### Documents

```python
# Upload
doc = await client.documents.upload("nota.pdf", "nfe")
print(doc.id)

# Processar (DANFe, DACTe)
data = await client.documents.process(doc.id, "danfe")
print(data)

# Obter documento
doc = await client.documents.get("doc_123")

# Remover
await client.documents.delete("doc_123")
```

### Analytics

```python
# Estatísticas de uso
stats = await client.analytics.usage(period="month")
print(f"Requests: {stats.total_requests}")
print(f"Tokens: {stats.total_tokens}")
print(f"Errors: {stats.total_errors}")
```

## Tratamento de Erros

```python
from auracore import (
    AuraCore,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    ServerError
)

try:
    response = await client.agents.chat("fiscal", "...")
except AuthenticationError:
    print("API key inválida")
except RateLimitError as e:
    print(f"Rate limit. Retry em {e.retry_after}s")
except ValidationError as e:
    print(f"Dados inválidos: {e.message}")
except ServerError:
    print("Erro no servidor")
```

## Configuração

```python
# Via parâmetros
client = AuraCore(
    api_key="ac_live_xxx",
    base_url="https://api.auracore.com.br",
    timeout=60,
    max_retries=3
)

# Via variável de ambiente
# export AURACORE_API_KEY=ac_live_xxx
client = AuraCore()
```

## Documentação

- [Guia Completo](https://docs.auracore.com.br/sdk/python)
- [API Reference](https://docs.auracore.com.br/api)
- [Exemplos](https://github.com/pedrojuniorgyn/AuraCore/tree/main/examples)

## Licença

MIT
