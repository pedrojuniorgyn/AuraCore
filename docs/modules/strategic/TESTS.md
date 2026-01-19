# Estratégia de Testes - Módulo Strategic

## Visão Geral

O módulo Strategic segue a pirâmide de testes do AuraCore:

```
            ┌─────────┐
            │   E2E   │  5-10%
           ┌┴─────────┴┐
          │ Integration │  20-30%
         ┌┴─────────────┴┐
        │      Unit      │  60-70%
       └─────────────────┘
```

## Ferramentas

| Ferramenta | Uso |
|------------|-----|
| Vitest | Unit tests e integration tests |
| Testing Library | Componentes React |
| MSW | Mock de APIs |
| Testcontainers | Banco de dados em testes de integração |

---

## Testes Unitários

### Domain Layer

#### Entities

```typescript
// tests/unit/strategic/domain/entities/Strategy.test.ts
import { describe, it, expect } from 'vitest';
import { Strategy } from '@/modules/strategic/domain/entities/Strategy';

describe('Strategy', () => {
  describe('create', () => {
    it('deve criar estratégia válida', () => {
      const result = Strategy.create({
        organizationId: 1,
        branchId: 1,
        name: 'Planejamento 2026',
        vision: 'Ser referência...',
        mission: 'Entregar excelência...',
        values: ['Integridade', 'Inovação'],
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      });
      
      expect(result.isOk()).toBe(true);
      expect(result.value.name).toBe('Planejamento 2026');
      expect(result.value.status.value).toBe('DRAFT');
    });
    
    it('deve falhar sem nome', () => {
      const result = Strategy.create({
        organizationId: 1,
        branchId: 1,
        name: '',
        vision: 'Visão',
        mission: 'Missão',
        values: ['Valor'],
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      });
      
      expect(result.isFail()).toBe(true);
      expect(result.error).toContain('nome');
    });
    
    it('deve falhar com endDate antes de startDate', () => {
      const result = Strategy.create({
        organizationId: 1,
        branchId: 1,
        name: 'Teste',
        vision: 'Visão',
        mission: 'Missão',
        values: ['Valor'],
        startDate: new Date('2026-12-31'),
        endDate: new Date('2026-01-01')
      });
      
      expect(result.isFail()).toBe(true);
      expect(result.error).toContain('data');
    });
  });
  
  describe('activate', () => {
    it('deve ativar estratégia em DRAFT', () => {
      const strategy = createValidStrategy();
      
      const result = strategy.activate();
      
      expect(result.isOk()).toBe(true);
      expect(strategy.status.value).toBe('ACTIVE');
      expect(strategy.getDomainEvents()).toContainEqual(
        expect.objectContaining({ eventType: 'STRATEGY_ACTIVATED' })
      );
    });
    
    it('não deve ativar estratégia já ativa', () => {
      const strategy = createActiveStrategy();
      
      const result = strategy.activate();
      
      expect(result.isFail()).toBe(true);
    });
  });
});
```

```typescript
// tests/unit/strategic/domain/entities/StrategicGoal.test.ts
describe('StrategicGoal', () => {
  describe('updateProgress', () => {
    it('deve atualizar progresso e recalcular status', () => {
      const goal = createGoalWithTarget(100);
      
      goal.updateProgress(75);
      
      expect(goal.currentValue).toBe(75);
      expect(goal.progress).toBe(75);
      expect(goal.status.value).toBe('ON_TRACK');
    });
    
    it('deve emitir GoalAchievedEvent ao atingir 100%', () => {
      const goal = createGoalWithTarget(100);
      
      goal.updateProgress(100);
      
      expect(goal.isAchieved).toBe(true);
      expect(goal.getDomainEvents()).toContainEqual(
        expect.objectContaining({ eventType: 'GOAL_ACHIEVED' })
      );
    });
  });
  
  describe('cascade', () => {
    it('deve criar meta filha com nível correto', () => {
      const parentGoal = createGoalWithLevel('CEO');
      
      const result = parentGoal.cascade({
        description: 'Meta filha',
        ownerUserId: 'user-uuid',
        ownerBranchId: 1,
        weight: 50,
        targetValue: 100
      });
      
      expect(result.isOk()).toBe(true);
      expect(result.value.cascadeLevel.value).toBe('DIRECTOR');
      expect(result.value.parentGoalId).toBe(parentGoal.id);
    });
    
    it('não deve cascatear de TEAM (nível mais baixo)', () => {
      const teamGoal = createGoalWithLevel('TEAM');
      
      const result = teamGoal.cascade({
        description: 'Meta inválida',
        ownerUserId: 'user-uuid',
        ownerBranchId: 1,
        weight: 50,
        targetValue: 100
      });
      
      expect(result.isFail()).toBe(true);
    });
  });
});
```

```typescript
// tests/unit/strategic/domain/entities/ActionPlan.test.ts
describe('ActionPlan', () => {
  describe('advancePDCA', () => {
    it('deve avançar de PLAN para DO', () => {
      const plan = createPlanInPlan();
      
      const result = plan.advancePDCA();
      
      expect(result.isOk()).toBe(true);
      expect(plan.pdcaCycle.value).toBe('DO');
    });
    
    it('não deve avançar de DO sem completionPercent > 0', () => {
      const plan = createPlanInDo();
      plan.updateProgress(0);
      
      const result = plan.advancePDCA();
      
      expect(result.isFail()).toBe(true);
      expect(result.error).toContain('progresso');
    });
  });
  
  describe('repropose', () => {
    it('deve criar reproposição com número incrementado', () => {
      const plan = createPlanWithRepropositions(1);
      
      const result = plan.repropose('Prazo insuficiente', 'new-user-id');
      
      expect(result.isOk()).toBe(true);
      expect(result.value.repropositionNumber).toBe(2);
      expect(result.value.parentActionPlanId).toBe(plan.id);
    });
    
    it('deve falhar após limite de reproposições', () => {
      const plan = createPlanWithRepropositions(3);
      
      const result = plan.repropose('Mais uma vez', 'user-id');
      
      expect(result.isFail()).toBe(true);
      expect(result.error).toContain('limite');
      expect(result.error).toContain('3');
    });
  });
});
```

#### Value Objects

```typescript
// tests/unit/strategic/domain/value-objects/BSCPerspective.test.ts
describe('BSCPerspective', () => {
  it('deve ter 4 perspectivas fixas', () => {
    expect(BSCPerspective.ALL).toHaveLength(4);
  });
  
  it('deve recuperar perspectiva por código', () => {
    const result = BSCPerspective.fromCode('FIN');
    
    expect(result.isOk()).toBe(true);
    expect(result.value.name).toBe('Financeira');
  });
  
  it('deve falhar com código inválido', () => {
    const result = BSCPerspective.fromCode('INVALID');
    
    expect(result.isFail()).toBe(true);
  });
});
```

```typescript
// tests/unit/strategic/domain/value-objects/KPITarget.test.ts
describe('KPITarget', () => {
  describe('calculateStatus', () => {
    it('deve retornar GREEN quando acima da meta (polarity UP)', () => {
      const target = KPITarget.create({
        value: 100,
        unit: '%',
        polarity: 'UP',
        alertThreshold: 10,
        criticalThreshold: 20
      }).value;
      
      expect(target.calculateStatus(105)).toBe('GREEN');
    });
    
    it('deve retornar YELLOW dentro do threshold de alerta', () => {
      const target = KPITarget.create({
        value: 100,
        unit: '%',
        polarity: 'UP',
        alertThreshold: 10,
        criticalThreshold: 20
      }).value;
      
      expect(target.calculateStatus(92)).toBe('YELLOW');
    });
    
    it('deve retornar RED quando crítico (polarity DOWN)', () => {
      const target = KPITarget.create({
        value: 100,
        unit: 'min',
        polarity: 'DOWN',
        alertThreshold: 10,
        criticalThreshold: 20
      }).value;
      
      expect(target.calculateStatus(125)).toBe('RED');
    });
  });
});
```

#### Domain Services

```typescript
// tests/unit/strategic/domain/services/GoalCascadeService.test.ts
describe('GoalCascadeService', () => {
  describe('validateCascadeLevel', () => {
    it('deve permitir CEO -> DIRECTOR', () => {
      const result = GoalCascadeService.validateCascadeLevel(
        CascadeLevel.CEO,
        CascadeLevel.DIRECTOR
      );
      
      expect(result.isOk()).toBe(true);
    });
    
    it('não deve permitir CEO -> TEAM (pular níveis)', () => {
      const result = GoalCascadeService.validateCascadeLevel(
        CascadeLevel.CEO,
        CascadeLevel.TEAM
      );
      
      expect(result.isFail()).toBe(true);
    });
  });
  
  describe('aggregateProgress', () => {
    it('deve calcular média ponderada corretamente', () => {
      const children = [
        { goalId: '1', parentGoalId: 'P1', progress: 80, weight: 60 },
        { goalId: '2', parentGoalId: 'P1', progress: 60, weight: 40 }
      ];
      
      const result = GoalCascadeService.aggregateProgress(children);
      
      expect(result.isOk()).toBe(true);
      expect(result.value.get('P1')).toBe(72); // (80*60 + 60*40) / 100
    });
    
    it('deve falhar se soma de pesos != 100', () => {
      const children = [
        { goalId: '1', parentGoalId: 'P1', progress: 80, weight: 50 },
        { goalId: '2', parentGoalId: 'P1', progress: 60, weight: 40 }
      ];
      
      const result = GoalCascadeService.aggregateProgress(children);
      
      expect(result.isFail()).toBe(true);
    });
  });
});
```

```typescript
// tests/unit/strategic/domain/services/KPICalculatorService.test.ts
describe('KPICalculatorService', () => {
  describe('calculateTrend', () => {
    it('deve detectar tendência de alta', () => {
      const history = [
        { value: 100, date: new Date('2026-01-01') },
        { value: 110, date: new Date('2026-02-01') },
        { value: 120, date: new Date('2026-03-01') }
      ];
      
      const result = KPICalculatorService.calculateTrend(history);
      
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('UP');
    });
    
    it('deve retornar STABLE com pouca variação', () => {
      const history = [
        { value: 100, date: new Date('2026-01-01') },
        { value: 101, date: new Date('2026-02-01') },
        { value: 100, date: new Date('2026-03-01') }
      ];
      
      const result = KPICalculatorService.calculateTrend(history);
      
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('STABLE');
    });
  });
  
  describe('predictValue', () => {
    it('deve prever valor futuro baseado em tendência', () => {
      const history = [
        { value: 100, date: new Date('2026-01-01') },
        { value: 110, date: new Date('2026-02-01') },
        { value: 120, date: new Date('2026-03-01') }
      ];
      
      const result = KPICalculatorService.predictValue(history, 1);
      
      expect(result.isOk()).toBe(true);
      expect(result.value).toBeCloseTo(130, 0);
    });
  });
});
```

---

## Testes de Integração

### Application Layer

```typescript
// tests/integration/strategic/application/CreateGoalUseCase.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { container } from 'tsyringe';
import { createTestContext, cleanupTestContext } from '@/tests/helpers/test-context';

describe('CreateGoalUseCase', () => {
  let testContext: TestContext;
  let useCase: CreateGoalUseCase;
  
  beforeAll(async () => {
    testContext = await createTestContext();
    useCase = container.resolve(CreateGoalUseCase);
  });
  
  afterAll(async () => {
    await cleanupTestContext(testContext);
  });
  
  it('deve criar goal e persistir no banco', async () => {
    // Arrange
    const strategy = await testContext.factories.createStrategy();
    const input: CreateGoalInput = {
      strategyId: strategy.id,
      perspectiveCode: 'FIN',
      description: 'Aumentar EBITDA em 15%',
      cascadeLevel: 'CEO',
      targetValue: 15,
      unit: '%',
      weight: 40,
      ownerUserId: testContext.userId,
      ownerBranchId: testContext.branchId,
      startDate: '2026-01-01',
      dueDate: '2026-12-31'
    };
    
    // Act
    const result = await useCase.execute(input, testContext.executionContext);
    
    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.value.code).toMatch(/^FIN-\d{3}$/);
    
    // Verify persistence
    const goalRepo = container.resolve<IGoalRepository>(TOKENS.GoalRepository);
    const savedGoal = await goalRepo.findById(
      result.value.id,
      testContext.organizationId,
      testContext.branchId
    );
    expect(savedGoal).not.toBeNull();
    expect(savedGoal!.description).toBe('Aumentar EBITDA em 15%');
  });
  
  it('deve validar multi-tenancy', async () => {
    const strategy = await testContext.factories.createStrategy({ organizationId: 999 });
    const input: CreateGoalInput = {
      strategyId: strategy.id, // Estratégia de outra org
      perspectiveCode: 'FIN',
      description: 'Meta inválida',
      cascadeLevel: 'CEO',
      targetValue: 10,
      unit: '%',
      weight: 100,
      ownerUserId: testContext.userId,
      ownerBranchId: testContext.branchId,
      startDate: '2026-01-01',
      dueDate: '2026-12-31'
    };
    
    const result = await useCase.execute(input, testContext.executionContext);
    
    expect(result.isFail()).toBe(true);
    expect(result.error).toContain('não encontrada');
  });
});
```

```typescript
// tests/integration/strategic/application/RegisterFollowUpUseCase.test.ts
describe('RegisterFollowUpUseCase', () => {
  it('deve registrar follow-up e criar reproposição se necessário', async () => {
    // Arrange
    const actionPlan = await testContext.factories.createActionPlan({
      pdcaCycle: 'CHECK'
    });
    const input: RegisterFollowUpInput = {
      actionPlanId: actionPlan.id,
      followUpDate: '2026-02-15',
      gembaLocal: 'Galpão 3',
      gembutsuObservation: 'Sistema não funcionando',
      genjitsuData: '3 de 10 OK',
      executionStatus: 'EXECUTED_PARTIAL',
      executionPercent: 70,
      problemsObserved: 'Impressora com defeito',
      problemSeverity: 'MEDIUM',
      requiresNewPlan: true,
      newPlanDescription: 'Substituir impressora',
      newPlanAssignedTo: 'user-uuid-2'
    };
    
    // Act
    const result = await useCase.execute(input, testContext.executionContext);
    
    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.value.followUpNumber).toBe(1);
    expect(result.value.repropositionCreated).toBe(true);
    expect(result.value.newActionPlanId).toBeDefined();
    
    // Verify new plan
    const newPlan = await actionPlanRepo.findById(
      result.value.newActionPlanId!,
      testContext.organizationId,
      testContext.branchId
    );
    expect(newPlan).not.toBeNull();
    expect(newPlan!.parentActionPlanId).toBe(actionPlan.id);
    expect(newPlan!.repropositionNumber).toBe(1);
  });
});
```

### Infrastructure Layer

```typescript
// tests/integration/strategic/infrastructure/DrizzleGoalRepository.test.ts
describe('DrizzleGoalRepository', () => {
  it('deve salvar e recuperar goal com value objects', async () => {
    const goal = StrategicGoal.create({
      organizationId: testContext.organizationId,
      branchId: testContext.branchId,
      strategyId: 'strategy-id',
      perspectiveCode: 'FIN',
      description: 'Test Goal',
      cascadeLevel: 'CEO',
      targetValue: 100,
      unit: '%',
      weight: 50,
      ownerUserId: 'user-id',
      ownerBranchId: 1,
      startDate: new Date('2026-01-01'),
      dueDate: new Date('2026-12-31')
    }).value;
    
    await repository.save(goal);
    
    const found = await repository.findById(
      goal.id,
      testContext.organizationId,
      testContext.branchId
    );
    
    expect(found).not.toBeNull();
    expect(found!.perspectiveCode).toBe('FIN');
    expect(found!.cascadeLevel.value).toBe('CEO');
    expect(found!.status.value).toBe('NOT_STARTED');
  });
  
  it('deve filtrar por perspectiva', async () => {
    await createGoals([
      { perspectiveCode: 'FIN' },
      { perspectiveCode: 'FIN' },
      { perspectiveCode: 'CLI' }
    ]);
    
    const result = await repository.findMany({
      organizationId: testContext.organizationId,
      branchId: testContext.branchId,
      perspectiveCode: 'FIN'
    });
    
    expect(result.items).toHaveLength(2);
    expect(result.items.every(g => g.perspectiveCode === 'FIN')).toBe(true);
  });
});
```

---

## Testes E2E

```typescript
// tests/e2e/strategic/bsc-dashboard.test.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard BSC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/strategic/dashboard');
  });
  
  test('deve exibir 4 perspectivas com gauges', async ({ page }) => {
    await expect(page.getByTestId('perspective-FIN')).toBeVisible();
    await expect(page.getByTestId('perspective-CLI')).toBeVisible();
    await expect(page.getByTestId('perspective-INT')).toBeVisible();
    await expect(page.getByTestId('perspective-LRN')).toBeVisible();
    
    await expect(page.locator('.gauge-chart')).toHaveCount(4);
  });
  
  test('deve exibir alertas ativos', async ({ page }) => {
    await expect(page.getByTestId('alerts-panel')).toBeVisible();
    
    const alerts = page.getByTestId('alert-item');
    await expect(alerts).toHaveCount.greaterThan(0);
  });
  
  test('deve navegar para mapa estratégico', async ({ page }) => {
    await page.getByRole('button', { name: /ver mapa/i }).click();
    
    await expect(page).toHaveURL('/strategic/map');
    await expect(page.locator('.react-flow')).toBeVisible();
  });
});
```

```typescript
// tests/e2e/strategic/action-plan-flow.test.ts
test.describe('Fluxo de Plano de Ação', () => {
  test('deve criar plano, registrar follow-up e reproposição', async ({ page }) => {
    // 1. Criar plano
    await page.goto('/strategic/action-plans/new');
    await page.fill('[name="what"]', 'Implementar novo sistema');
    await page.fill('[name="why"]', 'Melhorar produtividade');
    await page.fill('[name="where"]', 'Filial SP');
    await page.fill('[name="who"]', 'João Silva');
    await page.fill('[name="how"]', '1. Planejar\n2. Executar');
    await page.fill('[name="howMuchAmount"]', '50000');
    await page.getByRole('button', { name: /salvar/i }).click();
    
    await expect(page.getByText(/plano criado/i)).toBeVisible();
    const planCode = await page.getByTestId('plan-code').textContent();
    
    // 2. Avançar para DO
    await page.getByRole('button', { name: /avançar pdca/i }).click();
    await expect(page.getByText(/executar/i)).toBeVisible();
    
    // 3. Atualizar progresso
    await page.fill('[name="completionPercent"]', '70');
    await page.getByRole('button', { name: /salvar/i }).click();
    
    // 4. Avançar para CHECK
    await page.getByRole('button', { name: /avançar pdca/i }).click();
    
    // 5. Registrar follow-up
    await page.goto(`/strategic/action-plans/${planCode}/follow-up`);
    await page.fill('[name="gembaLocal"]', 'Galpão 3');
    await page.fill('[name="gembutsuObservation"]', 'Sistema com problemas');
    await page.fill('[name="genjitsuData"]', '70% concluído');
    await page.getByLabel(/executado parcialmente/i).check();
    await page.getByLabel(/sim, precisa de nova ação/i).check();
    await page.fill('[name="newPlanDescription"]', 'Corrigir problemas encontrados');
    await page.getByRole('button', { name: /salvar/i }).click();
    
    // 6. Verificar reproposição criada
    await expect(page.getByText(/reproposição criada/i)).toBeVisible();
    await expect(page.getByText(new RegExp(`${planCode}-R1`))).toBeVisible();
  });
});
```

---

## Fixtures e Factories

```typescript
// tests/helpers/factories/strategic.factories.ts
export function createStrategyFactory(overrides: Partial<StrategyProps> = {}): Strategy {
  return Strategy.create({
    organizationId: 1,
    branchId: 1,
    name: `Strategy ${Date.now()}`,
    vision: 'Test Vision',
    mission: 'Test Mission',
    values: ['Value 1', 'Value 2'],
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    ...overrides
  }).value;
}

export function createGoalFactory(overrides: Partial<GoalProps> = {}): StrategicGoal {
  return StrategicGoal.create({
    organizationId: 1,
    branchId: 1,
    strategyId: 'strategy-id',
    perspectiveCode: 'FIN',
    description: `Goal ${Date.now()}`,
    cascadeLevel: 'CEO',
    targetValue: 100,
    unit: '%',
    weight: 100,
    ownerUserId: 'user-id',
    ownerBranchId: 1,
    startDate: new Date('2026-01-01'),
    dueDate: new Date('2026-12-31'),
    ...overrides
  }).value;
}

export function createActionPlanFactory(overrides: Partial<ActionPlanProps> = {}): ActionPlan {
  return ActionPlan.create({
    organizationId: 1,
    branchId: 1,
    goalId: 'goal-id',
    what: 'Test Action',
    why: 'Test Reason',
    where: 'Test Location',
    whenStart: new Date('2026-02-01'),
    whenEnd: new Date('2026-03-31'),
    who: 'user-id',
    how: 'Test Steps',
    howMuchAmount: 10000,
    howMuchCurrency: 'BRL',
    ...overrides
  }).value;
}
```

---

## Cobertura de Código

Metas de cobertura:

| Camada | Meta | Crítico |
|--------|------|---------|
| Domain Entities | 90% | Sim |
| Domain Value Objects | 95% | Sim |
| Domain Services | 95% | Sim |
| Application Commands | 85% | Sim |
| Application Queries | 80% | Não |
| Infrastructure | 75% | Não |
| Components | 70% | Não |

Comando para executar testes com cobertura:

```bash
npm run test:coverage -- --project strategic
```

---

## Testes de Regressão

### Cenários Críticos

1. **Cascateamento de Metas**
   - Validar hierarquia CEO → DIRECTOR → MANAGER → TEAM
   - Validar soma de pesos = 100%
   - Validar agregação bottom-up

2. **Limite de Reproposições**
   - Validar que 4ª reproposição falha
   - Validar escalonamento automático

3. **PDCA Sequencial**
   - Validar que não pode pular etapas
   - Validar condições de avanço

4. **Follow-up 3G**
   - Validar campos obrigatórios
   - Validar criação de reproposição

5. **Multi-Tenancy**
   - Validar isolamento entre organizações
   - Validar isolamento entre branches

---

## Execução

```bash
# Todos os testes do módulo
npm run test -- --project strategic

# Apenas testes unitários
npm run test:unit -- strategic

# Apenas testes de integração
npm run test:integration -- strategic

# Testes E2E
npm run test:e2e -- strategic

# Com watch mode
npm run test -- --project strategic --watch
```
