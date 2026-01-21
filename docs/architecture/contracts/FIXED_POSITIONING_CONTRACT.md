# Contract — Fixed Positioning with Transforms

**Version:** 1.0.0  
**Created:** 21/01/2026  
**Last Updated:** 21/01/2026  
**Status:** ACTIVE

---

## 📋 Classificação

- **Tipo:** Padrão de CSS/React
- **Prioridade:** 🔴 ALTA
- **Aplicação:** Componentes com `position: fixed`
- **Severidade:** CRÍTICA (quebra UX)

---

## 🎯 Contexto

Este contrato foi criado após bug descoberto no **Quick Win 5** (21/01/2026), onde o `AIInsightWidget` (position: fixed) foi colocado dentro do `PageTransition` (que usa CSS transforms via Framer Motion).

**Resultado:** Widget não ficava no canto da tela, mas sim relativo ao container transformado.

**Arquivos Afetados:**
- 4 páginas do módulo Financial
- 3 páginas do módulo Fiscal
- **Total:** 7 arquivos corrigidos

---

## 🚫 Regra Obrigatória (FIXED-001)

### NUNCA colocar elementos com `position: fixed` dentro de containers que usam CSS transforms.

---

## 🔬 Por que isso acontece?

### CSS Specification

```
CSS Transforms Specification (W3C):
├── transform cria novo "containing block" para elementos fixed
├── Elementos fixed passam a ser posicionados relativo ao ancestor transformado
└── Comportamento esperado (relativo ao viewport) é quebrado
```

### Demonstração Visual

```
ANTES (INCORRETO):
<PageTransition>  ← aplica transform: translateX(...)
  <div>Conteúdo</div>
  <AIInsightWidget position="fixed" bottom="20px" right="20px" />
  └─> Widget fica relativo ao PageTransition, não ao viewport!
</PageTransition>

DEPOIS (CORRETO):
<>
  <PageTransition>
    <div>Conteúdo</div>
  </PageTransition>
  <AIInsightWidget position="fixed" bottom="20px" right="20px" />
  └─> Widget fica relativo ao viewport ✅
</>
```

---

## 🎨 Containers que criam este problema

| Container | Motivo | Biblioteca | Severidade |
|-----------|--------|------------|------------|
| `PageTransition` | Usa transform para animação | Framer Motion | 🔴 CRÍTICA |
| `AnimatePresence` children | transform durante exit | Framer Motion | 🔴 ALTA |
| `motion.div` com animate | transform properties | Framer Motion | 🔴 ALTA |
| Qualquer elemento com CSS transform | CSS spec | Nativo | 🔴 ALTA |

---

## 🧩 Componentes que usam fixed e são afetados

| Componente | Posição | Deve ficar FORA de transforms |
|------------|---------|------------------------------|
| `AIInsightWidget` | bottom-right | ✅ Sim |
| `LegislationWidget` | bottom-right | ✅ Sim |
| `VoiceChatButton` | bottom-right | ✅ Sim |
| Toast/Notifications | top/bottom | ✅ Sim |
| Modal overlays | center | ✅ Sim |

---

## ✅ Padrão Correto

### Exemplo 1: Widget Único

```tsx
// ✅ CORRETO: Fixed element FORA do transform
export default function Page() {
  return (
    <>
      <PageTransition>
        <div className="p-8">
          {/* Conteúdo animado */}
        </div>
      </PageTransition>
      
      {/* Fixed elements FORA */}
      <AIInsightWidget 
        position="bottom-right" 
        agentType="financial"
      />
    </>
  );
}
```

### Exemplo 2: Múltiplos Widgets

```tsx
// ✅ CORRETO: Container fixed com múltiplos widgets
export default function Page() {
  return (
    <>
      <PageTransition>
        <div className="p-8">
          {/* Conteúdo animado */}
        </div>
      </PageTransition>
      
      {/* Container fixed FORA do PageTransition */}
      <div className="fixed bottom-6 right-6 z-50 space-y-4 w-96">
        <LegislationWidget documentType="nfe" />
        <AIInsightWidget agentType="fiscal" />
      </div>
    </>
  );
}
```

---

## ❌ Anti-Pattern

```tsx
// ❌ INCORRETO: Fixed element DENTRO do transform
export default function Page() {
  return (
    <PageTransition>
      <div className="p-8">
        {/* Conteúdo animado */}
      </div>
      
      {/* QUEBRADO! Widget não fica no canto da tela */}
      <AIInsightWidget position="bottom-right" />
    </PageTransition>
  );
}
```

**Problema:** Widget fica posicionado relativo ao `PageTransition`, não ao viewport.

---

## 📋 Checklist para Componentes Fixed

Antes de adicionar componente com fixed positioning:

- [ ] Verificar se está FORA de qualquer container com transform
- [ ] Verificar se não está dentro de `PageTransition`
- [ ] Verificar se não está dentro de `motion.div` animado
- [ ] Verificar se não está dentro de `AnimatePresence` children
- [ ] Testar visualmente que fica na posição correta
- [ ] Executar comando de verificação (abaixo)

---

## 🔍 Comando de Verificação

### Verificar Problemas no Codebase

```bash
#!/bin/bash
# Buscar possíveis problemas de fixed positioning

PROBLEMS=0
for file in $(find src/app -name "page.tsx"); do
  if grep -q "PageTransition" "$file" && grep -q "AIInsightWidget\|LegislationWidget" "$file"; then
    # Pegar linha do widget IGNORANDO imports
    WIDGET_LINE=$(grep -n "<AIInsightWidget\|<LegislationWidget" "$file" | head -1 | cut -d: -f1)
    CLOSE_LINE=$(grep -n "</PageTransition>" "$file" | head -1 | cut -d: -f1)
    
    if [ -n "$WIDGET_LINE" ] && [ -n "$CLOSE_LINE" ]; then
      if [ "$WIDGET_LINE" -lt "$CLOSE_LINE" ]; then
        echo "❌ PROBLEMA: $file"
        echo "   Widget na linha $WIDGET_LINE está ANTES de </PageTransition> na linha $CLOSE_LINE"
        PROBLEMS=$((PROBLEMS + 1))
      fi
    fi
  fi
done

if [ $PROBLEMS -eq 0 ]; then
  echo "✅ Nenhum problema encontrado!"
else
  echo "⚠️  $PROBLEMS arquivo(s) com problema"
fi
```

### Adicionar ao Pre-Commit Hook

```bash
# .husky/pre-commit
# Verificar fixed positioning
bash scripts/check-fixed-positioning.sh || exit 1
```

---

## 📊 Impacto do Bug

| Aspecto | Antes (Incorreto) | Depois (Correto) |
|---------|-------------------|------------------|
| Posicionamento | Relativo ao container | Relativo ao viewport ✅ |
| UX | Widget "pula" durante animação | Widget fixo no canto ✅ |
| Consistência | Inconsistente entre páginas | Consistente ✅ |
| Manutenibilidade | Difícil debugar | Óbvio e previsível ✅ |

---

## 🧪 Como Testar

### Teste Manual

1. Abrir página com widget fixed
2. Navegar entre páginas (trigger PageTransition)
3. Verificar que widget **permanece no canto** durante animação
4. Verificar que widget **não se move** com scroll

### Teste Automatizado

```typescript
// tests/e2e/fixed-positioning.spec.ts
import { test, expect } from '@playwright/test';

test('AIInsightWidget deve ficar fixo no canto', async ({ page }) => {
  await page.goto('/financeiro/contas-pagar');
  
  const widget = page.locator('[data-testid="ai-insight-widget"]');
  
  // Verificar posição inicial
  const box1 = await widget.boundingBox();
  expect(box1?.x).toBeGreaterThan(window.innerWidth - 500);
  
  // Scroll da página
  await page.evaluate(() => window.scrollBy(0, 500));
  
  // Verificar que posição não mudou
  const box2 = await widget.boundingBox();
  expect(box2?.x).toBe(box1?.x);
  expect(box2?.y).toBe(box1?.y);
});
```

---

## 📚 Referências

### Incidente Original
- **Data:** 21/01/2026
- **Quick Win:** QW5 - Financial Integration
- **Arquivos Afetados:** 7 páginas (4 Financial + 3 Fiscal)
- **Correção:** LC-QW5-FIXED-001

### Especificações CSS
- [CSS Transforms Module Level 1 - W3C](https://www.w3.org/TR/css-transforms-1/#containing-block-for-all-descendants)
- [CSS Positioned Layout Module Level 3 - W3C](https://www.w3.org/TR/css-position-3/#fixed-positioning)

### Framer Motion
- [Framer Motion - Transform](https://www.framer.com/motion/transform/)
- [Framer Motion - AnimatePresence](https://www.framer.com/motion/animate-presence/)

---

## 🔄 Histórico de Revisões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0.0 | 21/01/2026 | Claude (Hotfix QW5) | Criação inicial do contrato |

---

## ✅ Aprovação

- **Aprovado por:** Equipe AuraCore
- **Data:** 21/01/2026
- **Status:** ATIVO

---

**FIM DO CONTRATO - FIXED_POSITIONING_CONTRACT.md**
