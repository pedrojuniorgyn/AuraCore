# 🤖 AuraCore Agent

## Visão Geral

O AuraCore Agent é um assistente de IA integrado ao ERP AuraCore, projetado para auxiliar usuários nas operações diárias de logística, fiscal, financeiro e operacional.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     AURACORE AGENT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INTERFACE                                                      │
│  ├── Chat Widget (React)                                       │
│  ├── Voice Interface (Chirp 3)                                 │
│  └── API REST                                                  │
│                                                                 │
│  ORQUESTRAÇÃO                                                   │
│  ├── LangGraph (workflows)                                     │
│  └── Vertex AI Agent Builder                                   │
│                                                                 │
│  LLM                                                            │
│  ├── Gemini 3 Pro (principal)                                  │
│  └── Gemini 2.5 Flash (tarefas simples)                        │
│                                                                 │
│  INTEGRAÇÕES                                                    │
│  ├── Google Workspace (Gmail, Drive, Calendar, Sheets)         │
│  ├── Google Cloud (Document AI, Speech)                        │
│  └── AuraCore ERP (SQL Server)                                 │
│                                                                 │
│  TOOLS                                                          │
│  ├── Fiscal: ImportNFe, ConsultSPED, CalculateTax              │
│  ├── Financial: ReconcileBank, GenerateReport                  │
│  ├── TMS: TrackShipment, CreatePickupList                      │
│  └── Workspace: SearchEmail, CreateEvent, UpdateSheet          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura de Pastas

```
src/agent/
├── core/                    # Núcleo do agente
│   ├── AuraAgent.ts        # Classe principal
│   ├── AgentConfig.ts      # Configurações
│   └── AgentContext.ts     # Contexto de execução
├── integrations/            # Integrações externas
│   ├── google/             # Google Cloud + Workspace
│   └── auracore/           # ERP AuraCore
├── tools/                   # Ferramentas do agente
│   ├── fiscal/             # NFe, CTe, SPED
│   ├── financial/          # Conciliação, relatórios
│   ├── tms/                # Transporte
│   ├── wms/                # Armazém
│   └── workspace/          # Google Workspace
├── workflows/               # Workflows LangGraph
└── index.ts                # Exportações
```

## Configuração

### Variáveis de Ambiente

```env
# Google Cloud
GOOGLE_CLOUD_PROJECT=auracore-production
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Google OAuth (Workspace)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# Document AI
DOCUMENT_AI_PROCESSOR_ID=xxx
DOCUMENT_AI_LOCATION=us

# Vertex AI / Gemini
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-3-pro
```

### Dependências

```bash
# Google APIs
npm install @google-cloud/vertexai @google-cloud/documentai googleapis

# LangChain/LangGraph
npm install @langchain/core @langchain/google-genai langgraph

# Utilidades
npm install zod
```

## Uso

### Inicialização

```typescript
import { AuraAgent } from '@/agent';

const agent = await AuraAgent.create({
  userId: 'user-123',
  organizationId: 1,
  branchId: 1,
});

const response = await agent.chat('Importar a NFe do email de hoje da empresa XYZ');
```

### Tools Disponíveis

| Tool | Módulo | Descrição |
|------|--------|-----------|
| `import_nfe` | Fiscal | Importa NFe de email, Drive ou upload |
| `consult_sped` | Fiscal | Consulta registros SPED |
| `calculate_tax` | Fiscal | Calcula impostos para operação |
| `reconcile_bank` | Financial | Concilia extrato bancário |
| `generate_report` | Financial | Gera relatórios financeiros |
| `track_shipment` | TMS | Rastreia embarque |
| `search_email` | Workspace | Busca emails no Gmail |
| `create_event` | Workspace | Cria evento no Calendar |
| `update_sheet` | Workspace | Atualiza Google Sheets |

## Referências

- [GOOGLE_INTEGRATION.md](./GOOGLE_INTEGRATION.md)
- [TOOLS_SPEC.md](./TOOLS_SPEC.md)
- [Google Workspace MCP](https://github.com/taylorwilsdon/google_workspace_mcp)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
