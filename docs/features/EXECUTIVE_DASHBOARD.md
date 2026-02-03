# Dashboard Executivo Real-Time

**Status:** ✅ Implementado  
**Data:** 2026-02-03  
**Módulo:** Strategic  
**Complexidade:** Alta

---

## 📋 VISÃO GERAL

Dashboard interativo para C-level (executivos) com visualização consolidada dos KPIs críticos da organização em tempo real.

### Características

- ⚡ **Real-time:** Auto-refresh a cada 30 segundos
- 📊 **KPIs Críticos:** Visualização dos indicadores em status vermelho
- 🎯 **Top Performers:** Destaques positivos com melhor performance
- 📈 **Trends:** Comparativo com período anterior (+/- %)
- 🎨 **BSC:** Visão por perspectivas do Balanced Scorecard
- 🔄 **Drill-down:** Cards clicáveis para detalhamento (futuro)

---

## 🏗️ ARQUITETURA

### Backend (DDD/Hexagonal)

```
src/modules/strategic/
├── application/
│   └── queries/
│       └── GetExecutiveDashboardQuery.ts  # ← Use Case principal
├── infrastructure/
│   └── di/
│       ├── tokens.ts                      # ← Token registrado
│       └── StrategicModule.ts             # ← DI registration
```

### API Route (Next.js 15)

```
src/app/api/strategic/analytics/executive/
└── summary/
    └── route.ts                           # ← GET endpoint
```

### Frontend (React 19 + SWR)

```
src/app/(dashboard)/strategic/analytics/executive/
└── page.tsx                               # ← Dashboard page
```

---

## 🔌 API

### Endpoint

```
GET /api/strategic/analytics/executive/summary
```

### Query Parameters

| Parâmetro | Tipo   | Obrigatório | Descrição                 |
|-----------|--------|-------------|---------------------------|
| strategyId| string | Não         | Filtrar por estratégia    |
| dateFrom  | string | Não         | Data inicial (ISO 8601)   |
| dateTo    | string | Não         | Data final (ISO 8601)     |

### Response Schema

```typescript
interface ExecutiveDashboardOutput {
  summary: {
    totalKpis: number;
    greenPercent: number;
    yellowPercent: number;
    redPercent: number;
    avgCompletion: number;
    criticalCount: number;
    improvementCount: number;
    declineCount: number;
  };
  criticalKpis: KPIMetricDTO[];
  topPerformers: KPIMetricDTO[];
  perspectiveSummaries: PerspectiveSummaryDTO[];
  allKpis: KPIMetricDTO[];
  lastUpdated: Date;
}

interface KPIMetricDTO {
  id: string;
  code: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  trend: number; // % de mudança vs período anterior
  previousValue: number;
  perspective: string;
  responsible?: string;
  lastUpdated: Date;
}
```

### Exemplo de Request

```bash
curl -X GET \
  'http://localhost:3000/api/strategic/analytics/executive/summary?strategyId=abc123' \
  -H 'Cookie: x-branch-id=1'
```

### Exemplo de Response

```json
{
  "summary": {
    "totalKpis": 24,
    "greenPercent": 62,
    "yellowPercent": 21,
    "redPercent": 17,
    "avgCompletion": 89,
    "criticalCount": 4,
    "improvementCount": 15,
    "declineCount": 9
  },
  "criticalKpis": [
    {
      "id": "kpi-001",
      "code": "REV-Q1",
      "name": "Receita Q1",
      "currentValue": 850000,
      "targetValue": 1000000,
      "unit": "R$",
      "status": "RED",
      "trend": -5.2,
      "previousValue": 897368,
      "perspective": "Financeira",
      "responsible": "user-001",
      "lastUpdated": "2026-02-03T10:00:00Z"
    }
  ],
  "topPerformers": [...],
  "perspectiveSummaries": [...],
  "allKpis": [...],
  "lastUpdated": "2026-02-03T13:15:00Z"
}
```

---

## 🎨 UI/UX

### Layout

- **Header:** Título + botões de refresh e export
- **Summary Cards (4):** Total, Verde, Críticos, Taxa de Atingimento
- **KPIs Críticos:** Grid 2 colunas com cards vermelhos
- **Top Performers:** Grid 3 colunas com cards verdes
- **Perspectivas BSC:** Grid 4 colunas com distribuição por perspectiva

### Cores e Estados

| Status  | Cor          | Badge |
|---------|--------------|-------|
| GREEN   | `green-400`  | ✅    |
| YELLOW  | `yellow-400` | ⚠️    |
| RED     | `red-400`    | 🔴    |

### Animações (Framer Motion)

- **Initial:** `opacity: 0, y: 20`
- **Animate:** `opacity: 1, y: 0`
- **Stagger:** 0.1s entre cards

---

## 🔄 REAL-TIME

### SWR Configuration

```typescript
const { data, mutate } = useSWR<ExecutiveDashboardOutput>(
  '/api/strategic/analytics/executive/summary',
  fetcher,
  {
    refreshInterval: 30000, // Auto-refresh a cada 30s
    revalidateOnFocus: true, // Revalidar ao voltar para a aba
  }
);
```

### Refresh Manual

Botão de refresh chama `mutate()` para forçar revalidação.

---

## ✅ VALIDAÇÃO

### Pré-requisitos

1. Banco de dados com KPIs cadastrados
2. Servidor rodando (`npm run dev`)
3. Autenticação configurada (cookie `x-branch-id`)

### Testes Manuais

```bash
# 1. Iniciar servidor
npm run dev

# 2. Acessar dashboard
open http://localhost:3000/strategic/analytics/executive

# 3. Verificar:
# - Summary cards carregam
# - KPIs críticos aparecem (se houver)
# - Auto-refresh funciona (aguardar 30s)
# - Botão de refresh atualiza dados
```

### Testes de API

```bash
# Test 1: Buscar summary
curl http://localhost:3000/api/strategic/analytics/executive/summary

# Test 2: Com filtro de estratégia
curl 'http://localhost:3000/api/strategic/analytics/executive/summary?strategyId=abc123'

# Test 3: Com range de datas
curl 'http://localhost:3000/api/strategic/analytics/executive/summary?dateFrom=2026-01-01&dateTo=2026-02-03'
```

---

## 📊 MÉTRICAS

### Performance

- **API Response Time:** < 500ms (target)
- **TTI (Time to Interactive):** < 2s
- **FCP (First Contentful Paint):** < 1s

### Dados

- **KPIs por página:** Até 500 (paginação no backend)
- **Auto-refresh:** 30s
- **Cache SWR:** 5 minutos

---

## 🚀 PRÓXIMOS PASSOS

### TODO Imediato

- [ ] Buscar perspectiva BSC da Goal associada ao KPI
- [ ] Implementar cálculo real de trend (buscar KPI history)
- [ ] Adicionar filtro por data range na UI
- [ ] Implementar export para Excel/PDF

### TODO Futuro

- [ ] Drill-down: clicar no card abre modal com detalhes
- [ ] Gráficos interativos (Recharts) com histórico
- [ ] Comparação de períodos (mês atual vs anterior)
- [ ] WebSocket para real-time sem polling
- [ ] Customização de dashboard (drag-and-drop)

---

## 📚 REFERÊNCIAS

- **ADR-0015:** Arquitetura DDD/Hexagonal
- **E8.4:** Épico Strategic Module
- **SMP:** Systematic Migration Protocol
- **SWR:** https://swr.vercel.app
- **Framer Motion:** https://www.framer.com/motion

---

**Gerado por:** AgenteAura ⚡  
**Última atualização:** 2026-02-03
