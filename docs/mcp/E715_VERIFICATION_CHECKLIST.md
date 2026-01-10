# E7.15 - Checklist de Verificação Final

**Versão:** 1.0.0  
**Data:** 10/01/2026  
**Épico:** E7.15 - Enterprise Type Safety

---

## 🔍 PRÉ-PUSH (OBRIGATÓRIO)

Execute TODOS os comandos antes de fazer push:

```bash
# 1. TypeScript - DEVE retornar 0 erros
npx tsc --noEmit
# Resultado esperado: sem output ou "Found 0 errors"

# 2. ESLint - DEVE retornar 0 errors (warnings OK)
npm run lint
# Resultado esperado: "✔ No ESLint errors found"

# 3. Testes - TODOS devem passar
npm test -- --run
# Resultado esperado: "Test Files X passed (X)"

# 4. Cursor Issues - DEVE retornar 0 issues
# (via MCP tool check_cursor_issues)
```

### ✅ Critérios de Sucesso

- [ ] `npx tsc --noEmit` = 0 erros
- [ ] `npm run lint` = 0 errors (warnings permitidos)
- [ ] `npm test -- --run` = todos passando
- [ ] `check_cursor_issues` = 0 issues

---

## 🎯 PADRÕES VERIFICADOS

### Categoria 1: Error Handling

- [ ] Nenhum `catch (error: any)`
- [ ] Nenhum `error.message` direto em catch blocks
- [ ] Todos os catch usam `error instanceof Error`

**Verificação:**
```bash
# Deve retornar 0
grep -rn "catch (error: any)" src/ --include="*.ts" --include="*.tsx" | wc -l

# Deve retornar 0 (exceto se dentro de instanceof check)
grep -rn "error\.message" src/ --include="*.ts" --include="*.tsx" | grep -v "instanceof Error" | wc -l
```

---

### Categoria 2: Multi-Tenancy

- [ ] Nenhum `branchId ?? 0`
- [ ] Nenhum `branchId` opcional em filters
- [ ] Todos os endpoints validam `branchId` antes de uso

**Verificação:**
```bash
# Deve retornar 0
grep -rn "branchId ?? 0" src/ --include="*.ts" --include="*.tsx" | wc -l

# Verificar que branchId é validado em rotas
grep -rn "if (!.*branchId)" src/app/api --include="*.ts" | wc -l
# Resultado esperado: > 50 (maioria das rotas)
```

---

### Categoria 3: Operador Precedence

- [ ] Todos os `?? X >= Y` têm parênteses: `(?? X) >= Y`
- [ ] Todos os `?? X <= Y` têm parênteses: `(?? X) <= Y`

**Verificação:**
```bash
# Buscar padrões sem parênteses (deve retornar 0)
grep -rn "\?\? [0-9] >=" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -rn "\?\? [0-9] <=" src/ --include="*.ts" --include="*.tsx" | wc -l
```

---

### Categoria 4: Type Assertions

- [ ] Type assertions documentadas (comentário ou óbvio pelo contexto)
- [ ] Nenhum `as any` desnecessário
- [ ] `as any` restrito a casos Drizzle ou bibliotecas externas

**Verificação:**
```bash
# Listar todos os "as any" para revisão manual
grep -rn "as any" src/ --include="*.ts" --include="*.tsx"
# Verificar que cada um tem justificativa (Drizzle, lib externa, etc)
```

---

### Categoria 5: Variáveis Não Usadas

- [ ] Variáveis não usadas prefixadas com `_`
- [ ] Nenhum warning ESLint de variável não usada

**Verificação:**
```bash
# ESLint deve passar sem warnings de unused vars
npm run lint 2>&1 | grep "is defined but never used"
# Resultado esperado: sem output
```

---

## 🔥 ARQUIVOS CRÍTICOS VERIFICADOS

Estes arquivos têm alto risco de impacto fiscal/financeiro. Verificação extra obrigatória:

### Contábil/Fiscal
- [ ] `src/services/accounting-engine.ts` - Contabilização automática
- [ ] `src/services/sped-fiscal-generator.ts` - SPED Fiscal (multa R$ 5k+)
- [ ] `src/services/sped-ecd-generator.ts` - SPED Contábil (multa R$ 5k+)
- [ ] `src/services/sped-contributions-generator.ts` - SPED PIS/COFINS (multa R$ 5k+)

### Financeiro
- [ ] `src/services/financial-title-generator.ts` - Títulos financeiros
- [ ] `src/modules/financial/application/commands/` - Comandos financeiros

### Domínio Fiscal
- [ ] `src/modules/fiscal/domain/entities/FiscalDocument.ts` - Documento fiscal base
- [ ] `src/modules/fiscal/domain/value-objects/DocumentType.ts` - Máquina de estados

### Autenticação/Autorização
- [ ] `src/lib/auth/api-guard.ts` - Autorização de rotas
- [ ] `src/lib/auth/context.ts` - Contexto de execução

**Verificação:**
```bash
# Verificar que arquivos críticos compilam sem erros
npx tsc --noEmit src/services/accounting-engine.ts
npx tsc --noEmit src/services/sped-fiscal-generator.ts
npx tsc --noEmit src/lib/auth/api-guard.ts
```

---

## 📊 MÉTRICAS DE QUALIDADE

### Antes vs Depois

| Métrica | Antes (E7.14) | Depois (E7.15) | Meta |
|---------|---------------|----------------|------|
| TypeScript Errors | ~706 | 0 | ✅ 0 |
| ESLint Errors | ~104 | 0 | ✅ 0 |
| Testes Passando | ~95% | 100% | ✅ 100% |
| Cobertura | ~70% | ~70% | 🟡 Manter |

### Verificação de Cobertura

```bash
# Executar testes com coverage
npm test -- --run --coverage

# Verificar que cobertura não diminuiu
# Meta: >=70% em todos os módulos críticos
```

---

## 🚨 RED FLAGS (PARAR SE ENCONTRAR)

Se qualquer um destes for encontrado, **PARAR e corrigir antes de push**:

1. ❌ `as any` em lógica de negócio (fora de Drizzle/libs)
2. ❌ `branchId ?? 0` em queries de banco
3. ❌ `error.message` direto em catch (sem instanceof)
4. ❌ Teste falhando ou skipado (`.skip()`)
5. ❌ Warning de type safety em arquivo crítico (SPED, contábil)
6. ❌ `TODO` ou `FIXME` em código de produção
7. ❌ Console.log não removido em arquivos de produção

**Busca automatizada:**
```bash
# Buscar red flags
grep -rn "as any" src/services/ src/modules/*/domain/ --include="*.ts"
grep -rn "branchId ?? 0" src/ --include="*.ts"
grep -rn "\.skip\(" tests/ --include="*.ts"
grep -rn "TODO\|FIXME" src/services/ src/modules/*/domain/ --include="*.ts"
```

---

## 📝 ASSINATURA DE APROVAÇÃO

Após verificar TODOS os itens acima:

```
✅ Verificação concluída em: __________
✅ Responsável: __________
✅ Status: APROVADO / REPROVADO
✅ Push autorizado: SIM / NÃO
```

---

## 📚 REFERÊNCIAS

- ADR-0016: E7.15 Type Safety
- regrasmcp.mdc: Regras MCP Obrigatórias
- E715_EXECUTIVE_REPORT.md: Relatório executivo
- docs/mcp/SMP_ANTI_PATTERNS.md: Anti-patterns a evitar

---

**Última atualização:** 10/01/2026  
**Versão:** 1.0.0
