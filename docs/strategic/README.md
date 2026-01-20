# 🎯 AuraCore Strategic Module

Sistema de Gestão Estratégica Empresarial para o AuraCore ERP.

## Visão Geral

O módulo Strategic oferece ferramentas completas para gestão estratégica empresarial, incluindo:

- **Dashboard Customizável** - Widgets drag-and-drop para visualização personalizada
- **KPIs** - Indicadores-chave de performance com Balanced Scorecard (BSC)
- **Planos de Ação** - Metodologia 5W2H para execução estratégica
- **PDCA** - Ciclos de melhoria contínua (Plan-Do-Check-Act)
- **War Room** - Centro de comando para monitoramento em tempo real
- **Gamificação** - Sistema de badges e conquistas para engajamento
- **Relatórios Automáticos** - Geração e agendamento de relatórios
- **Integrações** - Slack, Microsoft Teams, Webhooks

## Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 15.x | Framework React (App Router) |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Framer Motion | 10.x | Animações |
| AG Grid | 31.x | Tabelas avançadas |
| Recharts | 2.x | Gráficos e visualizações |
| React Grid Layout | 1.x | Dashboard drag-and-drop |
| TanStack Virtual | 3.x | Virtualização de listas |
| Drizzle ORM | - | Acesso ao banco de dados |

## Arquitetura

O módulo segue arquitetura **DDD (Domain-Driven Design)** com **Hexagonal Architecture**:

```
src/
├── app/(dashboard)/strategic/    # Páginas (App Router)
│   ├── dashboard/                # Dashboard principal
│   ├── kpis/                     # Gestão de KPIs
│   ├── action-plans/             # Planos de ação 5W2H
│   ├── pdca/                     # Ciclos PDCA
│   ├── reports/                  # Relatórios
│   └── integrations/             # Configuração de integrações
├── components/strategic/         # Componentes React
│   ├── widgets/                  # Widgets do dashboard
│   ├── DashboardGrid.tsx         # Grid drag-and-drop
│   ├── KpiCard.tsx               # Card de KPI
│   └── ...                       # Outros componentes
├── hooks/                        # Hooks customizados
│   ├── useIntersectionObserver.ts
│   ├── useInfiniteScroll.ts
│   └── useDebouncedValue.ts
├── modules/strategic/            # Camadas DDD
│   ├── domain/                   # Entidades, VOs, Services
│   ├── application/              # Commands, Queries
│   └── infrastructure/           # Repositories, Mappers
├── contexts/                     # React Contexts
└── lib/cache/                    # Cache layer
    └── strategic-cache.ts
```

## Quick Start

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Acessar módulo Strategic
http://localhost:3000/strategic/dashboard
```

## Funcionalidades Principais

### 1. Dashboard Customizável

- Widgets arrastaveis com React Grid Layout
- Persistência de layout por usuário
- Widgets disponíveis:
  - Health Score (saúde estratégica)
  - Alertas críticos
  - Resumo de KPIs por perspectiva BSC
  - Gráfico de tendência
  - Top ações pendentes
  - Insight Aurora AI

### 2. KPIs (Balanced Scorecard)

- 4 perspectivas BSC: Financeira, Cliente, Processos, Aprendizado
- Metas e valores atuais
- Tendência (up/down/stable)
- Status automático (critical/warning/on-track/achieved)
- Histórico de medições

### 3. Planos de Ação 5W2H

- What (O que)
- Why (Por que)
- Where (Onde)
- When (Quando)
- Who (Quem)
- How (Como)
- How much (Quanto custa)

### 4. PDCA

- Plan: Planejamento da melhoria
- Do: Execução das ações
- Check: Verificação dos resultados
- Act: Padronização ou correção

## Links

- [Arquitetura](./architecture.md) - Detalhes da arquitetura DDD/Hexagonal
- [Componentes](./components.md) - Documentação dos componentes React
- [API Reference](./api-reference.md) - Endpoints da API
- [Deployment](./deployment.md) - Guia de deploy

## Contribuição

1. Seguir padrões DDD do projeto
2. Consultar contratos MCP antes de implementar
3. Adicionar testes para novas funcionalidades
4. Documentar componentes com Storybook
