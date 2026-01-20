# AuraCore Agents

Sistema de agentes AI para automação do AuraCore ERP.

## Visão Geral

O AuraCore Agents é um sistema de agentes inteligentes construído com o framework **Agno**, projetado para automatizar processos e fornecer assistência especializada em cada módulo do ERP.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    AURACORE + AGNO                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Next.js (Gateway)  →  FastAPI (Agents)  →  ChromaDB (RAG)     │
│         ↓                    ↓                   ↓              │
│   Autenticação          Orquestrador        Knowledge Base     │
│   Multi-tenant          Guardrails          Legislação BR      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Agentes Disponíveis

| Agente | Módulo | Status | Descrição |
|--------|--------|--------|-----------|
| **Fiscal Agent** | Fiscal | ✅ Ativo | Legislação fiscal, ICMS, CTe, NFe |
| Financial Agent | Financeiro | 🔜 Fase 2 | Fluxo de caixa, conciliação |
| TMS Agent | TMS | 🔜 Fase 2 | Operações de transporte |
| CRM Agent | Comercial | 🔜 Fase 2 | Vendas, leads, propostas |
| Fleet Agent | Frota | 🔜 Fase 2 | Manutenção, documentos |
| Accounting Agent | Contábil | 🔜 Fase 3 | Lançamentos, fechamento |
| Strategic Agent | Estratégico | 🔜 Fase 3 | BSC, PDCA, KPIs |

## Começando

### Pré-requisitos

- Python 3.11+
- Docker e Docker Compose
- Chave de API da Anthropic

### Instalação

```bash
cd agents
cp .env.example .env
# Editar .env com suas configurações

# Com Docker
docker-compose up -d

# Ou localmente
pip install -e .
uvicorn src.main:app --reload
```

### Uso Básico

```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8080/chat",
        json={
            "message": "Qual o ICMS para transporte SP → RJ de R$ 10.000?",
            "user_id": "user-123",
            "org_id": 1,
            "branch_id": 1,
        }
    )
    print(response.json())
```

## API

### POST /chat

Envia mensagem para um agente.

**Request:**
```json
{
  "message": "Sua pergunta aqui",
  "agent_type": "fiscal",
  "user_id": "user-123",
  "org_id": 1,
  "branch_id": 1,
  "role": "user"
}
```

**Response:**
```json
{
  "agent": "fiscal",
  "agent_name": "Fiscal Assistant",
  "response": "Resposta do agente...",
  "tools_used": ["calculate_icms"],
  "context": {"org_id": 1, "user_id": "user-123"}
}
```

### GET /agents

Lista agentes disponíveis.

### GET /health

Health check do serviço.

## Segurança

### Guardrails

Operações sensíveis passam por verificação de guardrails:

- **LOW**: Consultas, relatórios (automático)
- **MEDIUM**: Criação de registros (log)
- **HIGH**: Alterações financeiras (aprovação condicional)
- **CRITICAL**: Operações fiscais (sempre requer aprovação)

### Multi-tenancy

Todas as operações são filtradas por `org_id` e `branch_id`.

## Desenvolvimento

### Estrutura

```
agents/
├── src/
│   ├── agents/       # Agentes especializados
│   ├── api/          # Rotas FastAPI
│   ├── core/         # Core (orchestrator, guardrails)
│   ├── tools/        # Tools por módulo
│   └── knowledge/    # Integração ChromaDB
└── tests/
```

### Testes

```bash
pytest tests/ -v
```

## Documentação Adicional

- [Planejamento Completo](./PLANEJAMENTO.md)
- [Fiscal Agent](./FISCAL_AGENT.md)
- [Guardrails](./GUARDRAILS.md)

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
