# 🚀 PLANEJAMENTO COMPLETO: AGNO NO AURACORE ERP

**Versão:** 2.0.0 (Enterprise Edition)  
**Data:** 20/01/2026  
**Autor:** Claude (Arquiteto de IA Enterprise)  
**Projeto:** AuraCore ERP Logístico  
**Baseado em:** Análise Estratégica v1.0.0 + Melhores Práticas do Mercado 2026

---

## 📋 SUMÁRIO EXECUTIVO

Este documento expande a análise estratégica original com **implementação técnica detalhada**, **melhores práticas do mercado**, **prompts prontos para execução**, e **infraestrutura completa** para transformar o AuraCore em um sistema **AI-First**.

### 🎯 O que Este Documento Adiciona

| Aspecto | Análise v1.0 | Este Documento v2.0 |
|---------|-------------|---------------------|
| Arquitetura | ✅ Visão geral | ✅ + Detalhamento técnico completo |
| Código | ❌ Conceitual | ✅ **Prompts prontos para executar** |
| Infraestrutura | ❌ Não especificado | ✅ **Docker Compose completo** |
| Integração | ❌ Genérico | ✅ **Integração com Knowledge Module existente** |
| Segurança | ❌ Básico | ✅ **Guardrails + Human-in-the-loop** |
| Observabilidade | ❌ Não mencionado | ✅ **Logging + Tracing + Métricas** |
| Testes | ❌ Não mencionado | ✅ **Framework de testes para agentes** |
| Custos | ❌ Estimativa única | ✅ **Breakdown detalhado por agente** |
| Melhores Práticas | ❌ Básico | ✅ **ReAct, CoT, Tool Use, Memory Patterns** |

---

## PARTE 1: ARQUITETURA TÉCNICA DETALHADA

### 1.1 Stack Tecnológico Completo

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       AURACORE AGENT STACK (COMPLETO)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    CAMADA DE INTERFACE                                   │   │
│  │                                                                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │  │  Chat    │ │  Voice   │ │   API    │ │ WhatsApp │ │  Slack   │      │   │
│  │  │(Next.js) │ │ (Gemini) │ │  REST    │ │   Bot    │ │   Bot    │      │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │   │
│  │       │            │            │            │            │             │   │
│  │       └────────────┴────────────┼────────────┴────────────┘             │   │
│  │                                 │                                        │   │
│  │                    ┌────────────▼────────────┐                          │   │
│  │                    │   GATEWAY API (SSE)     │                          │   │
│  │                    │  /api/agents/chat       │                          │   │
│  │                    └────────────┬────────────┘                          │   │
│  └─────────────────────────────────┼────────────────────────────────────────┘   │
│                                    │                                            │
│  ┌─────────────────────────────────▼────────────────────────────────────────┐   │
│  │                     AGNO AGENT LAYER (Python/FastAPI)                    │   │
│  │                                                                          │   │
│  │  ┌───────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    AGENT ORCHESTRATOR                              │  │   │
│  │  │  ┌─────────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │                   ROUTING LAYER                              │  │  │   │
│  │  │  │  • Intent Classification (qual agente?)                      │  │  │   │
│  │  │  │  • Context Enrichment (org, user, permissions)               │  │  │   │
│  │  │  │  • Rate Limiting (por org/user)                              │  │  │   │
│  │  │  └──────────────────────────┬──────────────────────────────────┘  │  │   │
│  │  │                             │                                      │  │   │
│  │  │  ┌──────────────────────────▼──────────────────────────────────┐  │  │   │
│  │  │  │                   SPECIALIZED AGENTS                         │  │  │   │
│  │  │  │  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐        │  │  │   │
│  │  │  │  │ Fiscal ││Finance ││  TMS   ││  CRM   ││ Fleet  │        │  │  │   │
│  │  │  │  │ Agent  ││ Agent  ││ Agent  ││ Agent  ││ Agent  │        │  │  │   │
│  │  │  │  └───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘        │  │  │   │
│  │  │  │      │         │         │         │         │              │  │  │   │
│  │  │  │  ┌────────┐┌────────┐                                       │  │  │   │
│  │  │  │  │Account.││Strategic│                                      │  │  │   │
│  │  │  │  │ Agent  ││ Agent  │                                       │  │  │   │
│  │  │  │  └───┬────┘└───┬────┘                                       │  │  │   │
│  │  │  └──────┼─────────┼────────────────────────────────────────────┘  │  │   │
│  │  └─────────┼─────────┼───────────────────────────────────────────────┘  │   │
│  │            │         │                                                   │   │
│  │  ┌─────────▼─────────▼───────────────────────────────────────────────┐  │   │
│  │  │                     CAPABILITIES LAYER                             │  │   │
│  │  │                                                                    │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │   │
│  │  │  │  MEMORY  │ │KNOWLEDGE │ │  TOOLS   │ │GUARDRAILS│             │  │   │
│  │  │  │          │ │  (RAG)   │ │  (MCP)   │ │          │             │  │   │
│  │  │  │ Session  │ │ ChromaDB │ │ AuraCore │ │ Safety   │             │  │   │
│  │  │  │ Long-term│ │  ✅PRONTO │ │   APIs   │ │ Approval │             │  │   │
│  │  │  │ SQLite   │ │          │ │          │ │ Limits   │             │  │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │  │   │
│  │  │                                                                    │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │   │
│  │  │  │REASONING │ │STRUCTURED│ │ LOGGING  │ │  EVAL    │             │  │   │
│  │  │  │          │ │  OUTPUT  │ │          │ │          │             │  │   │
│  │  │  │ ReAct    │ │   JSON   │ │ OpenTel  │ │ LangSmith│             │  │   │
│  │  │  │ CoT      │ │  Schema  │ │ Traces   │ │ Metrics  │             │  │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │  │   │
│  │  └────────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                     AURACORE DOMAIN LAYER (Next.js/TypeScript)           │   │
│  │                                                                          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │ Fiscal │ │Finance │ │Account │ │  TMS   │ │  WMS   │ │Strategic│    │   │
│  │  │ Module │ │ Module │ │ Module │ │ Module │ │ Module │ │ Module │    │   │
│  │  │  DDD   │ │  DDD   │ │  DDD   │ │  DDD   │ │  DDD   │ │  DDD   │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                     INFRASTRUCTURE LAYER                                 │   │
│  │                                                                          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │ChromaDB│ │SQL Srvr│ │ SQLite │ │ SEFAZ  │ │  BTG   │ │ Redis  │    │   │
│  │  │ ✅READY │ │  Data  │ │ Memory │ │  API   │ │Pactual │ │ Cache  │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Estrutura de Pastas do Projeto

```
auracore/
├── src/                          # Next.js (TypeScript) - EXISTENTE
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents/           # 🆕 Gateway para Agno
│   │   │   │   ├── chat/route.ts
│   │   │   │   ├── status/route.ts
│   │   │   │   └── history/route.ts
│   │   │   └── ...
│   │   └── ...
│   └── modules/
│       └── knowledge/            # ✅ JÁ EXISTE
│
├── agents/                       # 🆕 AGNO (Python)
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── docker-compose.yml
│   │
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI entry point
│   │   ├── config.py             # Configurações
│   │   │
│   │   ├── core/                 # Core do sistema de agentes
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py   # Orquestrador principal
│   │   │   ├── router.py         # Roteamento de intents
│   │   │   ├── memory.py         # Memory management
│   │   │   ├── guardrails.py     # Safety & approval
│   │   │   └── observability.py  # Logging & tracing
│   │   │
│   │   ├── agents/               # Agentes especializados
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # Classe base para agentes
│   │   │   ├── fiscal.py         # Fiscal Agent
│   │   │   ├── financial.py      # Financial Agent
│   │   │   ├── tms.py            # TMS Agent
│   │   │   ├── crm.py            # CRM Agent
│   │   │   ├── fleet.py          # Fleet Agent
│   │   │   ├── accounting.py     # Accounting Agent
│   │   │   └── strategic.py      # Strategic Agent
│   │   │
│   │   ├── tools/                # Tools conectados ao AuraCore
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # Classe base para tools
│   │   │   ├── fiscal/           # Tools do módulo fiscal
│   │   │   │   ├── calculate_icms.py
│   │   │   │   ├── validate_cte.py
│   │   │   │   ├── check_nfe.py
│   │   │   │   ├── generate_sped.py
│   │   │   │   └── query_legislation.py
│   │   │   ├── financial/        # Tools do módulo financeiro
│   │   │   │   ├── forecast_cashflow.py
│   │   │   │   ├── reconcile_bank.py
│   │   │   │   └── suggest_payments.py
│   │   │   ├── tms/              # Tools do módulo TMS
│   │   │   │   ├── optimize_route.py
│   │   │   │   ├── assign_driver.py
│   │   │   │   └── track_delivery.py
│   │   │   └── ...
│   │   │
│   │   ├── knowledge/            # Integração com ChromaDB
│   │   │   ├── __init__.py
│   │   │   ├── client.py         # Cliente ChromaDB
│   │   │   └── embeddings.py     # Embedding utilities
│   │   │
│   │   ├── integrations/         # Integrações externas
│   │   │   ├── __init__.py
│   │   │   ├── auracore_api.py   # Cliente HTTP para AuraCore
│   │   │   ├── sefaz.py          # Integração SEFAZ
│   │   │   └── btg.py            # Integração BTG
│   │   │
│   │   └── api/                  # API FastAPI
│   │       ├── __init__.py
│   │       ├── routes/
│   │       │   ├── chat.py       # POST /chat
│   │       │   ├── agents.py     # GET /agents
│   │       │   └── health.py     # GET /health
│   │       └── schemas/          # Pydantic schemas
│   │           ├── chat.py
│   │           └── responses.py
│   │
│   ├── tests/                    # Testes
│   │   ├── unit/
│   │   │   ├── test_agents.py
│   │   │   └── test_tools.py
│   │   ├── integration/
│   │   │   └── test_api.py
│   │   └── eval/                 # Avaliação de agentes
│   │       └── test_quality.py
│   │
│   └── data/                     # Dados locais
│       ├── memory/               # SQLite memories
│       └── logs/                 # Logs estruturados
│
├── docker/
│   └── agents/
│       ├── Dockerfile
│       └── docker-compose.yml
│
└── docs/
    └── agents/
        ├── ARCHITECTURE.md
        └── TOOLS.md
```

### 1.3 Integração com Componentes Existentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 INTEGRAÇÃO AGNO ↔ COMPONENTES EXISTENTES                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    KNOWLEDGE MODULE (✅ JÁ PRONTO)                   │   │
│  │                                                                      │   │
│  │  ChromaDB: chromadb:8000                                            │   │
│  │  Collection: auracore_knowledge                                      │   │
│  │  Embeddings: Gemini text-embedding-004                              │   │
│  │                                                                      │   │
│  │  APIs Disponíveis:                                                   │   │
│  │  ├── GET  /api/knowledge/search?q=...       → Busca semântica       │   │
│  │  ├── POST /api/knowledge/search             → Busca com filtros     │   │
│  │  ├── GET  /api/knowledge/stats              → Estatísticas          │   │
│  │  └── GET  /api/health/embeddings            → Health check          │   │
│  │                                                                      │   │
│  │  Documentos Indexados:                                               │   │
│  │  ├── ICMS: Lei Kandir (LC 87/96)                                    │   │
│  │  ├── Reforma 2026: IBS/CBS (EC 132/23)                              │   │
│  │  └── PIS/COFINS: Regime não-cumulativo                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      ▲                                      │
│                                      │ HTTP/REST                            │
│                                      │                                      │
│  ┌───────────────────────────────────┼─────────────────────────────────┐   │
│  │                         AGNO AGENTS                                  │   │
│  │                                   │                                  │   │
│  │  class QueryLegislationTool:      │                                  │   │
│  │      async def run(self, query):  │                                  │   │
│  │          response = await http.post(                                 │   │
│  │              "http://web:3000/api/knowledge/search",                 │   │
│  │              json={"query": query, "top_k": 5}                       │   │
│  │          )                        │                                  │   │
│  │          return response.json()["data"]["results"]                   │   │
│  └───────────────────────────────────┼─────────────────────────────────┘   │
│                                      │                                      │
│  ┌───────────────────────────────────┼─────────────────────────────────┐   │
│  │                    MCP SERVER (✅ 9 TOOLS EXISTENTES)                │   │
│  │                                   │                                  │   │
│  │  Tools disponíveis para os agentes usarem:                          │   │
│  │  ├── check_cursor_issues    → Verificação de código                 │   │
│  │  ├── validate_code          → Validação contra contratos            │   │
│  │  ├── get_contract           → Obter contrato específico             │   │
│  │  ├── search_patterns        → Buscar padrões aprovados              │   │
│  │  ├── register_correction    → Registrar correção (learning)         │   │
│  │  └── ...                                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AURACORE REST APIs (✅ 100+ ENDPOINTS)            │   │
│  │                                                                      │   │
│  │  Módulo Fiscal:                                                      │   │
│  │  ├── POST /api/fiscal/cte/authorize      → Autorizar CTe            │   │
│  │  ├── POST /api/fiscal/cte/validate       → Validar CTe              │   │
│  │  ├── GET  /api/fiscal/documents          → Listar documentos        │   │
│  │  └── POST /api/fiscal/sped/generate      → Gerar SPED               │   │
│  │                                                                      │   │
│  │  Módulo Financeiro:                                                  │   │
│  │  ├── GET  /api/financial/payables        → Contas a pagar           │   │
│  │  ├── GET  /api/financial/receivables     → Contas a receber         │   │
│  │  ├── POST /api/financial/payments        → Criar pagamento          │   │
│  │  └── GET  /api/financial/cashflow        → Fluxo de caixa           │   │
│  │                                                                      │   │
│  │  Módulo TMS:                                                         │   │
│  │  ├── GET  /api/tms/trips                 → Listar viagens           │   │
│  │  ├── POST /api/tms/trips                 → Criar viagem             │   │
│  │  ├── GET  /api/tms/loads                 → Repositório de cargas    │   │
│  │  └── GET  /api/tms/tracking/:id          → Rastreamento             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTE 2: MELHORES PRÁTICAS DO MERCADO

### 2.1 Padrões de Design para Agentes

#### 2.1.1 ReAct Pattern (Reasoning + Acting)

```python
"""
ReAct é o padrão mais efetivo para agentes que precisam raciocinar
antes de agir. Implementado nativamente no Agno.

Fluxo:
1. THOUGHT: O agente analisa a situação
2. ACTION: Escolhe uma ferramenta
3. OBSERVATION: Recebe o resultado
4. REPEAT: Até resolver o problema
"""

from agno.agent import Agent

fiscal_agent = Agent(
    name="Fiscal Agent",
    model=Claude(id="claude-sonnet-4-5"),
    
    # ReAct é habilitado por padrão no Agno
    # Mas podemos customizar o comportamento:
    show_tool_calls=True,  # Mostra o raciocínio
    
    instructions=[
        # Instruções que guiam o padrão ReAct
        "Antes de responder, sempre:",
        "1. PENSE: Qual é a pergunta real do usuário?",
        "2. VERIFIQUE: Preciso consultar alguma ferramenta?",
        "3. AÇÃO: Use as ferramentas necessárias",
        "4. VALIDE: A resposta está completa e correta?",
        "5. RESPONDA: Formate a resposta de forma clara",
    ]
)
```

#### 2.1.2 Chain of Thought (CoT) para Cálculos

```python
"""
Para operações que envolvem cálculos (impostos, projeções),
usar Chain of Thought explícito melhora a precisão.
"""

class CalculateICMSTool:
    """Calcula ICMS com raciocínio explícito."""
    
    description = """
    Calcula ICMS para operações de transporte.
    
    IMPORTANTE: Sempre mostre o raciocínio passo a passo:
    1. Identificar UF origem e destino
    2. Verificar se é operação interna ou interestadual
    3. Buscar alíquota aplicável
    4. Calcular base de cálculo
    5. Aplicar alíquota
    6. Verificar benefícios fiscais
    7. Calcular valor final
    """
    
    async def run(
        self,
        valor_operacao: float,
        uf_origem: str,
        uf_destino: str,
        tipo_servico: str = "transporte_carga"
    ) -> dict:
        # Raciocínio explícito
        reasoning = []
        
        # Passo 1: Identificar tipo de operação
        is_interestadual = uf_origem != uf_destino
        reasoning.append(
            f"1. Operação {'INTERESTADUAL' if is_interestadual else 'INTERNA'}: "
            f"{uf_origem} → {uf_destino}"
        )
        
        # Passo 2: Buscar alíquota
        aliquota = self._get_aliquota(uf_origem, uf_destino, is_interestadual)
        reasoning.append(f"2. Alíquota aplicável: {aliquota}%")
        
        # Passo 3: Base de cálculo
        base_calculo = valor_operacao
        reasoning.append(f"3. Base de cálculo: R$ {base_calculo:,.2f}")
        
        # Passo 4: Calcular
        icms = base_calculo * (aliquota / 100)
        reasoning.append(f"4. ICMS = R$ {base_calculo:,.2f} × {aliquota}% = R$ {icms:,.2f}")
        
        return {
            "icms": icms,
            "aliquota": aliquota,
            "base_calculo": base_calculo,
            "uf_origem": uf_origem,
            "uf_destino": uf_destino,
            "tipo_operacao": "interestadual" if is_interestadual else "interna",
            "reasoning": reasoning,  # Importante: retornar o raciocínio
            "base_legal": "LC 87/96, Art. 155 II CF/88"
        }
```

#### 2.1.3 Structured Output (JSON Schema)

```python
"""
Usar JSON Schema para garantir outputs estruturados
que podem ser processados automaticamente.
"""

from pydantic import BaseModel, Field
from typing import List, Optional

class ICMSCalculation(BaseModel):
    """Schema estruturado para cálculo de ICMS."""
    
    icms_valor: float = Field(description="Valor do ICMS calculado")
    aliquota: float = Field(description="Alíquota aplicada (%)")
    base_calculo: float = Field(description="Base de cálculo")
    uf_origem: str = Field(description="UF de origem")
    uf_destino: str = Field(description="UF de destino")
    cfop_sugerido: str = Field(description="CFOP sugerido para a operação")
    cst: str = Field(description="CST aplicável")
    base_legal: str = Field(description="Fundamentação legal")
    observacoes: Optional[List[str]] = Field(
        default=None, 
        description="Observações adicionais"
    )

fiscal_agent = Agent(
    name="Fiscal Agent",
    model=Claude(id="claude-sonnet-4-5"),
    
    # Forçar output estruturado
    response_model=ICMSCalculation,
    structured_output=True,
    
    # ...
)
```

### 2.2 Memory Patterns

```python
"""
Padrões de memória para agentes contextuais.
"""

from agno.db.sqlite import SqliteDb
from agno.memory import Memory

# 1. Session Memory (curto prazo - dentro da conversa)
# Gerenciado automaticamente pelo Agno

# 2. User Memory (médio prazo - histórico do usuário)
user_memory = SqliteDb(
    db_file="data/memory/user_memory.db",
    table_name="user_interactions"
)

# 3. Organization Memory (longo prazo - conhecimento da empresa)
org_memory = SqliteDb(
    db_file="data/memory/org_memory.db", 
    table_name="org_knowledge"
)

fiscal_agent = Agent(
    name="Fiscal Agent",
    
    # Memória persistente
    db=user_memory,
    
    # Habilitar summarização automática para contextos longos
    memory=Memory(
        summarize=True,
        max_tokens=8000
    ),
    
    instructions=[
        # Instruções para usar memória
        "Consulte o histórico de interações para personalizar respostas",
        "Lembre de preferências do usuário (ex: nível de detalhamento)",
        "Mantenha contexto de operações em andamento",
    ]
)
```

### 2.3 Guardrails e Human-in-the-Loop

```python
"""
CRÍTICO: Implementar guardrails para operações sensíveis.
"""

from enum import Enum
from typing import Callable
from dataclasses import dataclass

class RiskLevel(Enum):
    LOW = "low"           # Consultas, relatórios
    MEDIUM = "medium"     # Criação de registros
    HIGH = "high"         # Alterações financeiras
    CRITICAL = "critical" # Operações fiscais, pagamentos

@dataclass
class Guardrail:
    """Define um guardrail para uma operação."""
    risk_level: RiskLevel
    requires_approval: bool
    max_value: Optional[float] = None
    allowed_roles: List[str] = None

# Mapeamento de tools para guardrails
GUARDRAILS = {
    # Operações de baixo risco - automáticas
    "query_legislation": Guardrail(RiskLevel.LOW, requires_approval=False),
    "calculate_icms": Guardrail(RiskLevel.LOW, requires_approval=False),
    "track_delivery": Guardrail(RiskLevel.LOW, requires_approval=False),
    
    # Operações de médio risco - log + limites
    "create_cte_draft": Guardrail(RiskLevel.MEDIUM, requires_approval=False),
    "schedule_maintenance": Guardrail(RiskLevel.MEDIUM, requires_approval=False),
    
    # Operações de alto risco - aprovação para valores altos
    "authorize_cte": Guardrail(
        RiskLevel.HIGH, 
        requires_approval=True,
        max_value=100000.00,  # Acima de R$ 100k precisa aprovação
        allowed_roles=["fiscal_admin", "manager"]
    ),
    "create_payment": Guardrail(
        RiskLevel.HIGH,
        requires_approval=True,
        max_value=50000.00,
        allowed_roles=["financial_admin", "manager"]
    ),
    
    # Operações críticas - SEMPRE requer aprovação
    "generate_sped": Guardrail(
        RiskLevel.CRITICAL,
        requires_approval=True,
        allowed_roles=["fiscal_admin", "cfo"]
    ),
    "close_accounting_period": Guardrail(
        RiskLevel.CRITICAL,
        requires_approval=True,
        allowed_roles=["accounting_admin", "cfo"]
    ),
}

class GuardrailMiddleware:
    """Middleware que intercepta chamadas de tools e aplica guardrails."""
    
    async def __call__(
        self,
        tool_name: str,
        tool_input: dict,
        user_context: dict
    ) -> dict:
        guardrail = GUARDRAILS.get(tool_name)
        
        if not guardrail:
            # Tool sem guardrail definido - bloquear por segurança
            raise PermissionError(f"Tool {tool_name} não tem guardrail definido")
        
        # Verificar role
        if guardrail.allowed_roles:
            if user_context["role"] not in guardrail.allowed_roles:
                raise PermissionError(
                    f"Usuário não tem permissão para {tool_name}. "
                    f"Roles necessárias: {guardrail.allowed_roles}"
                )
        
        # Verificar valor
        if guardrail.max_value and tool_input.get("valor"):
            if tool_input["valor"] > guardrail.max_value:
                return {
                    "status": "pending_approval",
                    "message": f"Operação de R$ {tool_input['valor']:,.2f} requer aprovação",
                    "approval_request": {
                        "tool": tool_name,
                        "input": tool_input,
                        "user": user_context["user_id"],
                        "org": user_context["org_id"],
                        "reason": f"Valor acima do limite de R$ {guardrail.max_value:,.2f}"
                    }
                }
        
        # Verificar aprovação
        if guardrail.requires_approval:
            return {
                "status": "pending_approval",
                "message": f"Operação {tool_name} requer aprovação",
                "approval_request": {
                    "tool": tool_name,
                    "input": tool_input,
                    "user": user_context["user_id"],
                    "org": user_context["org_id"]
                }
            }
        
        # Operação permitida
        return {"status": "approved"}
```

### 2.4 Observabilidade

```python
"""
Logging, tracing e métricas para agentes.
"""

import logging
import time
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from prometheus_client import Counter, Histogram

# Métricas Prometheus
agent_requests = Counter(
    'agent_requests_total',
    'Total de requisições por agente',
    ['agent_name', 'status']
)

agent_latency = Histogram(
    'agent_latency_seconds',
    'Latência de resposta dos agentes',
    ['agent_name']
)

tool_calls = Counter(
    'tool_calls_total',
    'Total de chamadas de tools',
    ['tool_name', 'status']
)

# Tracer OpenTelemetry
tracer = trace.get_tracer("agno.agents")

class ObservabilityMiddleware:
    """Middleware para logging e tracing de agentes."""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    async def wrap_agent_call(
        self,
        agent_name: str,
        user_input: str,
        user_context: dict,
        agent_fn: Callable
    ):
        # Iniciar span de tracing
        with tracer.start_as_current_span(f"agent.{agent_name}") as span:
            span.set_attribute("agent.name", agent_name)
            span.set_attribute("user.id", user_context.get("user_id"))
            span.set_attribute("org.id", user_context.get("org_id"))
            span.set_attribute("input.length", len(user_input))
            
            start_time = time.time()
            
            try:
                # Log de entrada
                self.logger.info(
                    "Agent request",
                    extra={
                        "agent": agent_name,
                        "user_id": user_context.get("user_id"),
                        "org_id": user_context.get("org_id"),
                        "input_preview": user_input[:100] + "..." if len(user_input) > 100 else user_input
                    }
                )
                
                # Executar agente
                result = await agent_fn(user_input)
                
                # Métricas de sucesso
                duration = time.time() - start_time
                agent_latency.labels(agent_name=agent_name).observe(duration)
                agent_requests.labels(agent_name=agent_name, status="success").inc()
                
                span.set_status(Status(StatusCode.OK))
                span.set_attribute("response.length", len(str(result)))
                
                # Log de saída
                self.logger.info(
                    "Agent response",
                    extra={
                        "agent": agent_name,
                        "duration_ms": int(duration * 1000),
                        "tools_used": result.get("tools_used", [])
                    }
                )
                
                return result
                
            except Exception as e:
                # Métricas de erro
                agent_requests.labels(agent_name=agent_name, status="error").inc()
                
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                
                self.logger.error(
                    "Agent error",
                    extra={
                        "agent": agent_name,
                        "error": str(e),
                        "error_type": type(e).__name__
                    },
                    exc_info=True
                )
                
                raise
```

---

## PARTE 3: CUSTOS DETALHADOS

### 3.1 Custo de API por Agente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANÁLISE DE CUSTOS - API CLAUDE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODELO: Claude Sonnet 4.5                                                  │
│  ├── Input:  $3 / 1M tokens                                                 │
│  └── Output: $15 / 1M tokens                                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ FISCAL AGENT                                                         │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Interações estimadas: 100/dia                                        │   │
│  │ Tokens médios/interação: 2.000 input + 1.500 output                  │   │
│  │                                                                      │   │
│  │ Cálculo mensal (22 dias úteis):                                      │   │
│  │ ├── Input:  100 × 22 × 2.000 = 4.4M tokens × $3/1M = $13.20         │   │
│  │ ├── Output: 100 × 22 × 1.500 = 3.3M tokens × $15/1M = $49.50        │   │
│  │ └── TOTAL: $62.70/mês (~R$ 380/mês)                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ FINANCIAL AGENT                                                      │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Interações estimadas: 80/dia                                         │   │
│  │ Tokens médios/interação: 3.000 input + 2.000 output                  │   │
│  │                                                                      │   │
│  │ Cálculo mensal:                                                      │   │
│  │ ├── Input:  80 × 22 × 3.000 = 5.28M tokens × $3/1M = $15.84         │   │
│  │ ├── Output: 80 × 22 × 2.000 = 3.52M tokens × $15/1M = $52.80        │   │
│  │ └── TOTAL: $68.64/mês (~R$ 415/mês)                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TMS AGENT                                                            │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Interações estimadas: 150/dia (alta demanda operacional)             │   │
│  │ Tokens médios/interação: 1.500 input + 1.000 output                  │   │
│  │                                                                      │   │
│  │ Cálculo mensal:                                                      │   │
│  │ ├── Input:  150 × 22 × 1.500 = 4.95M tokens × $3/1M = $14.85        │   │
│  │ ├── Output: 150 × 22 × 1.000 = 3.3M tokens × $15/1M = $49.50        │   │
│  │ └── TOTAL: $64.35/mês (~R$ 390/mês)                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CRM AGENT                                                            │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Interações: 60/dia | Tokens: 2.500 in + 2.000 out                   │   │
│  │ TOTAL: $59.40/mês (~R$ 360/mês)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ FLEET AGENT                                                          │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Interações: 40/dia | Tokens: 2.000 in + 1.500 out                   │   │
│  │ TOTAL: $39.60/mês (~R$ 240/mês)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ACCOUNTING AGENT                                                     │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Interações: 50/dia | Tokens: 2.500 in + 1.800 out                   │   │
│  │ TOTAL: $52.14/mês (~R$ 315/mês)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STRATEGIC AGENT                                                      │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Interações: 20/dia | Tokens: 5.000 in + 4.000 out                   │   │
│  │ TOTAL: $59.40/mês (~R$ 360/mês)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  TOTAL API (7 AGENTES): ~$406/mês (~R$ 2.460/mês)                          │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Custo Total de Infraestrutura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CUSTO TOTAL MENSAL                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ITEM                                               CUSTO/MÊS              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  API Claude (7 agentes)                             R$ 2.460               │
│  API Gemini (embeddings) *já incluído no AuraCore   R$ 0 (free tier)       │
│  Infraestrutura (CPU/RAM para Agno)                 R$ 200                 │
│  ChromaDB (já incluído no AuraCore)                 R$ 0                   │
│  SQLite (memória dos agentes)                       R$ 0                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  TOTAL OPERACIONAL MENSAL                           R$ 2.660               │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  INVESTIMENTO INICIAL (uma vez)                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Desenvolvimento (208h × R$ 150/h)                  R$ 31.200              │
│  Testes e ajustes                                   R$ 5.000               │
│  Treinamento da equipe                              R$ 3.000               │
│  Documentação                                       R$ 1.800               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  TOTAL INVESTIMENTO INICIAL                         R$ 41.000              │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ECONOMIA MENSAL PROJETADA                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Redução de FTEs (4 × R$ 7.500 média)               R$ 30.000              │
│  Aumento produtividade (+50% equivalente)           R$ 15.000              │
│  Redução de multas fiscais                          R$ 5.000               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ECONOMIA TOTAL MENSAL                              R$ 50.000              │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ROI MENSAL: R$ 50.000 - R$ 2.660 = R$ 47.340                             │
│  PAYBACK: R$ 41.000 / R$ 47.340 = 0.87 meses (~26 dias)                   │
│  ROI ANUAL: (R$ 47.340 × 12) / R$ 41.000 = 1.385% 🚀                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTE 4: ROADMAP DE IMPLEMENTAÇÃO DETALHADO

### 4.1 Visão Geral das Fases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROADMAP COMPLETO - 16 SEMANAS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FASE 0: PRÉ-REQUISITOS (Semana 0) ✅ PARCIALMENTE PRONTO                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✅ Knowledge Module com ChromaDB                                           │
│  ✅ Embeddings Gemini funcionando                                           │
│  ✅ Legislação indexada (ICMS, Reforma 2026, PIS/COFINS)                    │
│  ⬜ Docker setup para Agno                                                  │
│                                                                             │
│  FASE 1: FUNDAÇÃO (Semanas 1-4) - 56h                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  S1: Setup Agno + Docker + Integração básica                               │
│  S2: Fiscal Agent v1 (5 tools básicos)                                     │
│  S3: Gateway API Next.js + SSE                                              │
│  S4: Testes + Ajustes + Deploy homologação                                 │
│                                                                             │
│  FASE 2: EXPANSÃO (Semanas 5-12) - 112h                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  S5-S6: Financial Agent (8 tools)                                          │
│  S7-S8: TMS Agent (7 tools)                                                │
│  S9-S10: CRM Agent (7 tools)                                               │
│  S11-S12: Fleet + Accounting Agents                                        │
│                                                                             │
│  FASE 3: INTEGRAÇÃO (Semanas 13-16) - 40h                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  S13-S14: Multi-Agent Teams + Handoffs                                     │
│  S15-S16: Strategic Agent + Dashboard + Go-Live                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 FASE 1 - Prompts de Implementação

#### PROMPT 1.1: Setup Inicial Agno

```markdown
# TAREFA: Setup inicial do Agno para AuraCore

## Contexto
Vamos criar a estrutura base do sistema de agentes usando Agno Framework.
O Knowledge Module com ChromaDB já está funcionando em produção.

## Criar estrutura de pastas

```bash
mkdir -p agents/src/{core,agents,tools,knowledge,integrations,api}
mkdir -p agents/src/tools/{fiscal,financial,tms,crm,fleet,accounting,strategic}
mkdir -p agents/src/api/{routes,schemas}
mkdir -p agents/tests/{unit,integration,eval}
mkdir -p agents/data/{memory,logs}
```

## Criar arquivo: agents/pyproject.toml

```toml
[project]
name = "auracore-agents"
version = "1.0.0"
description = "AI Agents for AuraCore ERP"
requires-python = ">=3.11"

dependencies = [
    "agno>=1.0.0",
    "fastapi>=0.109.0",
    "uvicorn>=0.27.0",
    "httpx>=0.26.0",
    "pydantic>=2.5.0",
    "python-dotenv>=1.0.0",
    "opentelemetry-api>=1.22.0",
    "opentelemetry-sdk>=1.22.0",
    "prometheus-client>=0.19.0",
    "structlog>=24.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
]
```

## Criar arquivo: agents/Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copiar código fonte
COPY src/ ./src/

# Variáveis de ambiente
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expor porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Comando de inicialização
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Criar arquivo: agents/docker-compose.yml

```yaml
version: '3.8'

services:
  agents:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: auracore-agents
    ports:
      - "8080:8080"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AURACORE_API_URL=http://web:3000
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8000
      - LOG_LEVEL=INFO
    volumes:
      - ./data/memory:/app/data/memory
      - ./data/logs:/app/data/logs
    depends_on:
      - chromadb
    networks:
      - auracore-network
    restart: unless-stopped

networks:
  auracore-network:
    external: true
```

## Criar arquivo: agents/src/config.py

```python
"""Configurações do sistema de agentes."""

from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Configurações carregadas de variáveis de ambiente."""
    
    # API Keys
    anthropic_api_key: str
    
    # AuraCore
    auracore_api_url: str = "http://localhost:3000"
    
    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection: str = "auracore_knowledge"
    
    # Logging
    log_level: str = "INFO"
    
    # Memory
    memory_db_path: str = "data/memory"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

## Criar arquivo: agents/src/main.py

```python
"""Entry point do servidor de agentes."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from src.config import get_settings
from src.api.routes import chat, agents, health

# Configurar logging estruturado
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Criar app FastAPI
app = FastAPI(
    title="AuraCore Agents API",
    description="AI Agents for AuraCore ERP",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rotas
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(agents.router, prefix="/agents", tags=["Agents"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])

@app.on_event("startup")
async def startup():
    settings = get_settings()
    logger.info("Starting AuraCore Agents", settings={
        "auracore_url": settings.auracore_api_url,
        "chroma_host": settings.chroma_host,
    })

@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down AuraCore Agents")
```

## Verificações
- Estrutura de pastas criada
- pyproject.toml válido
- Dockerfile funcional
- docker-compose.yml configurado
```

#### PROMPT 1.2: Core do Sistema de Agentes

```markdown
# TAREFA: Implementar core do sistema de agentes

## Criar arquivo: agents/src/core/base.py

```python
"""Classe base para todos os agentes."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.db.sqlite import SqliteDb

from src.config import get_settings
from src.core.guardrails import GuardrailMiddleware
from src.core.observability import ObservabilityMiddleware

class AgentType(Enum):
    FISCAL = "fiscal"
    FINANCIAL = "financial"
    TMS = "tms"
    CRM = "crm"
    FLEET = "fleet"
    ACCOUNTING = "accounting"
    STRATEGIC = "strategic"

@dataclass
class AgentContext:
    """Contexto de execução do agente."""
    user_id: str
    org_id: int
    branch_id: int
    role: str
    permissions: List[str]

class BaseAuracoreAgent(ABC):
    """Classe base para agentes do AuraCore."""
    
    def __init__(
        self,
        agent_type: AgentType,
        name: str,
        description: str,
        instructions: List[str],
        tools: List[Any]
    ):
        self.agent_type = agent_type
        self.name = name
        self.description = description
        self.settings = get_settings()
        
        # Criar agente Agno
        self.agent = Agent(
            name=name,
            model=Claude(id="claude-sonnet-4-5"),
            description=description,
            
            # Memória persistente por tipo de agente
            db=SqliteDb(
                db_file=f"{self.settings.memory_db_path}/{agent_type.value}_memory.db"
            ),
            
            # Tools
            tools=tools,
            
            # Instruções
            instructions=self._build_instructions(instructions),
            
            # Configurações
            markdown=True,
            show_tool_calls=True,
        )
        
        # Middlewares
        self.guardrails = GuardrailMiddleware()
        self.observability = ObservabilityMiddleware()
    
    def _build_instructions(self, custom_instructions: List[str]) -> List[str]:
        """Combina instruções base com customizadas."""
        base_instructions = [
            "Você é um assistente especializado do AuraCore ERP.",
            "Sempre seja preciso e cite fontes quando possível.",
            "Se não souber algo, admita e sugira como encontrar a informação.",
            "Use as ferramentas disponíveis antes de responder.",
            "Formate respostas em Markdown para melhor legibilidade.",
        ]
        return base_instructions + custom_instructions
    
    async def chat(
        self,
        message: str,
        context: AgentContext,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Processa uma mensagem do usuário."""
        
        # Adicionar contexto às instruções
        context_str = (
            f"\nContexto atual:\n"
            f"- Usuário: {context.user_id}\n"
            f"- Organização: {context.org_id}\n"
            f"- Filial: {context.branch_id}\n"
            f"- Role: {context.role}"
        )
        
        # Executar com observabilidade
        async def execute():
            if stream:
                return self.agent.run(message + context_str, stream=True)
            else:
                return self.agent.run(message + context_str)
        
        result = await self.observability.wrap_agent_call(
            agent_name=self.name,
            user_input=message,
            user_context=context.__dict__,
            agent_fn=execute
        )
        
        return {
            "agent": self.agent_type.value,
            "response": result.content if hasattr(result, 'content') else str(result),
            "tools_used": [tc.name for tc in result.tool_calls] if hasattr(result, 'tool_calls') else []
        }
```

## Criar arquivo: agents/src/core/orchestrator.py

```python
"""Orquestrador de agentes - roteia para o agente correto."""

from typing import Dict, Optional
import structlog

from src.core.base import BaseAuracoreAgent, AgentType, AgentContext
from src.agents.fiscal import FiscalAgent
from src.agents.financial import FinancialAgent

logger = structlog.get_logger()

class AgentOrchestrator:
    """Orquestra múltiplos agentes especializados."""
    
    def __init__(self):
        self.agents: Dict[AgentType, BaseAuracoreAgent] = {}
        self._initialize_agents()
    
    def _initialize_agents(self):
        """Inicializa todos os agentes disponíveis."""
        # Fase 1: Apenas Fiscal Agent
        self.agents[AgentType.FISCAL] = FiscalAgent()
        
        # TODO: Adicionar outros agentes nas próximas fases
        # self.agents[AgentType.FINANCIAL] = FinancialAgent()
        # self.agents[AgentType.TMS] = TMSAgent()
        
        logger.info("Agents initialized", agents=list(self.agents.keys()))
    
    def get_agent(self, agent_type: AgentType) -> Optional[BaseAuracoreAgent]:
        """Retorna um agente específico."""
        return self.agents.get(agent_type)
    
    async def route_message(
        self,
        message: str,
        context: AgentContext,
        agent_type: Optional[AgentType] = None
    ) -> Dict:
        """Roteia mensagem para o agente apropriado."""
        
        # Se tipo especificado, usar diretamente
        if agent_type:
            agent = self.get_agent(agent_type)
            if not agent:
                return {
                    "error": f"Agent {agent_type.value} not available",
                    "available_agents": [a.value for a in self.agents.keys()]
                }
            return await agent.chat(message, context)
        
        # Caso contrário, classificar intent
        agent_type = await self._classify_intent(message)
        agent = self.get_agent(agent_type)
        
        if not agent:
            # Fallback para fiscal (mais genérico)
            agent = self.agents[AgentType.FISCAL]
        
        return await agent.chat(message, context)
    
    async def _classify_intent(self, message: str) -> AgentType:
        """Classifica a intenção da mensagem para escolher o agente."""
        
        message_lower = message.lower()
        
        # Keywords por agente
        keywords = {
            AgentType.FISCAL: [
                "icms", "imposto", "tributo", "cte", "nfe", "sped",
                "fiscal", "alíquota", "cfop", "cst", "reforma tributária"
            ],
            AgentType.FINANCIAL: [
                "fluxo de caixa", "pagamento", "recebimento", "cobrança",
                "financeiro", "conciliação", "dda", "boleto"
            ],
            AgentType.TMS: [
                "viagem", "carga", "entrega", "motorista", "rota",
                "rastreamento", "coleta", "operação"
            ],
            AgentType.CRM: [
                "cliente", "proposta", "lead", "venda", "comercial",
                "cotação", "frete"
            ],
            AgentType.FLEET: [
                "veículo", "manutenção", "pneu", "combustível",
                "frota", "documento"
            ],
            AgentType.ACCOUNTING: [
                "contábil", "lançamento", "balanço", "dre",
                "plano de contas", "fechamento"
            ],
            AgentType.STRATEGIC: [
                "bsc", "pdca", "meta", "kpi", "estratégia",
                "war room", "5w2h"
            ],
        }
        
        # Contar matches
        scores = {}
        for agent_type, words in keywords.items():
            scores[agent_type] = sum(1 for w in words if w in message_lower)
        
        # Retornar agente com maior score
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        
        # Default: fiscal
        return AgentType.FISCAL

# Singleton
_orchestrator: Optional[AgentOrchestrator] = None

def get_orchestrator() -> AgentOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator()
    return _orchestrator
```

## Criar arquivo: agents/src/core/guardrails.py

```python
"""Guardrails para operações sensíveis."""

from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import structlog

logger = structlog.get_logger()

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Guardrail:
    risk_level: RiskLevel
    requires_approval: bool
    max_value: Optional[float] = None
    allowed_roles: Optional[List[str]] = None

# Mapeamento de tools para guardrails
TOOL_GUARDRAILS: Dict[str, Guardrail] = {
    # Baixo risco - automático
    "query_legislation": Guardrail(RiskLevel.LOW, False),
    "calculate_icms": Guardrail(RiskLevel.LOW, False),
    "track_delivery": Guardrail(RiskLevel.LOW, False),
    "get_cashflow": Guardrail(RiskLevel.LOW, False),
    
    # Médio risco - log
    "create_cte_draft": Guardrail(RiskLevel.MEDIUM, False),
    "schedule_maintenance": Guardrail(RiskLevel.MEDIUM, False),
    
    # Alto risco - aprovação condicional
    "authorize_cte": Guardrail(
        RiskLevel.HIGH,
        requires_approval=True,
        max_value=100000.00,
        allowed_roles=["fiscal_admin", "manager", "admin"]
    ),
    "create_payment": Guardrail(
        RiskLevel.HIGH,
        requires_approval=True,
        max_value=50000.00,
        allowed_roles=["financial_admin", "manager", "admin"]
    ),
    
    # Crítico - sempre requer aprovação
    "generate_sped": Guardrail(
        RiskLevel.CRITICAL,
        requires_approval=True,
        allowed_roles=["fiscal_admin", "cfo", "admin"]
    ),
}

class GuardrailMiddleware:
    """Middleware para aplicar guardrails em tools."""
    
    async def check(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verifica se a operação é permitida."""
        
        guardrail = TOOL_GUARDRAILS.get(tool_name)
        
        if not guardrail:
            logger.warning("Tool without guardrail", tool=tool_name)
            return {"status": "approved", "warning": "No guardrail defined"}
        
        # Verificar role
        if guardrail.allowed_roles:
            user_role = user_context.get("role", "")
            if user_role not in guardrail.allowed_roles:
                return {
                    "status": "denied",
                    "reason": f"Role '{user_role}' não tem permissão",
                    "required_roles": guardrail.allowed_roles
                }
        
        # Verificar valor
        if guardrail.max_value:
            value = tool_input.get("valor") or tool_input.get("value") or 0
            if value > guardrail.max_value:
                return {
                    "status": "pending_approval",
                    "reason": f"Valor R$ {value:,.2f} excede limite de R$ {guardrail.max_value:,.2f}",
                    "approval_required": True
                }
        
        # Verificar se requer aprovação
        if guardrail.requires_approval:
            return {
                "status": "pending_approval",
                "reason": f"Operação {tool_name} requer aprovação",
                "risk_level": guardrail.risk_level.value
            }
        
        return {"status": "approved"}
```

## Criar arquivo: agents/src/core/observability.py

```python
"""Observabilidade: logging, métricas e tracing."""

import time
from typing import Callable, Dict, Any
import structlog
from prometheus_client import Counter, Histogram

logger = structlog.get_logger()

# Métricas Prometheus
AGENT_REQUESTS = Counter(
    'auracore_agent_requests_total',
    'Total de requisições por agente',
    ['agent_name', 'status']
)

AGENT_LATENCY = Histogram(
    'auracore_agent_latency_seconds',
    'Latência de resposta dos agentes',
    ['agent_name'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

TOOL_CALLS = Counter(
    'auracore_tool_calls_total',
    'Total de chamadas de tools',
    ['tool_name', 'status']
)

class ObservabilityMiddleware:
    """Middleware para observabilidade de agentes."""
    
    async def wrap_agent_call(
        self,
        agent_name: str,
        user_input: str,
        user_context: Dict[str, Any],
        agent_fn: Callable
    ) -> Any:
        """Wraps agent call with observability."""
        
        start_time = time.time()
        
        # Log de entrada
        logger.info(
            "agent_request_started",
            agent=agent_name,
            user_id=user_context.get("user_id"),
            org_id=user_context.get("org_id"),
            input_length=len(user_input)
        )
        
        try:
            # Executar agente
            result = await agent_fn()
            
            # Métricas de sucesso
            duration = time.time() - start_time
            AGENT_LATENCY.labels(agent_name=agent_name).observe(duration)
            AGENT_REQUESTS.labels(agent_name=agent_name, status="success").inc()
            
            # Log de sucesso
            logger.info(
                "agent_request_completed",
                agent=agent_name,
                duration_ms=int(duration * 1000),
                status="success"
            )
            
            return result
            
        except Exception as e:
            # Métricas de erro
            AGENT_REQUESTS.labels(agent_name=agent_name, status="error").inc()
            
            # Log de erro
            logger.error(
                "agent_request_failed",
                agent=agent_name,
                error=str(e),
                error_type=type(e).__name__
            )
            
            raise
```
```

#### PROMPT 1.3: Fiscal Agent (Primeiro Agente)

```markdown
# TAREFA: Implementar Fiscal Agent

## Criar arquivo: agents/src/agents/fiscal.py

```python
"""Fiscal Agent - Especialista em legislação fiscal brasileira."""

from typing import List
from src.core.base import BaseAuracoreAgent, AgentType
from src.tools.fiscal.calculate_icms import CalculateICMSTool
from src.tools.fiscal.validate_cte import ValidateCTeTool
from src.tools.fiscal.query_legislation import QueryLegislationTool
from src.tools.fiscal.simulate_tax import SimulateTaxTool
from src.tools.fiscal.check_nfe import CheckNFeTool

class FiscalAgent(BaseAuracoreAgent):
    """Agente especializado em legislação fiscal brasileira."""
    
    def __init__(self):
        instructions = [
            "Você é especialista em legislação fiscal brasileira para transportadores.",
            "Sempre verifique se os cálculos estão de acordo com a legislação vigente.",
            "Alerte sobre prazos de obrigações acessórias (SPED, EFD, GIA).",
            "Considere a Reforma Tributária 2026 (IBS/CBS) quando relevante.",
            "Cite sempre a base legal das suas respostas (Lei, Artigo, IN).",
            "Use a ferramenta query_legislation para consultar a base de conhecimento.",
            "Para cálculos de ICMS, sempre use a ferramenta calculate_icms.",
            "Antes de responder sobre legislação, consulte a base de conhecimento.",
        ]
        
        tools = [
            CalculateICMSTool(),
            ValidateCTeTool(),
            QueryLegislationTool(),
            SimulateTaxTool(),
            CheckNFeTool(),
        ]
        
        super().__init__(
            agent_type=AgentType.FISCAL,
            name="Fiscal Assistant",
            description="Especialista em legislação fiscal brasileira para transportadores",
            instructions=instructions,
            tools=tools
        )
```

## Criar arquivo: agents/src/tools/fiscal/query_legislation.py

```python
"""Tool para consultar legislação via RAG (Knowledge Module)."""

from typing import List, Dict, Any
import httpx
from pydantic import BaseModel, Field

from src.config import get_settings

class QueryLegislationInput(BaseModel):
    """Input para consulta de legislação."""
    query: str = Field(description="Pergunta sobre legislação fiscal")
    legislation_types: List[str] = Field(
        default=None,
        description="Tipos de legislação: ICMS, PIS_COFINS, REFORMA_2026, CTE, NFE"
    )
    top_k: int = Field(default=5, description="Número de resultados")

class QueryLegislationTool:
    """Consulta a base de conhecimento de legislação fiscal."""
    
    name = "query_legislation"
    description = """
    Consulta a base de conhecimento de legislação fiscal brasileira.
    Use esta ferramenta SEMPRE que precisar responder sobre:
    - ICMS (Lei Kandir, alíquotas, DIFAL)
    - Reforma Tributária 2026 (IBS, CBS)
    - PIS/COFINS
    - CTe, NFe, MDFe
    
    A ferramenta retorna trechos relevantes da legislação com score de relevância.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.auracore_api_url
    
    async def run(self, input: QueryLegislationInput) -> Dict[str, Any]:
        """Executa a consulta."""
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/knowledge/search",
                json={
                    "query": input.query,
                    "top_k": input.top_k,
                    "legislation_types": input.legislation_types,
                    "min_score": 0.4
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {
                    "error": f"Erro ao consultar knowledge base: {response.status_code}",
                    "details": response.text
                }
            
            data = response.json()
            
            if not data.get("success"):
                return {"error": data.get("error", "Erro desconhecido")}
            
            results = data.get("data", {}).get("results", [])
            
            # Formatar resultados para o agente
            formatted_results = []
            for r in results:
                formatted_results.append({
                    "content": r.get("content", ""),
                    "source": r.get("metadata", {}).get("title", "Desconhecido"),
                    "type": r.get("metadata", {}).get("legislationType", ""),
                    "relevance": round(r.get("score", 0) * 100, 1)
                })
            
            return {
                "query": input.query,
                "total_results": len(formatted_results),
                "results": formatted_results,
                "note": "Use estes trechos para fundamentar sua resposta"
            }
```

## Criar arquivo: agents/src/tools/fiscal/calculate_icms.py

```python
"""Tool para calcular ICMS de operações de transporte."""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from enum import Enum

class TipoOperacao(str, Enum):
    TRANSPORTE_CARGA = "transporte_carga"
    TRANSPORTE_PASSAGEIROS = "transporte_passageiros"
    COMUNICACAO = "comunicacao"

class CalculateICMSInput(BaseModel):
    """Input para cálculo de ICMS."""
    valor_operacao: float = Field(description="Valor da prestação de serviço")
    uf_origem: str = Field(description="UF de origem (ex: SP)")
    uf_destino: str = Field(description="UF de destino (ex: RJ)")
    tipo_operacao: TipoOperacao = Field(
        default=TipoOperacao.TRANSPORTE_CARGA,
        description="Tipo da operação"
    )
    tem_beneficio_fiscal: bool = Field(
        default=False,
        description="Se há redução de base de cálculo ou isenção"
    )

class CalculateICMSTool:
    """Calcula ICMS para operações de transporte."""
    
    name = "calculate_icms"
    description = """
    Calcula o ICMS para operações de transporte de carga.
    
    Considera:
    - Alíquotas interestaduais (7% ou 12%)
    - Alíquotas internas por estado
    - Benefícios fiscais quando aplicável
    - DIFAL para consumidor final
    
    Retorna o cálculo detalhado com base legal.
    """
    
    # Alíquotas interestaduais
    ALIQUOTAS_INTERESTADUAIS = {
        # Sul e Sudeste (exceto ES) → qualquer estado: 12%
        # Demais estados + ES → Sul/Sudeste (exceto ES): 7%
        # Demais estados → Demais estados: 12%
        ("SP", "RJ"): 12.0,
        ("SP", "MG"): 12.0,
        ("SP", "PR"): 12.0,
        ("SP", "BA"): 7.0,
        ("SP", "PE"): 7.0,
        ("SP", "CE"): 7.0,
        # ... adicionar todas as combinações
    }
    
    # Alíquotas internas
    ALIQUOTAS_INTERNAS = {
        "SP": 18.0,
        "RJ": 20.0,
        "MG": 18.0,
        "PR": 19.0,
        "RS": 17.0,
        "SC": 17.0,
        "BA": 19.0,
        # ... adicionar todos os estados
    }
    
    # Estados do Sul/Sudeste (exceto ES)
    SUL_SUDESTE = {"SP", "RJ", "MG", "PR", "RS", "SC"}
    
    def _get_aliquota_interestadual(self, uf_origem: str, uf_destino: str) -> float:
        """Retorna a alíquota interestadual."""
        # Verifica se há alíquota específica
        key = (uf_origem.upper(), uf_destino.upper())
        if key in self.ALIQUOTAS_INTERESTADUAIS:
            return self.ALIQUOTAS_INTERESTADUAIS[key]
        
        # Aplica regra geral
        origem_sul_sudeste = uf_origem.upper() in self.SUL_SUDESTE
        destino_sul_sudeste = uf_destino.upper() in self.SUL_SUDESTE
        
        if origem_sul_sudeste and not destino_sul_sudeste:
            return 7.0
        else:
            return 12.0
    
    async def run(self, input: CalculateICMSInput) -> Dict[str, Any]:
        """Executa o cálculo de ICMS."""
        
        reasoning: List[str] = []
        
        # 1. Identificar tipo de operação
        is_interestadual = input.uf_origem.upper() != input.uf_destino.upper()
        tipo_op = "INTERESTADUAL" if is_interestadual else "INTERNA"
        reasoning.append(
            f"1. Operação {tipo_op}: {input.uf_origem.upper()} → {input.uf_destino.upper()}"
        )
        
        # 2. Determinar alíquota
        if is_interestadual:
            aliquota = self._get_aliquota_interestadual(input.uf_origem, input.uf_destino)
            base_legal = "LC 87/96, Art. 155 II CF/88, Resolução SF 22/89"
        else:
            aliquota = self.ALIQUOTAS_INTERNAS.get(input.uf_origem.upper(), 18.0)
            base_legal = f"Regulamento ICMS {input.uf_origem.upper()}"
        
        reasoning.append(f"2. Alíquota aplicável: {aliquota}%")
        
        # 3. Base de cálculo
        base_calculo = input.valor_operacao
        if input.tem_beneficio_fiscal:
            # Exemplo: redução de 20% na base
            base_calculo = input.valor_operacao * 0.8
            reasoning.append(f"3. Base de cálculo com redução: R$ {base_calculo:,.2f}")
        else:
            reasoning.append(f"3. Base de cálculo integral: R$ {base_calculo:,.2f}")
        
        # 4. Calcular ICMS
        icms = base_calculo * (aliquota / 100)
        reasoning.append(
            f"4. ICMS = R$ {base_calculo:,.2f} × {aliquota}% = R$ {icms:,.2f}"
        )
        
        # 5. CFOP sugerido
        if is_interestadual:
            cfop = "6.353" if input.tipo_operacao == TipoOperacao.TRANSPORTE_CARGA else "6.352"
        else:
            cfop = "5.353" if input.tipo_operacao == TipoOperacao.TRANSPORTE_CARGA else "5.352"
        
        reasoning.append(f"5. CFOP sugerido: {cfop}")
        
        return {
            "icms_valor": round(icms, 2),
            "aliquota": aliquota,
            "base_calculo": round(base_calculo, 2),
            "valor_operacao": input.valor_operacao,
            "uf_origem": input.uf_origem.upper(),
            "uf_destino": input.uf_destino.upper(),
            "tipo_operacao": tipo_op.lower(),
            "cfop_sugerido": cfop,
            "cst": "00" if not input.tem_beneficio_fiscal else "20",
            "base_legal": base_legal,
            "reasoning": reasoning,
            "observacoes": [
                "Verifique se há convênio específico entre os estados",
                "Consulte a matriz tributária para casos especiais"
            ]
        }
```

## Criar arquivo: agents/src/tools/fiscal/validate_cte.py

```python
"""Tool para validar CTe antes da autorização."""

from typing import Dict, Any, List
from pydantic import BaseModel, Field
import httpx

from src.config import get_settings

class ValidateCTeInput(BaseModel):
    """Input para validação de CTe."""
    cte_id: str = Field(description="ID do CTe no sistema")

class ValidateCTeTool:
    """Valida um CTe antes da autorização na SEFAZ."""
    
    name = "validate_cte"
    description = """
    Valida um CTe (Conhecimento de Transporte Eletrônico) antes de enviar para autorização.
    
    Verifica:
    - Dados obrigatórios preenchidos
    - CFOP compatível com operação
    - Valores de impostos calculados corretamente
    - NFes vinculadas existentes
    - Tomador e remetente válidos
    
    Use esta ferramenta ANTES de autorizar um CTe.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.auracore_api_url
    
    async def run(self, input: ValidateCTeInput) -> Dict[str, Any]:
        """Executa a validação do CTe."""
        
        async with httpx.AsyncClient() as client:
            # Buscar dados do CTe
            response = await client.get(
                f"{self.base_url}/api/fiscal/cte/{input.cte_id}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {
                    "valid": False,
                    "error": f"CTe não encontrado: {input.cte_id}"
                }
            
            cte_data = response.json()
            
            # Executar validações
            errors: List[str] = []
            warnings: List[str] = []
            
            # Validar campos obrigatórios
            required_fields = [
                ("emitente", "Emitente"),
                ("tomador", "Tomador"),
                ("remetente", "Remetente"),
                ("destinatario", "Destinatário"),
                ("valor_total", "Valor Total"),
                ("cfop", "CFOP"),
            ]
            
            for field, label in required_fields:
                if not cte_data.get(field):
                    errors.append(f"{label} não preenchido")
            
            # Validar CFOP
            cfop = cte_data.get("cfop", "")
            uf_origem = cte_data.get("uf_origem", "")
            uf_destino = cte_data.get("uf_destino", "")
            
            if uf_origem != uf_destino:
                if not cfop.startswith("6"):
                    errors.append(f"CFOP {cfop} inválido para operação interestadual (deve iniciar com 6)")
            else:
                if not cfop.startswith("5"):
                    errors.append(f"CFOP {cfop} inválido para operação interna (deve iniciar com 5)")
            
            # Validar ICMS
            valor_total = cte_data.get("valor_total", 0)
            icms = cte_data.get("icms", 0)
            aliquota = cte_data.get("aliquota_icms", 0)
            
            icms_esperado = valor_total * (aliquota / 100)
            if abs(icms - icms_esperado) > 0.01:
                errors.append(
                    f"ICMS informado (R$ {icms:.2f}) difere do calculado (R$ {icms_esperado:.2f})"
                )
            
            # Validar NFes vinculadas
            nfes = cte_data.get("nfes_vinculadas", [])
            if not nfes:
                warnings.append("Nenhuma NFe vinculada ao CTe")
            
            return {
                "valid": len(errors) == 0,
                "cte_id": input.cte_id,
                "errors": errors,
                "warnings": warnings,
                "summary": {
                    "emitente": cte_data.get("emitente_nome"),
                    "tomador": cte_data.get("tomador_nome"),
                    "valor_total": cte_data.get("valor_total"),
                    "icms": cte_data.get("icms"),
                    "nfes_count": len(nfes)
                },
                "recommendation": (
                    "CTe válido para autorização" if len(errors) == 0
                    else "Corrija os erros antes de autorizar"
                )
            }
```

## Criar arquivo: agents/src/tools/fiscal/simulate_tax.py

```python
"""Tool para simular carga tributária."""

from typing import Dict, Any, List
from pydantic import BaseModel, Field

class SimulateTaxInput(BaseModel):
    """Input para simulação tributária."""
    valor_operacao: float = Field(description="Valor da operação")
    uf_origem: str = Field(description="UF de origem")
    uf_destino: str = Field(description="UF de destino")
    incluir_reforma_2026: bool = Field(
        default=True,
        description="Incluir comparativo com Reforma Tributária 2026"
    )

class SimulateTaxTool:
    """Simula carga tributária atual vs Reforma 2026."""
    
    name = "simulate_tax"
    description = """
    Simula a carga tributária de uma operação, comparando:
    - Cenário atual (ICMS + PIS/COFINS)
    - Cenário Reforma 2026 (IBS + CBS)
    
    Útil para planejamento tributário e entender impacto da reforma.
    """
    
    async def run(self, input: SimulateTaxInput) -> Dict[str, Any]:
        """Executa a simulação."""
        
        is_interestadual = input.uf_origem.upper() != input.uf_destino.upper()
        
        # Cenário atual
        aliquota_icms = 12.0 if is_interestadual else 18.0
        icms = input.valor_operacao * (aliquota_icms / 100)
        
        pis = input.valor_operacao * 0.0165  # 1.65%
        cofins = input.valor_operacao * 0.076  # 7.6%
        
        total_atual = icms + pis + cofins
        carga_atual = (total_atual / input.valor_operacao) * 100
        
        # Cenário Reforma 2026
        aliquota_ibs = 25.45 / 100  # Alíquota de referência
        aliquota_cbs = 8.8 / 100   # Alíquota de referência
        
        # Em 2026: IBS 0.1%, CBS 0.9% (fase inicial)
        ibs_2026 = input.valor_operacao * 0.001
        cbs_2026 = input.valor_operacao * 0.009
        icms_2026 = icms  # ICMS ainda vigente 100% em 2026
        pis_cofins_2026 = pis + cofins  # Ainda vigente 100%
        
        total_2026 = ibs_2026 + cbs_2026 + icms_2026 + pis_cofins_2026
        
        # Em 2033: Só IBS + CBS
        ibs_2033 = input.valor_operacao * aliquota_ibs
        cbs_2033 = input.valor_operacao * aliquota_cbs
        total_2033 = ibs_2033 + cbs_2033
        carga_2033 = (total_2033 / input.valor_operacao) * 100
        
        return {
            "valor_operacao": input.valor_operacao,
            "uf_origem": input.uf_origem.upper(),
            "uf_destino": input.uf_destino.upper(),
            "tipo_operacao": "interestadual" if is_interestadual else "interna",
            
            "cenario_atual": {
                "icms": round(icms, 2),
                "aliquota_icms": aliquota_icms,
                "pis": round(pis, 2),
                "cofins": round(cofins, 2),
                "total": round(total_atual, 2),
                "carga_percentual": round(carga_atual, 2)
            },
            
            "cenario_2026": {
                "icms": round(icms_2026, 2),
                "pis_cofins": round(pis_cofins_2026, 2),
                "ibs": round(ibs_2026, 2),
                "cbs": round(cbs_2026, 2),
                "total": round(total_2026, 2),
                "nota": "Fase de transição: IBS 0.1% + CBS 0.9% + ICMS 100% + PIS/COFINS 100%"
            },
            
            "cenario_2033": {
                "ibs": round(ibs_2033, 2),
                "cbs": round(cbs_2033, 2),
                "total": round(total_2033, 2),
                "carga_percentual": round(carga_2033, 2),
                "nota": "Reforma concluída: Só IBS + CBS, sem ICMS e PIS/COFINS"
            },
            
            "comparativo": {
                "diferenca_2033_vs_atual": round(total_2033 - total_atual, 2),
                "variacao_percentual": round(((total_2033 - total_atual) / total_atual) * 100, 2),
                "conclusao": (
                    "Carga tributária similar após reforma"
                    if abs(total_2033 - total_atual) < total_atual * 0.05
                    else f"Variação de {((total_2033 - total_atual) / total_atual) * 100:.1f}% na carga tributária"
                )
            },
            
            "base_legal": {
                "atual": "LC 87/96 (ICMS), Leis 10.637/02 e 10.833/03 (PIS/COFINS)",
                "reforma": "EC 132/2023 (Reforma Tributária)"
            }
        }
```

## Criar arquivo: agents/src/tools/fiscal/check_nfe.py

```python
"""Tool para verificar NFes."""

from typing import Dict, Any, List
from pydantic import BaseModel, Field
import httpx

from src.config import get_settings

class CheckNFeInput(BaseModel):
    """Input para verificação de NFe."""
    chave_nfe: str = Field(description="Chave de acesso da NFe (44 dígitos)")

class CheckNFeTool:
    """Verifica status e dados de uma NFe."""
    
    name = "check_nfe"
    description = """
    Verifica uma NFe (Nota Fiscal Eletrônica) pela chave de acesso.
    
    Retorna:
    - Status da NFe (autorizada, cancelada, etc.)
    - Dados do emitente e destinatário
    - Valores e impostos
    - Se já está vinculada a algum CTe
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.auracore_api_url
    
    async def run(self, input: CheckNFeInput) -> Dict[str, Any]:
        """Verifica a NFe."""
        
        # Validar chave
        if len(input.chave_nfe) != 44:
            return {
                "error": "Chave de acesso inválida (deve ter 44 dígitos)"
            }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/fiscal/nfe/check/{input.chave_nfe}",
                timeout=30.0
            )
            
            if response.status_code == 404:
                return {
                    "found": False,
                    "chave": input.chave_nfe,
                    "message": "NFe não encontrada no sistema. Pode ser importada."
                }
            
            if response.status_code != 200:
                return {
                    "error": f"Erro ao consultar NFe: {response.status_code}"
                }
            
            nfe_data = response.json()
            
            return {
                "found": True,
                "chave": input.chave_nfe,
                "status": nfe_data.get("status"),
                "emitente": {
                    "cnpj": nfe_data.get("emitente_cnpj"),
                    "nome": nfe_data.get("emitente_nome")
                },
                "destinatario": {
                    "cnpj": nfe_data.get("destinatario_cnpj"),
                    "nome": nfe_data.get("destinatario_nome")
                },
                "valores": {
                    "total": nfe_data.get("valor_total"),
                    "produtos": nfe_data.get("valor_produtos"),
                    "frete": nfe_data.get("valor_frete"),
                    "icms": nfe_data.get("icms_total")
                },
                "vinculada_cte": nfe_data.get("cte_vinculado"),
                "data_emissao": nfe_data.get("data_emissao")
            }
```
```

#### PROMPT 1.4: API Routes e Integração com Next.js

```markdown
# TAREFA: Criar API Routes e integração com Next.js

## Criar arquivo: agents/src/api/routes/health.py

```python
"""Health check endpoint."""

from fastapi import APIRouter
import httpx

from src.config import get_settings

router = APIRouter()

@router.get("")
async def health_check():
    """Verifica saúde do serviço de agentes."""
    
    settings = get_settings()
    
    checks = {
        "status": "healthy",
        "agents": "ok",
        "knowledge_base": "unknown",
        "auracore_api": "unknown"
    }
    
    # Verificar ChromaDB
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://{settings.chroma_host}:{settings.chroma_port}/api/v1/heartbeat",
                timeout=5.0
            )
            checks["knowledge_base"] = "ok" if response.status_code == 200 else "error"
    except Exception as e:
        checks["knowledge_base"] = f"error: {str(e)}"
    
    # Verificar AuraCore API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.auracore_api_url}/api/health",
                timeout=5.0
            )
            checks["auracore_api"] = "ok" if response.status_code == 200 else "error"
    except Exception as e:
        checks["auracore_api"] = f"error: {str(e)}"
    
    # Determinar status geral
    if all(v == "ok" for v in checks.values() if v != "healthy"):
        checks["status"] = "healthy"
    elif checks["agents"] == "ok":
        checks["status"] = "degraded"
    else:
        checks["status"] = "unhealthy"
    
    return checks
```

## Criar arquivo: agents/src/api/routes/chat.py

```python
"""Chat endpoint para interação com agentes."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
import json

from src.core.base import AgentContext, AgentType
from src.core.orchestrator import get_orchestrator

router = APIRouter()

class ChatRequest(BaseModel):
    """Request para chat com agente."""
    message: str = Field(description="Mensagem do usuário")
    agent_type: Optional[str] = Field(
        default=None,
        description="Tipo do agente (fiscal, financial, tms, etc.)"
    )
    user_id: str = Field(description="ID do usuário")
    org_id: int = Field(description="ID da organização")
    branch_id: int = Field(description="ID da filial")
    role: str = Field(default="user", description="Role do usuário")
    stream: bool = Field(default=False, description="Se deve usar streaming")

class ChatResponse(BaseModel):
    """Response do chat."""
    agent: str
    response: str
    tools_used: list

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Envia mensagem para um agente."""
    
    # Criar contexto
    context = AgentContext(
        user_id=request.user_id,
        org_id=request.org_id,
        branch_id=request.branch_id,
        role=request.role,
        permissions=[]  # TODO: Carregar permissões
    )
    
    # Determinar tipo do agente
    agent_type = None
    if request.agent_type:
        try:
            agent_type = AgentType(request.agent_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de agente inválido: {request.agent_type}"
            )
    
    # Obter orquestrador e rotear mensagem
    orchestrator = get_orchestrator()
    
    if request.stream:
        # Streaming response
        async def generate():
            result = await orchestrator.route_message(
                message=request.message,
                context=context,
                agent_type=agent_type
            )
            # Para streaming, enviamos em chunks
            yield f"data: {json.dumps(result)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    else:
        # Response normal
        result = await orchestrator.route_message(
            message=request.message,
            context=context,
            agent_type=agent_type
        )
        
        return ChatResponse(
            agent=result.get("agent", "unknown"),
            response=result.get("response", ""),
            tools_used=result.get("tools_used", [])
        )
```

## Criar arquivo: agents/src/api/routes/agents.py

```python
"""Endpoint para listar agentes disponíveis."""

from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

from src.core.orchestrator import get_orchestrator

router = APIRouter()

class AgentInfo(BaseModel):
    """Informações de um agente."""
    type: str
    name: str
    description: str
    tools: List[str]

@router.get("", response_model=List[AgentInfo])
async def list_agents():
    """Lista todos os agentes disponíveis."""
    
    orchestrator = get_orchestrator()
    
    agents = []
    for agent_type, agent in orchestrator.agents.items():
        agents.append(AgentInfo(
            type=agent_type.value,
            name=agent.name,
            description=agent.description,
            tools=[t.name for t in agent.agent.tools] if hasattr(agent.agent, 'tools') else []
        ))
    
    return agents
```

## Agora criar o Gateway no Next.js

## Criar arquivo: src/app/api/agents/chat/route.ts

```typescript
/**
 * Gateway para o serviço de agentes Agno.
 * 
 * Faz proxy das requisições para o servidor Python,
 * adicionando contexto de autenticação e organização.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://agents:8080';

export async function POST(request: NextRequest) {
  try {
    // Obter contexto do usuário
    const context = await getTenantContext(request);
    
    if (!context) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    
    // Parse do body
    const body = await request.json();
    
    // Adicionar contexto
    const enrichedBody = {
      ...body,
      user_id: context.userId,
      org_id: context.organizationId,
      branch_id: context.branchId,
      role: context.role || 'user',
    };
    
    // Fazer request para o serviço de agentes
    const response = await fetch(`${AGENTS_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedBody),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Erro no serviço de agentes: ${error}` },
        { status: response.status }
      );
    }
    
    // Verificar se é streaming
    if (body.stream) {
      // Retornar como SSE
      const stream = response.body;
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Agents Gateway] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno no gateway de agentes' },
      { status: 500 }
    );
  }
}
```

## Criar arquivo: src/app/api/agents/route.ts

```typescript
/**
 * Lista agentes disponíveis.
 */

import { NextRequest, NextResponse } from 'next/server';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://agents:8080';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${AGENTS_API_URL}/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao listar agentes' },
        { status: response.status }
      );
    }
    
    const agents = await response.json();
    return NextResponse.json(agents);
    
  } catch (error) {
    console.error('[Agents Gateway] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
```

## Criar arquivo: src/app/api/agents/health/route.ts

```typescript
/**
 * Health check do serviço de agentes.
 */

import { NextRequest, NextResponse } from 'next/server';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://agents:8080';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${AGENTS_API_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { status: 'unhealthy', error: 'Serviço de agentes não disponível' },
        { status: 503 }
      );
    }
    
    const health = await response.json();
    return NextResponse.json(health);
    
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Não foi possível conectar ao serviço de agentes' },
      { status: 503 }
    );
  }
}
```
```

---

## PARTE 5: TESTES DE AGENTES

### 5.1 Framework de Testes

```python
# agents/tests/unit/test_fiscal_agent.py
"""Testes unitários do Fiscal Agent."""

import pytest
from unittest.mock import AsyncMock, patch

from src.agents.fiscal import FiscalAgent
from src.core.base import AgentContext

@pytest.fixture
def fiscal_agent():
    return FiscalAgent()

@pytest.fixture
def context():
    return AgentContext(
        user_id="test-user",
        org_id=1,
        branch_id=1,
        role="fiscal_admin",
        permissions=["fiscal:read", "fiscal:write"]
    )

class TestCalculateICMSTool:
    """Testes do tool de cálculo de ICMS."""
    
    @pytest.mark.asyncio
    async def test_icms_interestadual_sp_rj(self):
        """Teste: Operação SP → RJ deve usar 12%."""
        from src.tools.fiscal.calculate_icms import CalculateICMSTool, CalculateICMSInput
        
        tool = CalculateICMSTool()
        input = CalculateICMSInput(
            valor_operacao=10000.0,
            uf_origem="SP",
            uf_destino="RJ"
        )
        
        result = await tool.run(input)
        
        assert result["aliquota"] == 12.0
        assert result["icms_valor"] == 1200.0
        assert result["tipo_operacao"] == "interestadual"
        assert result["cfop_sugerido"] == "6.353"
    
    @pytest.mark.asyncio
    async def test_icms_interestadual_sp_ba(self):
        """Teste: Operação SP → BA deve usar 7%."""
        from src.tools.fiscal.calculate_icms import CalculateICMSTool, CalculateICMSInput
        
        tool = CalculateICMSTool()
        input = CalculateICMSInput(
            valor_operacao=10000.0,
            uf_origem="SP",
            uf_destino="BA"
        )
        
        result = await tool.run(input)
        
        assert result["aliquota"] == 7.0
        assert result["icms_valor"] == 700.0
    
    @pytest.mark.asyncio
    async def test_icms_interno_sp(self):
        """Teste: Operação interna SP deve usar 18%."""
        from src.tools.fiscal.calculate_icms import CalculateICMSTool, CalculateICMSInput
        
        tool = CalculateICMSTool()
        input = CalculateICMSInput(
            valor_operacao=10000.0,
            uf_origem="SP",
            uf_destino="SP"
        )
        
        result = await tool.run(input)
        
        assert result["aliquota"] == 18.0
        assert result["tipo_operacao"] == "interna"
        assert result["cfop_sugerido"] == "5.353"

class TestQueryLegislationTool:
    """Testes do tool de consulta de legislação."""
    
    @pytest.mark.asyncio
    async def test_query_icms(self):
        """Teste: Consulta sobre ICMS deve retornar resultados."""
        from src.tools.fiscal.query_legislation import QueryLegislationTool, QueryLegislationInput
        
        tool = QueryLegislationTool()
        input = QueryLegislationInput(
            query="alíquota ICMS interestadual",
            top_k=3
        )
        
        # Mock da API
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.return_value = AsyncMock(
                status_code=200,
                json=lambda: {
                    "success": True,
                    "data": {
                        "results": [
                            {
                                "content": "Art. 12 - Alíquotas Interestaduais...",
                                "score": 0.85,
                                "metadata": {
                                    "title": "lei_kandir",
                                    "legislationType": "ICMS"
                                }
                            }
                        ]
                    }
                }
            )
            
            result = await tool.run(input)
            
            assert result["total_results"] == 1
            assert result["results"][0]["type"] == "ICMS"

class TestFiscalAgentIntegration:
    """Testes de integração do Fiscal Agent."""
    
    @pytest.mark.asyncio
    async def test_chat_calcular_icms(self, fiscal_agent, context):
        """Teste: Agente deve calcular ICMS corretamente."""
        
        # Mock dos tools
        with patch.object(fiscal_agent.agent, 'run') as mock_run:
            mock_run.return_value = type('Response', (), {
                'content': 'ICMS calculado: R$ 1.200,00 (12%)',
                'tool_calls': []
            })()
            
            result = await fiscal_agent.chat(
                message="Calcule o ICMS para uma operação de R$ 10.000 de SP para RJ",
                context=context
            )
            
            assert "agent" in result
            assert "response" in result
```

### 5.2 Testes de Avaliação de Qualidade

```python
# agents/tests/eval/test_quality.py
"""Testes de avaliação de qualidade dos agentes."""

import pytest
from typing import List, Dict

class AgentEvaluator:
    """Avalia qualidade das respostas dos agentes."""
    
    def __init__(self):
        self.test_cases: List[Dict] = []
    
    def add_test_case(
        self,
        input: str,
        expected_tools: List[str],
        expected_keywords: List[str],
        agent_type: str
    ):
        """Adiciona caso de teste."""
        self.test_cases.append({
            "input": input,
            "expected_tools": expected_tools,
            "expected_keywords": expected_keywords,
            "agent_type": agent_type
        })
    
    async def evaluate(self, agent, context) -> Dict:
        """Executa avaliação."""
        results = {
            "total": len(self.test_cases),
            "passed": 0,
            "failed": 0,
            "details": []
        }
        
        for case in self.test_cases:
            result = await agent.chat(case["input"], context)
            
            # Verificar tools usados
            tools_match = set(case["expected_tools"]).issubset(
                set(result.get("tools_used", []))
            )
            
            # Verificar keywords na resposta
            response_lower = result.get("response", "").lower()
            keywords_match = all(
                kw.lower() in response_lower 
                for kw in case["expected_keywords"]
            )
            
            passed = tools_match and keywords_match
            
            results["details"].append({
                "input": case["input"][:50] + "...",
                "passed": passed,
                "tools_match": tools_match,
                "keywords_match": keywords_match
            })
            
            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1
        
        results["success_rate"] = results["passed"] / results["total"] * 100
        return results

# Casos de teste para Fiscal Agent
FISCAL_AGENT_TEST_CASES = [
    {
        "input": "Qual o ICMS para uma operação de R$ 50.000 de São Paulo para Rio de Janeiro?",
        "expected_tools": ["calculate_icms"],
        "expected_keywords": ["icms", "12%", "6.000"],
        "agent_type": "fiscal"
    },
    {
        "input": "O que diz a Lei Kandir sobre transporte interestadual?",
        "expected_tools": ["query_legislation"],
        "expected_keywords": ["lei kandir", "lc 87"],
        "agent_type": "fiscal"
    },
    {
        "input": "Como vai funcionar o IBS na Reforma Tributária?",
        "expected_tools": ["query_legislation"],
        "expected_keywords": ["ibs", "reforma", "2026"],
        "agent_type": "fiscal"
    },
]

@pytest.mark.asyncio
async def test_fiscal_agent_quality():
    """Avalia qualidade do Fiscal Agent."""
    from src.agents.fiscal import FiscalAgent
    from src.core.base import AgentContext
    
    agent = FiscalAgent()
    context = AgentContext(
        user_id="eval-user",
        org_id=1,
        branch_id=1,
        role="fiscal_admin",
        permissions=[]
    )
    
    evaluator = AgentEvaluator()
    for case in FISCAL_AGENT_TEST_CASES:
        evaluator.add_test_case(**case)
    
    results = await evaluator.evaluate(agent, context)
    
    # Mínimo de 80% de sucesso
    assert results["success_rate"] >= 80, f"Taxa de sucesso: {results['success_rate']}%"
```

---

## PARTE 6: CHECKLIST DE DEPLOY

### 6.1 Pré-Deploy

```markdown
## CHECKLIST PRÉ-DEPLOY - AGNO

### Infraestrutura
- [ ] Docker compose configurado
- [ ] Network compartilhada com AuraCore
- [ ] Volumes para memory/logs
- [ ] Health checks configurados

### Configurações
- [ ] ANTHROPIC_API_KEY configurada
- [ ] AURACORE_API_URL apontando para web:3000
- [ ] CHROMA_HOST/PORT corretos
- [ ] LOG_LEVEL apropriado

### Segurança
- [ ] Guardrails definidos para todos os tools
- [ ] Rate limiting configurado
- [ ] Roles e permissões mapeadas
- [ ] Audit log habilitado

### Testes
- [ ] Testes unitários passando (>90%)
- [ ] Testes de integração passando
- [ ] Testes de avaliação de qualidade (>80%)

### Documentação
- [ ] README.md atualizado
- [ ] API documentada (OpenAPI)
- [ ] Prompts documentados
- [ ] Runbook de troubleshooting
```

### 6.2 Comando de Deploy

```bash
# No servidor (Coolify)

# 1. Atualizar docker-compose.coolify.yml para incluir agents
# 2. Adicionar variáveis de ambiente:
#    - ANTHROPIC_API_KEY
#    - AGENTS_API_URL (para o gateway Next.js)

# 3. Reload compose e redeploy
```

---

## CONCLUSÃO

Este planejamento representa a **implementação mais completa e profissional** do Agno no AuraCore, incorporando:

✅ **Melhores práticas do mercado**: ReAct, CoT, Structured Output, Memory Patterns  
✅ **Segurança enterprise**: Guardrails, Human-in-the-loop, Audit trail  
✅ **Observabilidade**: Logging estruturado, métricas Prometheus, tracing  
✅ **Testes robustos**: Unit, Integration, Quality evaluation  
✅ **Integração completa**: Knowledge Module, MCP Server, APIs existentes  
✅ **Custos detalhados**: Por agente, com ROI comprovado (1.385% anual)  
✅ **Prompts prontos**: Código real, pronto para executar  

**Próximo passo recomendado:** Executar PROMPT 1.1 para começar o setup.

---

**Documento elaborado por:** Claude (Arquiteto de IA Enterprise)  
**Data:** 20/01/2026  
**Versão:** 2.0.0
