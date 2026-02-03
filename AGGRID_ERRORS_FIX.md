# 🔧 CORREÇÕES AG-GRID - 3 Erros Críticos

**Data:** 2026-02-03  
**Afetado:** Todas as páginas Grid (PDCA, SWOT, Ideas, KPIs, Action Plans)

---

## 🚨 ERROS IDENTIFICADOS

### **Erro #1: `undefined is not an object (evaluating 'e.data.currentPhase')`**

**Onde:** PDCA Grid (e possivelmente outros)  
**Causa:** Cell renderer acessa `params.data` sem verificar se é uma linha de grupo  
**Gravidade:** 🔴 Crítica - quebra a página

**Reprodução:**
```
1. Abrir: https://tcl.auracore.cloud/strategic/pdca/grid
2. Console mostra erro: undefined is not an object
```

---

### **Erro #239: Theming API + CSS File Conflict**

**Onde:** Todos os grids  
**Causa:** `BaseGrid.tsx` importa AMBOS:
- Theming API (themeQuartz - padrão v34)
- CSS antigo (`ag-grid.css` - v32)

**Gravidade:** 🟡 Média - causa inconsistências visuais

**Mensagem completa:**
```
AG Grid: error #239 "Theming API and CSS File Themes are both used"
Pass "legacy" to theme option or remove ag-grid.css
```

---

### **Erro #200: IntegratedChartsModule Not Registered**

**Onde:** Todos os grids  
**Causa:** `BaseGrid` tem `enableCharts={true}` mas módulo não está registrado  
**Gravidade:** 🟡 Média - funcionalidade de charts não disponível

**Mensagem completa:**
```
AG Grid: error #200 "Unable to use enableCharts"
IntegratedChartsModule must be initialised with AG Charts module
```

---

## ✅ SOLUÇÕES

### **Correção #1: Fix Cell Renderers (params.data undefined)**

**Problema:** Quando linha está agrupada (Row Group), `params.data` é `undefined`.

**Arquivos afetados:**
- `src/components/strategic/pdca/PDCAGrid.tsx` (2 cell renderers)
- `src/components/strategic/swot/SWOTGrid.tsx` (possivelmente)
- `src/components/strategic/ideas/IdeasGrid.tsx` (possivelmente)

**Solução:**

```typescript
// ANTES (ERRADO):
function EffectivenessCellRenderer(params: { value: number | null; data: PDCACycle }) {
  if (params.value === null || params.data.currentPhase !== 'ACT') { // ❌ Erro aqui
    return <span>N/A</span>;
  }
  // ...
}

// DEPOIS (CORRETO):
function EffectivenessCellRenderer(params: { value: number | null; data: PDCACycle }) {
  // ✅ Verificar se é linha de grupo primeiro
  if (!params.data) return null;
  
  if (params.value === null || params.data.currentPhase !== 'ACT') {
    return <span>N/A</span>;
  }
  // ...
}
```

**Aplicar em:**
- `EffectivenessCellRenderer` (linha 77)
- `PhaseCellRenderer` (se acessar params.data)
- Qualquer outro cell renderer customizado que use `params.data`

---

### **Correção #2: Remover ag-grid.css (Theming API v34)**

**Arquivo:** `src/components/strategic/shared/BaseGrid.tsx`

```typescript
// ANTES (ERRADO):
import 'ag-grid-community/styles/ag-grid.css'; // ❌ Remover
import 'ag-grid-community/styles/ag-theme-quartz.css';

// DEPOIS (CORRETO):
// ✅ Apenas o tema Quartz (Theming API v34)
import 'ag-grid-community/styles/ag-theme-quartz.css';
```

**Ou mantendo CSS legado:**
```typescript
// Alternativa: Usar tema legacy
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// E no gridOptions:
const gridOptions = {
  theme: 'legacy', // ✅ Explicitamente usar CSS v32
  // ...
};
```

**Recomendação:** Remover `ag-grid.css` (usar apenas Theming API v34).

---

### **Correção #3: Desabilitar Charts (sem módulo)**

**Arquivo:** `src/components/strategic/shared/BaseGrid.tsx`

```typescript
// ANTES (ERRADO):
export function BaseGrid({
  enableCharts = true, // ❌ Ativado por padrão mas módulo não registrado
  // ...
})

// DEPOIS (CORRETO):
export function BaseGrid({
  enableCharts = false, // ✅ Desativado até registrar módulo
  // ...
})
```

**E no gridOptions:**
```typescript
const gridOptions = useMemo<GridOptions>(
  () => ({
    // ...
    enableRangeSelection: !isMobile && enableExport,
    enableCharts: false, // ✅ Explicitamente desativado
    // ...
  }),
  [/* ... */]
);
```

**Ou registrar o módulo (futuro):**
```typescript
// Instalar primeiro:
// npm install ag-charts-enterprise

// src/lib/aggrid/modules.ts
import { ModuleRegistry } from 'ag-grid-community';
import { IntegratedChartsModule } from 'ag-grid-enterprise';
import { AgChartsEnterpriseModule } from 'ag-charts-enterprise';

ModuleRegistry.registerModules([
  IntegratedChartsModule.with(AgChartsEnterpriseModule)
]);
```

**Recomendação:** Desabilitar por enquanto (não usado atualmente).

---

## 🔧 IMPLEMENTAÇÃO DAS CORREÇÕES

Vou criar os arquivos corrigidos automaticamente...
