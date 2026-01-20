# 🧩 Componentes do Módulo Strategic

Documentação dos componentes React do módulo Strategic.

## Dashboard Components

### DashboardGrid

Grid customizável com drag-and-drop para widgets.

**Localização:** `src/components/strategic/DashboardGrid.tsx`

```tsx
import { DashboardGrid } from '@/components/strategic/DashboardGrid';

<DashboardGrid
  widgets={widgets}
  data={dashboardData}
  isEditing={isEditing}
  onLayoutChange={handleLayoutChange}
  onRemoveWidget={handleRemove}
  containerWidth={1200}
/>
```

**Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `widgets` | `WidgetConfig[]` | Sim | Lista de widgets a renderizar |
| `data` | `DashboardData \| null` | Sim | Dados para os widgets |
| `isEditing` | `boolean` | Sim | Modo de edição ativo |
| `onLayoutChange` | `(layout) => void` | Sim | Callback quando layout muda |
| `onRemoveWidget` | `(id: string) => void` | Sim | Callback para remover widget |
| `containerWidth` | `number` | Não | Largura do container (default: 1200) |

**Exemplo de WidgetConfig:**

```typescript
interface WidgetConfig {
  i: string;           // ID único
  type: WidgetType;    // Tipo do widget
  x: number;           // Posição X no grid
  y: number;           // Posição Y no grid
  w: number;           // Largura (1-3 colunas)
  h: number;           // Altura (em unidades)
}
```

---

### WidgetPicker

Modal para selecionar widgets a adicionar ao dashboard.

**Localização:** `src/components/strategic/WidgetPicker.tsx`

```tsx
import { WidgetPicker } from '@/components/strategic/WidgetPicker';

<WidgetPicker
  isOpen={showPicker}
  onClose={() => setShowPicker(false)}
  activeWidgets={['health-score', 'alerts']}
  onToggleWidget={handleToggle}
/>
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `isOpen` | `boolean` | Controla visibilidade do modal |
| `onClose` | `() => void` | Callback para fechar |
| `activeWidgets` | `WidgetType[]` | Widgets atualmente ativos |
| `onToggleWidget` | `(type) => void` | Toggle widget ativo/inativo |

---

## Widget Components

### HealthScoreWidget

Exibe o score de saúde da estratégia com animação circular.

**Localização:** `src/components/strategic/widgets/HealthScoreWidget.tsx`

```tsx
import { HealthScoreWidget } from '@/components/strategic/widgets';

<HealthScoreWidget
  score={72}
  previousScore={68}
  lastUpdate="2026-01-20T10:30:00"
/>
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `score` | `number` | Score atual (0-100) |
| `previousScore` | `number` | Score anterior para comparação |
| `lastUpdate` | `string` | Data/hora da última atualização |

**Cores por faixa:**
- 🔴 Critical: 0-40
- 🟡 Warning: 41-60
- 🔵 On Track: 61-80
- 🟢 Excellent: 81-100

---

### AlertsWidget

Lista de alertas críticos de KPIs.

**Localização:** `src/components/strategic/widgets/AlertsWidget.tsx`

```tsx
import { AlertsWidget } from '@/components/strategic/widgets';

<AlertsWidget
  alerts={[
    { 
      id: '1', 
      type: 'kpi', 
      message: 'OTD abaixo da meta', 
      severity: 'critical',
      kpiId: 'kpi-123'
    }
  ]}
  onAlertClick={handleAlertClick}
/>
```

---

### KpiSummaryWidget

Resumo de KPIs por perspectiva BSC.

```tsx
import { KpiSummaryWidget } from '@/components/strategic/widgets';

<KpiSummaryWidget
  perspectives={[
    { name: 'Financeiro', total: 10, achieved: 7, onTrack: 2, critical: 1 },
    { name: 'Cliente', total: 8, achieved: 5, onTrack: 2, critical: 1 },
  ]}
/>
```

---

### TrendChartWidget

Gráfico de tendência temporal.

```tsx
import { TrendChartWidget } from '@/components/strategic/widgets';

<TrendChartWidget
  data={[
    { date: '2026-01-15', value: 68 },
    { date: '2026-01-16', value: 70 },
    { date: '2026-01-17', value: 72 },
  ]}
  currentValue={72}
  targetValue={80}
/>
```

---

### AuroraInsightWidget

Insight de IA com animação de digitação.

```tsx
import { AuroraInsightWidget } from '@/components/strategic/widgets';

<AuroraInsightWidget
  insight="Identificamos correlação entre entregas atrasadas e aumento de custos operacionais..."
  isLoading={false}
  onRefresh={handleRefresh}
/>
```

---

## KPI Components

### VirtualizedKpiList

Lista virtualizada para grandes volumes de KPIs.

**Localização:** `src/components/strategic/VirtualizedKpiList.tsx`

```tsx
import { VirtualizedKpiList } from '@/components/strategic/VirtualizedKpiList';

<VirtualizedKpiList
  kpis={kpis}
  onKpiClick={handleClick}
  onKpiEdit={handleEdit}
  isLoading={false}
  emptyMessage="Nenhum KPI encontrado"
  height={600}
/>
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `kpis` | `Kpi[]` | Lista de KPIs |
| `onKpiClick` | `(kpi) => void` | Callback ao clicar |
| `onKpiEdit` | `(kpi) => void` | Callback para editar |
| `isLoading` | `boolean` | Estado de loading |
| `emptyMessage` | `string` | Mensagem quando vazio |
| `height` | `number` | Altura do container (default: 600) |

**Performance:**
- Renderiza apenas itens visíveis
- Suporta 1000+ KPIs sem perda de performance
- Overscan de 5 itens para scroll suave

---

## Lazy Loading

### DynamicWidgets

Widgets pré-configurados com lazy loading via Next.js dynamic.

**Localização:** `src/components/strategic/LazyWidget.tsx`

```tsx
import { DynamicWidgets } from '@/components/strategic/LazyWidget';

// Carrega o componente apenas quando necessário
<DynamicWidgets.HealthScore score={85} previousScore={80} />
<DynamicWidgets.Alerts alerts={alerts} />
<DynamicWidgets.KpiSummary perspectives={perspectives} />
```

**Widgets disponíveis:**
- `DynamicWidgets.HealthScore`
- `DynamicWidgets.Alerts`
- `DynamicWidgets.KpiSummary`
- `DynamicWidgets.TrendChart`
- `DynamicWidgets.Actions`
- `DynamicWidgets.AuroraInsight`

---

### SimpleLazyWidget

Wrapper para lazy loading baseado em viewport.

```tsx
import { SimpleLazyWidget, useViewportLoading } from '@/components/strategic/LazyWidget';

function MyComponent() {
  const { ref, shouldLoad } = useViewportLoading({ rootMargin: '100px' });

  return (
    <SimpleLazyWidget observerRef={ref} shouldLoad={shouldLoad}>
      <HeavyComponent />
    </SimpleLazyWidget>
  );
}
```

---

## Onboarding Components

### WelcomeModal

Modal de boas-vindas exibido na primeira visita.

```tsx
import { WelcomeModal } from '@/components/strategic/WelcomeModal';

<WelcomeModal
  isOpen={showWelcome}
  onClose={() => setShowWelcome(false)}
  onStartTour={handleStartTour}
/>
```

---

### OnboardingTour

Tour interativo com spotlight nos elementos.

```tsx
import { OnboardingTour } from '@/components/strategic/OnboardingTour';

<OnboardingTour
  isActive={tourActive}
  steps={tourSteps}
  onComplete={handleTourComplete}
  onSkip={handleSkip}
/>
```

---

### OnboardingChecklist

Checklist de primeiros passos.

```tsx
import { OnboardingChecklist } from '@/components/strategic/OnboardingChecklist';

<OnboardingChecklist
  items={[
    { id: 'create-kpi', label: 'Criar primeiro KPI', completed: true },
    { id: 'customize-dashboard', label: 'Personalizar dashboard', completed: false },
  ]}
  onItemClick={handleItemClick}
/>
```

---

## Mobile Components

### MobileNav

Navegação bottom para dispositivos móveis.

```tsx
<MobileNav
  items={[
    { icon: Home, label: 'Dashboard', href: '/strategic/dashboard' },
    { icon: Target, label: 'KPIs', href: '/strategic/kpis' },
  ]}
  activeItem="dashboard"
/>
```

---

### MobileHeader

Header com menu drawer para mobile.

```tsx
<MobileHeader
  title="Dashboard Estratégico"
  onMenuClick={openDrawer}
  onNotificationsClick={openNotifications}
/>
```

---

## Hooks Relacionados

### useIntersectionObserver

Detecta quando elementos entram no viewport.

```tsx
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const { ref, isIntersecting, hasIntersected } = useIntersectionObserver({
  rootMargin: '100px',
  threshold: 0.1,
  triggerOnce: true,
});
```

---

### useInfiniteScroll

Scroll infinito com carregamento progressivo.

```tsx
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const { data, isLoading, loadMoreRef, hasMore } = useInfiniteScroll({
  pageSize: 20,
  fetchFn: async (page, pageSize) => {
    const res = await fetch(`/api/kpis?page=${page}&limit=${pageSize}`);
    return res.json();
  },
});
```

---

### useDebouncedValue

Debounce para inputs de busca/filtro.

```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 500);

useEffect(() => {
  if (debouncedSearch) {
    fetchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```
