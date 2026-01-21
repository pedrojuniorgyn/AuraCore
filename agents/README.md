# 🤖 AuraCore Agents

[![CI](https://github.com/pedrojuniorgyn/AuraCore/actions/workflows/ci.yml/badge.svg)](https://github.com/pedrojuniorgyn/AuraCore/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11-blue.svg)](https://python.org)

Sistema de Agentes IA para ERP Logístico Brasileiro com suporte a:
- 🧮 **Fiscal** - Cálculos de ICMS, PIS, COFINS, SPED
- 💰 **Financial** - Gestão de títulos e pagamentos
- 📊 **Accounting** - Contabilização automática
- 🚚 **TMS** - Gestão de transporte
- 📦 **WMS** - Gestão de armazém
- 👥 **CRM** - Relacionamento com clientes
- 🚗 **Fleet** - Gestão de frota
- 📈 **Strategic** - Gestão estratégica (BSC, PDCA)

## 🚀 Quick Start

### Usando Docker

```bash
# Clone o repositório
git clone https://github.com/pedrojuniorgyn/AuraCore.git
cd AuraCore/agents

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Inicie os serviços
docker-compose up -d

# Verifique o status
curl http://localhost:8000/health
```

### Usando Python SDK

```bash
pip install auracore
```

```python
from auracore import AuraCore

client = AuraCore(api_key="ac_live_xxx")

# Chat com agente fiscal
response = client.agents.chat_sync(
    agent="fiscal",
    message="Calcule o ICMS para venda de SP para RJ, valor R$ 1.000"
)
print(response.message)
```

### Usando CLI

```bash
export AURACORE_API_KEY=ac_live_xxx

# Chat com agente
auracore chat send fiscal "Qual a alíquota de ICMS para SP?"

# Transcrição de áudio
auracore voice transcribe audio.wav

# Query RAG
auracore rag query "legislação PIS/COFINS"
```

## 📖 Documentação

| Documento | Descrição |
|-----------|-----------|
| [API Reference](docs/api/README.md) | Documentação completa da API |
| [SDK Python](docs/sdk/python.md) | Guia do SDK Python |
| [Deployment](docs/deployment/README.md) | Guias de deploy |
| [Architecture](docs/architecture/README.md) | Arquitetura do sistema |
| [Contributing](CONTRIBUTING.md) | Guia para contribuidores |

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│                   (FastAPI + Auth)                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Agents     │   │     Voice     │   │      RAG      │
│   (8 tipos)   │   │  (STT + TTS)  │   │ (Legislação)  │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                           │
│         Redis │ Prometheus │ Grafana │ ARQ Worker           │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Stack Tecnológica

| Componente | Tecnologia |
|------------|------------|
| **API** | FastAPI, Python 3.11 |
| **LLM** | Claude (Anthropic) |
| **Cache** | Redis |
| **Tasks** | ARQ |
| **Monitoring** | Prometheus, Grafana |
| **Deploy** | Docker, Kubernetes |

## 📊 Métricas

- **8 Agentes** especializados
- **32+ Tools** implementados
- **130+ Testes** (unit, e2e, integration)
- **6 Leis** indexadas no RAG
- **15+ Webhooks** eventos

## 🔒 Segurança

- Autenticação via API Key e JWT
- RBAC com 8 roles e 20+ permissions
- Audit logging (LGPD compliant)
- Rate limiting configurável
- TLS em todas as comunicações

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para guias de contribuição.

## 📞 Suporte

- 📧 Email: support@auracore.com.br
- 📖 Docs: https://docs.auracore.com.br
- 🐛 Issues: https://github.com/pedrojuniorgyn/AuraCore/issues
