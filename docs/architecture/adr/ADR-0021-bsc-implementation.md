# ADR-0021: Implementação do Balanced Scorecard

## Status

Proposto

## Data

2026-01-18

## Contexto

O Balanced Scorecard (BSC) é o framework central do módulo Strategic. Precisa representar as 4 perspectivas com relações causa-efeito visuais, suportando:

1. **Perspectivas fixas** com cores e ordenação padrão
2. **Objetivos estratégicos** vinculados às perspectivas
3. **KPIs** vinculados aos objetivos
4. **Relações causa-efeito** entre objetivos
5. **Cascateamento** de metas do CEO até equipes
6. **Visualização** em mapa estratégico interativo

## Decisão

### Modelo de Dados

```
Strategy (1) ─────► Perspectives (4 fixas)
                         │
                         ▼
                    Goals (N) ◄───── CauseEffectRelation (N:N)
                         │
                         ▼
                    KPIs (N)
                         │
                         ▼
                  KPIHistory (N)
```

#### Strategy

```typescript
interface StrategyProps {
  organizationId: number;
  branchId: number;
  name: string;
  vision: string;
  mission: string;
  values: string[];
  startDate: Date;
  endDate: Date;
  status: StrategyStatus; // DRAFT, ACTIVE, ARCHIVED
}
```

#### StrategicGoal

```typescript
interface StrategicGoalProps {
  organizationId: number;
  branchId: number;
  strategyId: string;
  perspectiveCode: string; // FIN, CLI, INT, LRN
  parentGoalId?: string; // Para cascateamento
  code: string;
  description: string;
  cascadeLevel: CascadeLevel; // CEO, DIRECTOR, MANAGER, TEAM
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number; // Peso na perspectiva (0-100)
  ownerUserId: string;
  ownerBranchId: number;
  startDate: Date;
  dueDate: Date;
  status: GoalStatus;
  
  // Posição no mapa (ReactFlow)
  mapPositionX?: number;
  mapPositionY?: number;
}
```

#### GoalCascade (Relação N:N)

```typescript
interface GoalCascadeProps {
  parentGoalId: string;
  childGoalId: string;
  contributionWeight: number; // Quanto o child contribui para o parent
}
```

### Perspectivas Fixas

| Código | Nome | Cor | Ordem | Descrição |
|--------|------|-----|-------|-----------|
| FIN | Financeira | yellow-400 | 1 | Resultados financeiros para acionistas |
| CLI | Clientes | blue-400 | 2 | Proposta de valor para clientes |
| INT | Processos Internos | green-400 | 3 | Processos críticos para entregar valor |
| LRN | Aprendizado e Crescimento | purple-400 | 4 | Capacidades e cultura |

**Implementação como Value Object:**

```typescript
class BSCPerspective extends ValueObject<BSCPerspectiveProps> {
  static readonly FINANCIAL = BSCPerspective.create('FIN', 'Financeira', '#fbbf24', 1).value;
  static readonly CUSTOMER = BSCPerspective.create('CLI', 'Clientes', '#3b82f6', 2).value;
  static readonly INTERNAL = BSCPerspective.create('INT', 'Processos Internos', '#22c55e', 3).value;
  static readonly LEARNING = BSCPerspective.create('LRN', 'Aprendizado e Crescimento', '#a855f7', 4).value;
  
  static readonly ALL = [
    BSCPerspective.FINANCIAL,
    BSCPerspective.CUSTOMER,
    BSCPerspective.INTERNAL,
    BSCPerspective.LEARNING
  ];
  
  static fromCode(code: string): Result<BSCPerspective, string> {
    const found = BSCPerspective.ALL.find(p => p.code === code);
    if (!found) return Result.fail(`Perspectiva inválida: ${code}`);
    return Result.ok(found);
  }
}
```

### Mapa Estratégico

#### Tecnologia: ReactFlow

Escolhido por:
- Nodes e edges customizáveis
- Zoom, pan e minimap nativos
- Suporte a drag & drop de posição
- Serialização de estado simples

#### Implementação

```typescript
// components/strategic/StrategicMap.tsx
interface StrategicMapNode extends Node {
  id: string;
  type: 'goal';
  position: { x: number; y: number };
  data: {
    goal: StrategicGoal;
    perspective: BSCPerspective;
    status: GoalStatus;
    progress: number;
  };
}

interface StrategicMapEdge extends Edge {
  id: string;
  source: string; // causeGoalId
  target: string; // effectGoalId
  type: 'causeEffect';
  animated: true;
}

function StrategicMap({ strategyId }: Props) {
  const { goals, relations } = useStrategicMapData(strategyId);
  
  const nodes = goals.map(goal => ({
    id: goal.id,
    type: 'goal',
    position: { x: goal.mapPositionX, y: goal.mapPositionY },
    data: { goal, perspective: BSCPerspective.fromCode(goal.perspectiveCode) }
  }));
  
  const edges = relations.map(rel => ({
    id: `${rel.causeGoalId}-${rel.effectGoalId}`,
    source: rel.causeGoalId,
    target: rel.effectGoalId,
    type: 'causeEffect',
    animated: true
  }));
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={{ goal: GoalNode }}
      edgeTypes={{ causeEffect: CauseEffectEdge }}
      fitView
    >
      <MiniMap />
      <Controls />
      <Background />
    </ReactFlow>
  );
}
```

#### Layout por Perspectiva

O mapa é organizado horizontalmente em 4 faixas:

```
┌─────────────────────────────────────────────────────────────────┐
│ FINANCEIRA (yellow)                                             │
│   ┌──────┐     ┌──────┐     ┌──────┐                           │
│   │EBITDA│────▶│Receita│────▶│Custo │                          │
│   └──────┘     └──────┘     └──────┘                           │
├─────────────────────────────────────────────────────────────────┤
│ CLIENTES (blue)                                                 │
│   ┌──────┐     ┌──────┐                                        │
│   │ NPS  │────▶│Retenç│                                        │
│   └──────┘     └──────┘                                        │
├─────────────────────────────────────────────────────────────────┤
│ PROCESSOS (green)                                               │
│   ┌──────┐     ┌──────┐     ┌──────┐                           │
│   │ OTD  │────▶│Qualid│────▶│Eficiê│                          │
│   └──────┘     └──────┘     └──────┘                           │
├─────────────────────────────────────────────────────────────────┤
│ APRENDIZADO (purple)                                            │
│   ┌──────┐     ┌──────┐                                        │
│   │Treina│────▶│Clima │                                        │
│   └──────┘     └──────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Cascateamento de Metas

#### Níveis

| Nível | Label | Descrição |
|-------|-------|-----------|
| CEO | Estratégico | Metas corporativas |
| DIRECTOR | Tático | Metas de diretoria |
| MANAGER | Gerencial | Metas de gerência |
| TEAM | Operacional | Metas de equipe/individual |

#### Regras de Cascateamento

1. **Hierarquia obrigatória:** CEO → DIRECTOR → MANAGER → TEAM
2. **Peso proporcional:** Soma dos pesos dos children = 100% do parent
3. **Cálculo bottom-up:** Progresso do parent = média ponderada dos children
4. **Branch scope:** Child pode ser de branch diferente do parent

```typescript
// domain/services/GoalCascadeService.ts
class GoalCascadeService {
  private constructor() {}
  
  static validateCascade(
    parentLevel: CascadeLevel,
    childLevel: CascadeLevel
  ): Result<void, string> {
    const hierarchy = ['CEO', 'DIRECTOR', 'MANAGER', 'TEAM'];
    const parentIdx = hierarchy.indexOf(parentLevel);
    const childIdx = hierarchy.indexOf(childLevel);
    
    if (childIdx !== parentIdx + 1) {
      return Result.fail(
        `Nível ${childLevel} não pode ser filho direto de ${parentLevel}`
      );
    }
    
    return Result.ok(undefined);
  }
  
  static aggregateProgress(
    parentGoalId: string,
    children: { goalId: string; progress: number; weight: number }[]
  ): Result<number, string> {
    const totalWeight = children.reduce((sum, c) => sum + c.weight, 0);
    
    if (totalWeight !== 100) {
      return Result.fail(`Soma dos pesos deve ser 100, atual: ${totalWeight}`);
    }
    
    const weightedProgress = children.reduce(
      (sum, c) => sum + (c.progress * c.weight / 100),
      0
    );
    
    return Result.ok(weightedProgress);
  }
}
```

### Cálculo de Pesos

1. **Por perspectiva:** Cada perspectiva tem peso total = 100%
2. **Por objetivo:** Peso = contribuição do objetivo para a perspectiva
3. **Agregação:** Score da perspectiva = Σ(progresso × peso) / 100

```typescript
// Exemplo: Perspectiva Financeira
// - EBITDA +15%: peso 40%, progresso 75% → contribuição 30%
// - Receita +20%: peso 35%, progresso 82% → contribuição 28.7%
// - Custo -10%: peso 25%, progresso 45% → contribuição 11.25%
// Score Financeira = 30 + 28.7 + 11.25 = 69.95%
```

## Consequências

### Positivas

1. **Visualização clara da estratégia**
   - Mapa interativo com causa-efeito
   - Cores por perspectiva
   - Progresso visual

2. **Flexibilidade no cascateamento**
   - Suporta estruturas organizacionais complexas
   - Branch scoping por nível

3. **Cálculos automáticos**
   - Agregação bottom-up
   - Alertas de desvio
   - Tendências

### Negativas

1. **Complexidade na manutenção de pesos**
   - Soma deve ser 100% por perspectiva
   - Ajustes propagam para agregação

2. **Performance com muitos nós**
   - Virtualização necessária se > 50 goals
   - Recálculo de layout pode ser lento

## Referências

- KAPLAN, R. S.; NORTON, D. P. *Strategy Maps*. Harvard Business Press, 2004.
- ReactFlow Documentation: https://reactflow.dev/
- ADR-0020: Módulo Strategic Management
