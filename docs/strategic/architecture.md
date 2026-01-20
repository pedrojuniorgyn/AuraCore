# 🏗️ Arquitetura do Módulo Strategic

## Visão Geral

O módulo Strategic segue arquitetura **DDD (Domain-Driven Design)** com **Hexagonal Architecture** (Ports and Adapters).

## Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │    API Routes       │  │
│  │ (App Router)│  │   (React)   │  │ (Next.js Route      │  │
│  │             │  │             │  │  Handlers)          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │      Commands       │  │          Queries            │   │
│  │  (Write Operations) │  │     (Read Operations)       │   │
│  │                     │  │                             │   │
│  │ - CreateKpiCommand  │  │ - GetDashboardDataQuery     │   │
│  │ - UpdateKpiCommand  │  │ - ListKpisQuery             │   │
│  │ - CreateActionPlan  │  │ - ListActionPlansQuery      │   │
│  └──────────┬──────────┘  └─────────────┬───────────────┘   │
└─────────────┼───────────────────────────┼───────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Entities   │  │Value Objects│  │  Domain Services    │  │
│  │             │  │             │  │                     │  │
│  │ - Kpi       │  │ - BscPersp  │  │ - HealthCalculator  │  │
│  │ - ActionPlan│  │ - KpiValue  │  │ - TrendAnalyzer     │  │
│  │ - Goal      │  │ - Percentage│  │ - AlertDetector     │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 PORTS (Interfaces)                   │    │
│  │  Input Ports          │      Output Ports           │    │
│  │  (Use Cases)          │      (Repositories)         │    │
│  └───────────────────────┴─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │    Repositories     │  │        Mappers              │   │
│  │    (Drizzle ORM)    │  │   (Domain ↔ Persistence)    │   │
│  │                     │  │                             │   │
│  │ - DrizzleKpiRepo    │  │ - KpiMapper                 │   │
│  │ - DrizzleActionRepo │  │ - ActionPlanMapper          │   │
│  └──────────┬──────────┘  └─────────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│                    SQL Server 2022                           │
└─────────────────────────────────────────────────────────────┘
```

## Princípios Arquiteturais

### 1. Dependency Rule (ARCH-001 a ARCH-006)

As dependências sempre apontam para dentro (em direção ao Domain):

- ❌ Domain NÃO importa de Application
- ❌ Domain NÃO importa de Infrastructure
- ❌ Domain NÃO importa bibliotecas externas (drizzle, axios)
- ✅ Application importa de Domain
- ✅ Infrastructure importa de Domain e Application

### 2. Multi-Tenancy Obrigatório

- Todas queries DEVEM filtrar por `organizationId` + `branchId`
- Índice composto obrigatório em todas as tabelas
- `branchId` NUNCA é opcional em filters

### 3. Result Pattern

- Operações que podem falhar retornam `Result<T, Error>`
- NUNCA fazer throw para erros de negócio
- Sempre verificar `Result.isFail()` antes de acessar `.value`

```typescript
const result = await kpiRepository.findById(id, orgId, branchId);
if (Result.isFail(result)) {
  return NextResponse.json({ error: result.error }, { status: 404 });
}
const kpi = result.value;
```

### 4. Soft Delete

- Todas entidades têm campo `deletedAt`
- Queries filtram `WHERE deleted_at IS NULL`
- Delete lógico, nunca físico

## Estrutura de Pastas

```
src/modules/strategic/
├── domain/
│   ├── entities/
│   │   ├── Kpi.ts                    # Entidade KPI
│   │   ├── ActionPlan.ts             # Plano de ação 5W2H
│   │   ├── Goal.ts                   # Objetivo estratégico
│   │   └── PdcaCycle.ts              # Ciclo PDCA
│   ├── value-objects/
│   │   ├── BscPerspective.ts         # Perspectiva BSC
│   │   ├── KpiValue.ts               # Valor de medição
│   │   └── Percentage.ts             # Percentual validado
│   ├── services/
│   │   ├── HealthScoreCalculator.ts  # Cálculo de health score
│   │   ├── KpiTrendAnalyzer.ts       # Análise de tendência
│   │   └── AlertDetector.ts          # Detecção de alertas
│   ├── events/
│   │   ├── KpiUpdatedEvent.ts
│   │   └── ActionPlanCompletedEvent.ts
│   └── ports/
│       ├── input/                    # Use Cases (interfaces)
│       │   ├── ICreateKpi.ts
│       │   └── IUpdateKpi.ts
│       └── output/                   # Repositories (interfaces)
│           ├── IKpiRepository.ts
│           └── IActionPlanRepository.ts
├── application/
│   ├── commands/
│   │   ├── CreateKpiCommand.ts
│   │   ├── UpdateKpiCommand.ts
│   │   └── CreateActionPlanCommand.ts
│   └── queries/
│       ├── GetDashboardDataQuery.ts
│       ├── ListKpisQuery.ts
│       └── ListActionPlansQuery.ts
└── infrastructure/
    ├── persistence/
    │   ├── repositories/
    │   │   ├── DrizzleKpiRepository.ts
    │   │   └── DrizzleActionPlanRepository.ts
    │   ├── mappers/
    │   │   ├── KpiMapper.ts
    │   │   └── ActionPlanMapper.ts
    │   └── schemas/
    │       ├── kpi.schema.ts
    │       └── action-plan.schema.ts
    └── di/
        └── StrategicModule.ts        # Registro de DI
```

## Fluxo de Dados

### Read (Query)

```
┌──────────┐     ┌───────┐     ┌─────────────────┐     ┌────────────┐
│ Page/API │ ──▶ │ Query │ ──▶ │ Repository (DI) │ ──▶ │ Drizzle DB │
└──────────┘     └───────┘     └────────┬────────┘     └────────────┘
                                        │
                                        ▼
                               ┌────────────────┐
                               │ Mapper.toDomain│
                               └────────┬───────┘
                                        │
                                        ▼
                               ┌────────────────┐
                               │ Domain Entity  │
                               └────────────────┘
```

### Write (Command)

```
┌──────────┐     ┌─────────┐     ┌──────────────────┐
│ Page/API │ ──▶ │ Command │ ──▶ │ Entity.create()  │
└──────────┘     └─────────┘     └────────┬─────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │ Domain Validation│
                                 └────────┬─────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │ Repository.save()│
                                 └────────┬─────────┘
                                          │
                                          ▼
                                 ┌────────────────────┐
                                 │Mapper.toPersistence│
                                 └────────┬───────────┘
                                          │
                                          ▼
                                 ┌────────────────┐
                                 │   Drizzle DB   │
                                 └────────────────┘
```

## Entity Pattern

```typescript
// Exemplo de Entity seguindo padrões AuraCore
export class Kpi extends AggregateRoot<string> {
  private constructor(id: string, private readonly props: KpiProps) {
    super(id);
  }

  // Getters
  get name(): string { return this.props.name; }
  get targetValue(): number { return this.props.targetValue; }

  // Factory: create() COM validações
  static create(props: CreateKpiProps): Result<Kpi, string> {
    if (!props.name?.trim()) {
      return Result.fail('Nome do KPI é obrigatório');
    }
    if (props.targetValue <= 0) {
      return Result.fail('Meta deve ser maior que zero');
    }
    
    const id = crypto.randomUUID();
    return Result.ok(new Kpi(id, { ...props, createdAt: new Date() }));
  }

  // Factory: reconstitute() SEM validações (para Mapper)
  static reconstitute(props: KpiProps & { id: string }): Result<Kpi, string> {
    return Result.ok(new Kpi(props.id, props));
  }

  // Comportamentos
  updateTarget(newTarget: number): Result<void, string> {
    if (newTarget <= 0) {
      return Result.fail('Meta deve ser maior que zero');
    }
    this.props.targetValue = newTarget;
    this.addDomainEvent(new KpiTargetUpdatedEvent(this.id, newTarget));
    return Result.ok(undefined);
  }
}
```

## Cache Layer

O módulo usa `unstable_cache` do Next.js para caching:

```typescript
import { getCachedDashboardData } from '@/lib/cache/strategic-cache';

// Dados cacheados por 60 segundos
const data = await getCachedDashboardData(organizationId, branchId);
```

Tags de cache para invalidação granular:
- `strategic-dashboard`
- `strategic-kpis`
- `strategic-action-plans`
- `strategic-goals`

## Performance

### Virtualização

Listas grandes usam `@tanstack/react-virtual`:

```typescript
import { VirtualizedKpiList } from '@/components/strategic/VirtualizedKpiList';

<VirtualizedKpiList kpis={kpis} height={600} />
```

### Lazy Loading

Widgets são carregados sob demanda:

```typescript
import { DynamicWidgets } from '@/components/strategic/LazyWidget';

<DynamicWidgets.HealthScore score={85} />
```

### Debounce

Inputs de busca usam debounce:

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const debouncedSearch = useDebouncedValue(search, 500);
```
