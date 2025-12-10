# 🌌 MARATONA AURORA - GUIA COMPLETO DE IMPLEMENTAÇÃO

**Data:** 09/12/2025  
**Status:** ✅ Templates prontos para aplicação em 58 páginas  
**Tempo estimado:** 2-3 horas de aplicação sistemática

---

## 🎯 OBJETIVO

Aplicar o Design System Aurora em **TODAS as 58 páginas** do Aura Core de forma consistente e eficiente.

---

## 📊 PÁGINAS PARA ATUALIZAR

### **✅ JÁ IMPLEMENTADAS (2):**
```
1. /financeiro/contas-pagar         ✅ COMPLETO (referência)
2. /financeiro/contas-receber       ⚠️  PARCIAL (falta finalizar)
```

### **🔲 PENDENTES (56):**

#### **💰 FINANCEIRO (17):**
```
3.  /financeiro/contas-pagar/create
4.  /financeiro/contas-receber/create  
5.  /financeiro/contas-pagar/nova
6.  /financeiro/contas-receber/nova
7.  /financeiro/dda
8.  /financeiro/btg-testes
9.  /financeiro/btg-dashboard
10. /financeiro/conciliacao
11. /financeiro/fluxo-caixa
12. /financeiro/faturamento
13. /financeiro/impostos-recuperaveis
14. /financeiro/dre
15. /financeiro/dre-dashboard
16. /financeiro/plano-contas
17. /financeiro/centros-custo
18. /financeiro/radar-dda
19. /financeiro/remessas
```

#### **🚚 TMS (5):**
```
20. /tms/repositorio-cargas
21. /tms/viagens
22. /tms/ocorrencias
23. /tms/torre-controle
24. /tms/cockpit
```

#### **📄 FISCAL (6):**
```
25. /fiscal/entrada-notas
26. /fiscal/entrada-notas/[id]
27. /fiscal/cte
28. /fiscal/cte/inutilizacao
29. /fiscal/matriz-tributaria
30. /fiscal/upload-xml
```

#### **🚛 FROTA (6):**
```
31. /frota/veiculos
32. /frota/motoristas
33. /frota/pneus
34. /frota/documentacao
35. /frota/manutencao/planos
36. /frota/manutencao/ordens
```

#### **📦 WMS (2):**
```
37. /wms/enderecos
38. /wms/inventario
```

#### **💼 COMERCIAL (5):**
```
39. /comercial/crm
40. /comercial/propostas
41. /comercial/cotacoes
42. /comercial/tabelas-frete
43. /comercial/simulador
```

#### **👥 CADASTROS (6):**
```
44. /cadastros/parceiros
45. /cadastros/parceiros/create
46. /cadastros/parceiros/edit/[id]
47. /cadastros/produtos
48. /cadastros/produtos/create
49. /cadastros/produtos/edit/[id]
```

#### **⚙️ CONFIGURAÇÕES (9):**
```
50. /configuracoes
51. /configuracoes/usuarios
52. /configuracoes/fiscal
53. /configuracoes/certificado
54. /configuracoes/filiais
55. /configuracoes/filiais/create
56. /configuracoes/filiais/edit/[id]
57. /configuracoes/filiais/[id]
```

#### **🏠 OUTROS (2):**
```
58. / (dashboard principal)
59. /perfil
```

---

## 🎨 TEMPLATES AURORA POR TIPO DE PÁGINA

### **TEMPLATE 1: PÁGINA COM GRID + KPIs**

**Exemplo:** Contas a Pagar, Contas a Receber, Veículos, etc.

#### **1.1 Imports:**
```tsx
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { Plus, Download, RefreshCw, DollarSign, TrendingUp, AlertCircle, Clock } from "lucide-react";
```

#### **1.2 Título (escolher cor por módulo):**
```tsx
{/* FINANCEIRO - Purple/Pink/Cyan */}
<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
  💰 {Título da Página}
</h1>

{/* TMS - Blue/Cyan */}
<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent animate-gradient">
  🚚 {Título da Página}
</h1>

{/* FISCAL - Slate/Blue */}
<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-400 via-blue-400 to-slate-300 bg-clip-text text-transparent animate-gradient">
  📄 {Título da Página}
</h1>

{/* FROTA - Green/Blue */}
<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-green-300 bg-clip-text text-transparent animate-gradient">
  🚛 {Título da Página}
</h1>

{/* WMS - Cyan/Purple */}
<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent animate-gradient">
  📦 {Título da Página}
</h1>

{/* COMERCIAL - Purple/Pink */}
<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 bg-clip-text text-transparent animate-gradient">
  💼 {Título da Página}
</h1>
```

#### **1.3 Botões:**
```tsx
{/* Atualizar - Blue/Cyan (universal) */}
<RippleButton
  onClick={handleRefresh}
  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Atualizar
</RippleButton>

{/* Exportar - Green (universal) */}
<RippleButton
  onClick={handleExport}
  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
>
  <Download className="h-4 w-4 mr-2" />
  Exportar Excel
</RippleButton>

{/* Criar/Adicionar - Purple/Pink (universal) */}
<RippleButton
  onClick={handleCreate}
  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
>
  <Plus className="h-4 w-4 mr-2" />
  Novo
</RippleButton>
```

#### **1.4 Cards KPI:**
```tsx
{/* Card Purple (Total/Principal) */}
<GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
  <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
        <DollarSign className="h-6 w-6 text-purple-400" />
      </div>
      <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
        Total
      </span>
    </div>
    <h3 className="text-sm font-medium text-slate-400 mb-2">Título do KPI</h3>
    <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
      R$ <NumberCounter value={valor} />
    </div>
    <p className="text-xs text-slate-500 mt-2">Descrição</p>
  </div>
</GlassmorphismCard>

{/* Card Green (Sucesso/Positivo) */}
<GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
  <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
        <TrendingUp className="h-6 w-6 text-green-400" />
      </div>
      <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
        ✅ Positivo
      </span>
    </div>
    <h3 className="text-sm font-medium text-slate-400 mb-2">Título do KPI</h3>
    <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
      R$ <NumberCounter value={valor} />
    </div>
    <p className="text-xs text-slate-500 mt-2">Descrição</p>
  </div>
</GlassmorphismCard>

{/* Card Amber (Atenção/Pendente) */}
<GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
  <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
        <Clock className="h-6 w-6 text-amber-400" />
      </div>
      <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
        ⏰ Atenção
      </span>
    </div>
    <h3 className="text-sm font-medium text-slate-400 mb-2">Título do KPI</h3>
    <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
      R$ <NumberCounter value={valor} />
    </div>
    <p className="text-xs text-slate-500 mt-2">Descrição</p>
  </div>
</GlassmorphismCard>

{/* Card Red (Urgente/Vencido) */}
<GlassmorphismCard className="border-red-500/30 hover:border-red-400/50 transition-all hover:shadow-lg hover:shadow-red-500/20">
  <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl shadow-inner animate-pulse">
        <AlertCircle className="h-6 w-6 text-red-400" />
      </div>
      <span className="text-xs text-red-300 font-semibold px-3 py-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full border border-red-400/30 animate-pulse">
        ❌ Urgente
      </span>
    </div>
    <h3 className="text-sm font-medium text-slate-400 mb-2">Título do KPI</h3>
    <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
      R$ <NumberCounter value={valor} />
    </div>
    <p className="text-xs text-slate-500 mt-2">Descrição</p>
  </div>
</GlassmorphismCard>
```

---

### **TEMPLATE 2: PÁGINA DE FORMULÁRIO (Create/Edit)**

**Exemplo:** Criar Conta, Editar Produto, etc.

#### **2.1 Título:**
```tsx
<h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
  {Título do Formulário}
</h1>
```

#### **2.2 Botões de Ação:**
```tsx
{/* Cancelar - Slate */}
<RippleButton
  onClick={handleCancel}
  className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400"
>
  Cancelar
</RippleButton>

{/* Salvar - Purple/Pink */}
<RippleButton
  onClick={handleSave}
  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
>
  Salvar
</RippleButton>

{/* Salvar e Continuar - Green */}
<RippleButton
  onClick={handleSaveAndContinue}
  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
>
  Salvar e Continuar
</RippleButton>
```

---

### **TEMPLATE 3: DASHBOARD**

**Exemplo:** Dashboard principal, DRE Dashboard, BTG Dashboard

#### **3.1 Título:**
```tsx
<h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
  🌌 Dashboard Aura Core
</h1>
```

#### **3.2 Cards de Métricas:**
```tsx
{/* Usar cards coloridos conforme a métrica */}
{/* Receita = Green */}
{/* Despesa = Red */}
{/* Lucro = Purple */}
{/* Pendente = Amber */}
```

---

## 🔄 SCRIPT DE SUBSTITUIÇÃO GLOBAL

### **Passo 1: Substituir Imports**

```bash
# Substituir ShimmerButton por RippleButton em todos os arquivos
find src/app/\(dashboard\) -name "*.tsx" -type f -exec sed -i '' 's/import { ShimmerButton }/import { RippleButton }/g' {} +
find src/app/\(dashboard\) -name "*.tsx" -type f -exec sed -i '' 's/"@\/components\/ui\/shimmer-button"/"@\/components\/ui\/ripple-button"/g' {} +
```

### **Passo 2: Substituir Componentes**

```bash
# Substituir <ShimmerButton por <RippleButton
find src/app/\(dashboard\) -name "*.tsx" -type f -exec sed -i '' 's/<ShimmerButton/<RippleButton/g' {} +
find src/app/\(dashboard\) -name "*.tsx" -type f -exec sed -i '' 's/<\/ShimmerButton/<\/RippleButton/g' {} +
```

### **Passo 3: Atualizar Cores dos Botões**

**Manualmente ajustar conforme o contexto:**
- Atualizar → `from-blue-600 to-cyan-600`
- Exportar → `from-green-600 to-green-500`
- Criar/Novo → `from-purple-600 to-pink-600`
- Deletar → `from-red-600 to-rose-600`
- Cancelar → `from-slate-600 to-slate-500`

---

## 📊 CHECKLIST DE APLICAÇÃO

### **Para cada página:**

```
[ ] 1. Substituir ShimmerButton por RippleButton
[ ] 2. Aplicar gradiente Aurora no título (conforme módulo)
[ ] 3. Atualizar cores dos botões:
    [ ] Atualizar = Blue/Cyan
    [ ] Exportar = Green
    [ ] Criar = Purple/Pink
    [ ] Deletar = Red
    [ ] Cancelar = Slate
[ ] 4. Se tiver KPIs, aplicar cards Aurora:
    [ ] Total = Purple
    [ ] Positivo = Green
    [ ] Atenção = Amber
    [ ] Urgente = Red (+ pulse)
[ ] 5. Adicionar hover shadows coloridos nos cards
[ ] 6. Verificar linter errors
[ ] 7. Testar visualmente
```

---

## 🎨 CORES AURORA POR MÓDULO

```
💰 FINANCEIRO     → Purple/Pink/Cyan
🚚 TMS            → Blue/Cyan
📄 FISCAL         → Slate/Blue
🚛 FROTA          → Green/Blue
📦 WMS            → Cyan/Purple
💼 COMERCIAL      → Purple/Pink
👥 CADASTROS      → Blue/Slate
⚙️  CONFIGURAÇÕES → Slate/Blue
🏠 DASHBOARD      → Purple/Pink/Cyan (Aurora completo)
```

---

## ⏱️ ESTIMATIVA DE TEMPO

```
Preparação (templates/scripts):     30 min  ✅ FEITO
Aplicação automática (script):       10 min
Ajustes manuais por página:          2-3 min cada
Total (58 páginas):                  ~2-3 horas

Breakdown:
- Financeiro (19 págs):   40 min
- TMS (5 págs):           10 min
- Fiscal (6 págs):        12 min
- Frota (6 págs):         12 min
- WMS (2 págs):           5 min
- Comercial (5 págs):     10 min
- Cadastros (6 págs):     12 min
- Configurações (9 págs): 18 min
- Dashboard + Perfil:     10 min
- Testes finais:          30 min
```

---

## 🚀 EXECUÇÃO RECOMENDADA

### **Opção A: Manual Controlado** (Recomendado)
```
1. Aplicar por módulo (um de cada vez)
2. Testar cada módulo antes de prosseguir
3. Ajustar conforme necessário
4. Documenta anomalias
```

**Vantagens:**
- ✅ Controle total
- ✅ Testes intermediários
- ✅ Ajustes fáceis
- ✅ Sem risco de quebrar tudo

---

### **Opção B: Script Automático** (Rápido)
```
1. Executar script de substituição global
2. Ajustar cores manualmente depois
3. Testar tudo no final
```

**Vantagens:**
- ✅ Muito rápido (10 min)
- ✅ Consistência garantida

**Desvantagens:**
- ⚠️ Pode precisar ajustes depois
- ⚠️ Testa tudo no final

---

## 📝 EXEMPLO COMPLETO

### **ANTES (Contas a Pagar - genérico):**
```tsx
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { GradientText } from "@/components/ui/magic-components";

<GradientText className="text-3xl font-bold mb-2">
  💰 Contas a Pagar
</GradientText>

<ShimmerButton
  onClick={handleRefresh}
  className="bg-gradient-to-r from-blue-600 to-cyan-600"
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Atualizar
</ShimmerButton>

<Card className="border-purple-500/30">
  <h3>Total a Pagar</h3>
  <div className="text-2xl font-bold text-white">
    R$ {valor}
  </div>
</Card>
```

### **DEPOIS (Contas a Pagar - Aurora):**
```tsx
import { RippleButton } from "@/components/ui/ripple-button";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";

<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
  💰 Contas a Pagar
</h1>

<RippleButton
  onClick={handleRefresh}
  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Atualizar
</RippleButton>

<GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
  <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
        <DollarSign className="h-6 w-6 text-purple-400" />
      </div>
      <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
        Total
      </span>
    </div>
    <h3 className="text-sm font-medium text-slate-400 mb-2">Total a Pagar</h3>
    <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
      R$ <NumberCounter value={valor} />
    </div>
    <p className="text-xs text-slate-500 mt-2">{count} conta(s)</p>
  </div>
</GlassmorphismCard>
```

---

## 🎯 RESULTADO ESPERADO

Após aplicar em todas as 58 páginas:

```
✅ 100% das páginas com RippleButton (não Shimmer)
✅ 100% dos títulos com gradiente Aurora
✅ 100% dos botões com cores Aurora semânticas
✅ 100% dos cards KPI com glassmorphism Aurora
✅ 100% dos módulos com identidade de cor única
✅ 0 erros de linter
✅ Sistema visualmente consistente
✅ Identidade Aurora em todo o sistema
```

---

## 📄 PRÓXIMOS PASSOS

1. **Revisar este guia** (você está aqui)
2. **Escolher método de execução:**
   - [ ] A) Manual Controlado (recomendado)
   - [ ] B) Script Automático (rápido)
3. **Aplicar sistematicamente**
4. **Testar cada módulo**
5. **Documentar conclusão**

---

**🌌 Guia completo criado! Pronto para transformar o Aura Core em 100% Aurora!**





