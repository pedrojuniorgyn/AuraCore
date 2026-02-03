# 🧪 Testes E2E - Playwright

Testes end-to-end para AuraCore usando Playwright.

---

## 📋 Estrutura

```
tests/e2e/
├── strategic/
│   ├── ideas-grid.spec.ts     # Testes da página Ideas Grid
│   ├── pdca-grid.spec.ts      # Testes da página PDCA Grid
│   └── swot-grid.spec.ts      # Testes da página SWOT Grid
└── README.md
```

---

## 🚀 Como Executar

### **Instalar browsers (primeira vez)**
```bash
npx playwright install
```

### **Rodar todos os testes**
```bash
npm run test:e2e
```

### **Rodar testes de um arquivo específico**
```bash
npm run test:e2e -- ideas-grid.spec.ts
```

### **Modo UI (debug visual)**
```bash
npm run test:e2e:ui
```

### **Modo headed (ver browser)**
```bash
npm run test:e2e -- --headed
```

### **Rodar em browser específico**
```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

---

## 📊 Relatórios

Após executar os testes, abra o relatório HTML:

```bash
npx playwright show-report
```

---

## 🐛 Debug

### **Modo debug (breakpoints)**
```bash
npx playwright test --debug
```

### **Trace viewer (ver gravação)**
```bash
npx playwright show-trace trace.zip
```

### **Screenshots**
Screenshots de falhas ficam em `test-results/`

---

## ✅ Checklist de Testes por Página

### **Ideas Grid**
- [x] Navegação Cards → Grid
- [x] Navegação Grid → Cards
- [x] Master-Detail expande
- [x] Colunas corretas renderizadas
- [x] ARIA labels presentes
- [ ] Filtros funcionam (TODO: após auth)
- [ ] Exportação funciona (TODO: após auth)
- [ ] Responsividade mobile (TODO: após auth)

### **PDCA Grid**
- [ ] TODO: Implementar após auth

### **SWOT Grid**
- [ ] TODO: Implementar após auth

---

## 🔐 Autenticação

**Status:** 🚧 **Pendente**

Os testes estão marcados como `test.skip` até que uma fixture de autenticação seja implementada.

### **Próximos passos:**
1. Criar fixture de autenticação (`tests/e2e/fixtures/auth.ts`)
2. Remover `.skip` dos testes
3. Adicionar `test.use({ storageState: 'auth.json' })`

**Exemplo:**
```typescript
// tests/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Login automático
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@auracore.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    await use(page);
  },
});
```

---

## 📈 CI/CD

Os testes E2E rodam automaticamente no GitHub Actions em:
- Pull requests
- Push para `main`
- Nightly builds

---

## 🎯 Melhores Práticas

1. **Seletores estáveis:** Usar `[aria-label]`, `[data-testid]`, evitar classes CSS
2. **Aguardar elementos:** Usar `waitForSelector`, `waitForURL`
3. **Isolamento:** Cada teste deve ser independente
4. **Cleanup:** Usar `beforeEach`/`afterEach` para estado limpo
5. **Assertivas específicas:** `toHaveURL`, `toBeVisible`, não apenas `toBeTruthy`

---

## 🔗 Referências

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
