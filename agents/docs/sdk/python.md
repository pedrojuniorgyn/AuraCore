# 🐍 Python SDK

## Instalação

```bash
pip install auracore
```

Ou com Poetry:

```bash
poetry add auracore
```

## Quick Start

```python
from auracore import AuraCore

# Inicializar cliente
client = AuraCore(api_key="ac_live_xxx")

# Chat com agente fiscal
response = client.agents.chat_sync(
    agent="fiscal",
    message="Calcule o ICMS para venda de SP para RJ, valor R$ 1.000"
)

print(response.message)
# O ICMS para operação interestadual de SP para RJ é de 12%...
```

## Configuração

### Variáveis de Ambiente

```bash
export AURACORE_API_KEY=ac_live_xxx
export AURACORE_BASE_URL=https://api.auracore.com.br  # opcional
```

### Inicialização

```python
from auracore import AuraCore

# Com API Key
client = AuraCore(api_key="ac_live_xxx")

# Com variável de ambiente (AURACORE_API_KEY)
client = AuraCore()

# Com URL customizada
client = AuraCore(
    api_key="ac_live_xxx",
    base_url="https://staging-api.auracore.com.br"
)

# Com timeout customizado
client = AuraCore(
    api_key="ac_live_xxx",
    timeout=120,  # segundos
    max_retries=5
)
```

## Agents

### Chat Síncrono

```python
response = client.agents.chat_sync(
    agent="fiscal",
    message="Qual a alíquota de PIS para regime não-cumulativo?"
)

print(response.message)
print(response.tokens_input)
print(response.tokens_output)
print(response.tool_calls)
```

### Chat Assíncrono

```python
import asyncio

async def main():
    async with AuraCore(api_key="ac_live_xxx") as client:
        response = await client.agents.chat(
            agent="fiscal",
            message="Calcule o ICMS para SP -> RJ, R$ 1.000"
        )
        print(response.message)

asyncio.run(main())
```

### Listar Agentes

```python
agents = client.agents.list_sync()

for agent in agents:
    print(f"{agent.name}: {agent.description}")
```

### Agentes Disponíveis

| Agent | Descrição |
|-------|-----------|
| `fiscal` | Cálculos fiscais (ICMS, PIS, COFINS) |
| `financial` | Gestão financeira (títulos, pagamentos) |
| `accounting` | Contabilização |
| `tms` | Gestão de transporte |
| `wms` | Gestão de armazém |
| `crm` | Relacionamento com clientes |
| `fleet` | Gestão de frota |
| `strategic` | Gestão estratégica (BSC, PDCA) |

## Voice

### Transcrição de Áudio

```python
# De arquivo
with open("audio.wav", "rb") as f:
    audio_data = f.read()

transcription = client.voice.transcribe_sync(
    audio=audio_data,
    language="pt-BR"
)

print(transcription.text)
print(transcription.confidence)
```

### Síntese de Voz

```python
synthesis = client.voice.synthesize_sync(
    text="Olá, como posso ajudar?",
    language="pt-BR",
    voice="female"
)

# Salvar áudio
with open("output.mp3", "wb") as f:
    f.write(synthesis.audio)
```

## RAG

### Query de Legislação

```python
results = client.rag.query_sync(
    query="Qual a base de cálculo do PIS?",
    collection="legislacao_fiscal",
    top_k=5
)

for result in results:
    print(f"Fonte: {result.source}")
    print(f"Relevância: {result.relevance}")
    print(f"Conteúdo: {result.content[:200]}...")
```

### Listar Coleções

```python
collections = client.rag.list_collections_sync()

for collection in collections:
    print(f"{collection.name}: {collection.document_count} documentos")
```

## Documents

### Upload

```python
with open("documento.pdf", "rb") as f:
    document = client.documents.upload_sync(
        file=f,
        filename="documento.pdf",
        collection="meus_documentos"
    )

print(f"Document ID: {document.id}")
print(f"Status: {document.status}")
```

### Processar Documento

```python
# Iniciar processamento
client.documents.process_sync(document_id="doc_xxx")

# Verificar status
doc = client.documents.get_sync(document_id="doc_xxx")
print(f"Status: {doc.status}")  # processing, completed, failed
```

### Deletar Documento

```python
client.documents.delete_sync(document_id="doc_xxx")
```

## Analytics

### Estatísticas de Uso

```python
usage = client.analytics.usage_sync(
    start_date="2026-01-01",
    end_date="2026-01-31"
)

print(f"Total requests: {usage.total_requests}")
print(f"Total tokens: {usage.total_tokens}")
print(f"Estimated cost: ${usage.estimated_cost:.2f}")
```

### Top Agentes

```python
top_agents = client.analytics.top_agents_sync(limit=5)

for agent in top_agents:
    print(f"{agent.name}: {agent.request_count} requests")
```

## Tratamento de Erros

```python
from auracore import AuraCore
from auracore.exceptions import (
    AuraCoreError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    ServerError
)

client = AuraCore(api_key="ac_live_xxx")

try:
    response = client.agents.chat_sync(
        agent="fiscal",
        message="..."
    )
except AuthenticationError:
    print("API Key inválida")
except RateLimitError as e:
    print(f"Rate limit excedido. Retry em {e.retry_after}s")
except ValidationError as e:
    print(f"Dados inválidos: {e.details}")
except ServerError:
    print("Erro no servidor. Tente novamente.")
except AuraCoreError as e:
    print(f"Erro: {e.message}")
```

## Context Manager

Para gerenciar conexões corretamente:

```python
# Síncrono
with AuraCore(api_key="ac_live_xxx") as client:
    response = client.agents.chat_sync(...)

# Assíncrono
async with AuraCore(api_key="ac_live_xxx") as client:
    response = await client.agents.chat(...)
```

## Logging

```python
import logging

# Ativar logs do SDK
logging.getLogger("auracore").setLevel(logging.DEBUG)

# Usar seu próprio logger
client = AuraCore(
    api_key="ac_live_xxx",
    logger=my_logger
)
```

## Exemplos Completos

### Chatbot Fiscal

```python
from auracore import AuraCore

def fiscal_chatbot():
    client = AuraCore()
    
    print("Chatbot Fiscal - Digite 'sair' para encerrar")
    
    while True:
        user_input = input("\nVocê: ")
        
        if user_input.lower() == 'sair':
            break
        
        response = client.agents.chat_sync(
            agent="fiscal",
            message=user_input
        )
        
        print(f"\nAgente: {response.message}")
        
        if response.tool_calls:
            print("\nTools utilizadas:")
            for tool in response.tool_calls:
                print(f"  - {tool.tool}: {tool.output}")

if __name__ == "__main__":
    fiscal_chatbot()
```

### Processamento de Áudio

```python
import asyncio
from auracore import AuraCore

async def process_audio(audio_path: str):
    async with AuraCore() as client:
        # Transcrever
        with open(audio_path, "rb") as f:
            transcription = await client.voice.transcribe(
                audio=f.read(),
                language="pt-BR"
            )
        
        print(f"Transcrição: {transcription.text}")
        
        # Processar com agente
        response = await client.agents.chat(
            agent="fiscal",
            message=transcription.text
        )
        
        print(f"Resposta: {response.message}")
        
        # Sintetizar resposta
        synthesis = await client.voice.synthesize(
            text=response.message,
            language="pt-BR"
        )
        
        with open("response.mp3", "wb") as f:
            f.write(synthesis.audio)
        
        print("Áudio salvo em response.mp3")

if __name__ == "__main__":
    asyncio.run(process_audio("input.wav"))
```
