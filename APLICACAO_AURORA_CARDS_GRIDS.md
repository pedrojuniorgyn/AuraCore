# 🎨 APLICAÇÃO AURORA - CARDS KPI + GRIDS

**Data:** 09/12/2025  
**Objetivo:** Aplicar padrão Contas a Pagar/Receber em 12 páginas

---

## ✅ PÁGINAS TRANSFORMADAS

### **1. BTG Dashboard** ✅ COMPLETO
**Arquivo:** `src/app/(dashboard)/financeiro/btg-dashboard/page.tsx`

**Aplicações:**
- ✅ 4 Cards KPI Glassmorphism premium
- ✅ NumberCounter com gradientes
- ✅ Botões RippleButton Aurora
- ✅ PageTransition + FadeIn
- ✅ Card de status com GlassmorphismCard

---

## 🔄 PRÓXIMAS PÁGINAS (11)

### **Padrão a Aplicar em Todas:**

#### **Cards KPI Premium:**
```tsx
<GlassmorphismCard className="border-[color]/30 hover:border-[color]/50 transition-all hover:shadow-lg hover:shadow-[color]/20">
  <div className="p-6 bg-gradient-to-br from-[color]-900/10 to-[color]-800/5">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gradient-to-br from-[color]-500/20 to-[color2]-500/20 rounded-xl shadow-inner">
        <Icon className="h-6 w-6 text-[color]-400" />
      </div>
      <span className="text-xs text-[color]-300 font-semibold px-3 py-1 bg-gradient-to-r from-[color]-500/20 to-[color2]-500/20 rounded-full border border-[color]-400/30">
        Label
      </span>
    </div>
    <h3 className="text-sm font-medium text-slate-400 mb-2">Título</h3>
    <div className="text-2xl font-bold bg-gradient-to-r from-[color]-400 to-[color2]-400 bg-clip-text text-transparent">
      <NumberCounter value={valor} />
    </div>
  </div>
</GlassmorphismCard>
```

#### **AG Grid Altura Adequada:**
```tsx
<div className="ag-theme-quartz-dark" style={{ height: 'calc(100vh - 400px)', width: '100%' }}>
  <AgGridReact
    rowData={data}
    columnDefs={columnDefs}
    pagination={true}
    paginationPageSize={20}
    {...otherProps}
  />
</div>
```

#### **Botões RippleButton:**
```tsx
<RippleButton className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
  Texto
</RippleButton>
```

---

## 📋 LISTA DE TRABALHO

### **2. BTG Testes** 🔄
- [ ] Transformar cards brancos em Glassmorphism
- [ ] Botões → RippleButton Aurora
- [ ] Aplicar FadeIn

### **3. Conciliação Bancária** 🔄  
- [ ] Adicionar 3 Cards KPI (Total, Conciliadas, Pendentes)
- [ ] AG Grid altura: calc(100vh - 450px)
- [ ] Botão Importar OFX → RippleButton

### **4. DDA** 🔄
- [ ] Cards existentes → Glassmorphism premium
- [ ] AG Grid altura ajustada
- [ ] Botão Sincronizar → RippleButton

### **5. Plano de Contas** 🔄
- [ ] Adicionar 4 Cards KPI (Total Contas, Receitas, Despesas, Ativos)
- [ ] AG Grid altura: calc(100vh - 500px)
- [ ] Botão Nova Conta → RippleButton Aurora

### **6. Remessas CNAB** 🔄
- [ ] Adicionar 3 Cards KPI (Títulos, Total R$, Status)
- [ ] AG Grid altura: calc(100vh - 450px)
- [ ] Botão Gerar CNAB → RippleButton

### **7. Impostos Recuperáveis** 🔄
- [ ] Cards existentes → Glassmorphism premium
- [ ] Adicionar AG Grid completo (h: calc(100vh - 400px))
- [ ] Cores Aurora aplicadas

### **8. Matriz Tributária** 🔄
- [ ] Adicionar 2 Cards KPI (Total Rotas, Média ICMS)
- [ ] AG Grid altura: calc(100vh - 450px)
- [ ] Botões → RippleButton

### **9. NFe Entrada** 🔄
- [ ] Adicionar 4 Cards KPI (Total NFes, Valor Total, Compras, Cargas)
- [ ] AG Grid altura: calc(100vh - 500px) (CRITICAL!)
- [ ] Botão Importar da Sefaz → RippleButton

### **10. Centros de Custo** 🔄
- [ ] Adicionar 3 Cards KPI (Total, Analíticos, Sintéticos)
- [ ] AG Grid altura: calc(100vh - 450px)
- [ ] Botão Novo Centro → RippleButton

### **11. Tabelas de Frete** 🔄
- [ ] Adicionar 3 Cards KPI (Total Tabelas, Rotas, Média R$/KM)
- [ ] AG Grid altura adequada
- [ ] Botão Nova Tabela → RippleButton

### **12. CTe** 🔄
- [ ] Adicionar 4 Cards KPI (Total CTes, Autorizados, Rascunhos, Rejeitados)
- [ ] AG Grid altura: calc(100vh - 500px)
- [ ] Cores por status (verde, azul, amarelo, vermelho)

---

## 🎯 PRIORIDADES

### **CRITICAL (Grids muito pequenos):**
1. NFe Entrada - Grid muito pequeno na tela
2. Centros de Custo - Grid precisa ocupar mais espaço
3. Plano de Contas - Árvore precisa mais altura

### **HIGH (Faltam Cards KPI):**
1. Conciliação - Sem cards
2. Remessas - Sem cards  
3. CTe - Só tem números, precisa cards premium

### **MEDIUM (Ajustes visuais):**
1. DDA - Cards já existem, só precisam virar premium
2. Impostos - Idem
3. Matriz Tributária - Precisa cards + ajustes

---

## 📊 ESTIMATIVA

- **BTG Dashboard:** ✅ 100% Completo (10 min)
- **11 páginas restantes:** ⏳ ~60-90 min
- **Total:** 70-100 minutos

---

## 🚀 EXECUÇÃO

Aplicando agora de forma sistemática em todas as páginas!

**Status:** 🔄 EM ANDAMENTO





