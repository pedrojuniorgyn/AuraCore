# AuraCore Agents

Sistema de agentes AI para automação do AuraCore ERP, construído com o framework Agno.

## Quick Start

```bash
# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com sua ANTHROPIC_API_KEY

# Iniciar com Docker
docker-compose up -d

# Ou executar localmente
pip install -e .
uvicorn src.main:app --reload --port 8080
```

## Documentação

- [Documentação Completa](../docs/agents/README.md)
- [Fiscal Agent](../docs/agents/FISCAL_AGENT.md)
- [Guardrails](../docs/agents/GUARDRAILS.md)
- [Planejamento](../docs/agents/PLANEJAMENTO.md)

## Estrutura

```
agents/
├── src/
│   ├── agents/           # Agentes especializados
│   │   └── fiscal.py     # Fiscal Agent
│   ├── api/              # Rotas FastAPI
│   │   └── routes/
│   ├── core/             # Core do sistema
│   │   ├── base.py       # Base do agente
│   │   ├── orchestrator.py
│   │   ├── guardrails.py
│   │   └── observability.py
│   └── tools/            # Tools por módulo
│       └── fiscal/       # 5 tools fiscais
├── tests/
├── data/
├── pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

## API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check |
| `/agents` | GET | Lista agentes |
| `/chat` | POST | Envia mensagem |

## Licença

Proprietary - AuraCore Team
