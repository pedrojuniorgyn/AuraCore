# 🔍 PROMPT: VERIFICAÇÃO COMPLETA TYPESCRIPT - AURACORE

**Data/Hora de Criação:** 2026-01-05 17:20:00 UTC  
**Épico:** E7.12  
**Autor:** Claude (Arquiteto Enterprise)  
**Versão:** 1.0.0

---

## 📌 INSTRUÇÕES DE USO

Este prompt deve ser utilizado para verificar a qualidade TypeScript do AuraCore. Execute-o:
1. **ANTES** de cada commit
2. **DEPOIS** de cada commit
3. **Periodicamente** para auditoria

---

## 🎯 OBJETIVO

Executar verificação completa de erros TypeScript seguindo padrão enterprise.

---

## 📋 CHECKLIST DE EXECUÇÃO

### 1. Preparação
```bash
cd /path/to/aura_core
git status  # Garantir working tree limpa
echo "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
```

### 2. Verificação TSC (Principal)
```bash
echo "=== VERIFICAÇÃO TSC ==="
echo "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"
npx tsc --noEmit --incremental false 2>&1 | tee /tmp/tsc-check.txt
TSC_ERRORS=$(grep -c "error TS" /tmp/tsc-check.txt 2>/dev/null || echo "0")
echo "📊 Erros TSC: $TSC_ERRORS"
```

### 3. Verificação de `any`
```bash
echo "=== VERIFICAÇÃO ANY ==="
ANY_EXPLICIT=$(grep -rn ": any" src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test." | grep -v ".spec." | wc -l | tr -d ' ')
ANY_AS=$(grep -rn "as any" src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | wc -l | tr -d ' ')
echo "📊 any explícito: $ANY_EXPLICIT"
echo "📊 as any: $ANY_AS"
```

### 4. Verificação de Suppressions
```bash
echo "=== VERIFICAÇÃO SUPPRESSIONS ==="
TS_IGNORE=$(grep -rn "@ts-ignore" src --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
TS_NOCHECK=$(grep -rn "@ts-nocheck" src --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
TS_EXPECT=$(grep -rn "@ts-expect-error" src --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
echo "📊 @ts-ignore: $TS_IGNORE"
echo "📊 @ts-nocheck: $TS_NOCHECK"
echo "📊 @ts-expect-error: $TS_EXPECT"
```

### 5. Verificação ESLint
```bash
echo "=== VERIFICAÇÃO ESLINT ==="
npm run lint 2>&1 | tee /tmp/eslint-check.txt
ESLINT_ERRORS=$(grep -c " error " /tmp/eslint-check.txt 2>/dev/null || echo "0")
ESLINT_WARNINGS=$(grep -c " warning " /tmp/eslint-check.txt 2>/dev/null || echo "0")
echo "📊 Erros ESLint: $ESLINT_ERRORS"
echo "📊 Warnings ESLint: $ESLINT_WARNINGS"
```

### 6. Verificação Circular (Madge)
```bash
echo "=== VERIFICAÇÃO CIRCULAR ==="
# Verificar se madge está instalado
if ! command -v npx madge &> /dev/null; then
    echo "⚠️ Madge não instalado. Execute: npm install --save-dev madge"
else
    npx madge --circular --extensions ts src/ 2>&1 | tee /tmp/madge-check.txt
    CIRCULAR=$(grep -c "Found" /tmp/madge-check.txt 2>/dev/null || echo "0")
    if [ "$CIRCULAR" -gt 0 ]; then
        echo "❌ Dependências circulares encontradas!"
        cat /tmp/madge-check.txt
    else
        echo "✅ Nenhuma dependência circular"
    fi
fi
```

### 7. Verificação de Build
```bash
echo "=== VERIFICAÇÃO BUILD ==="
npm run build 2>&1 | tee /tmp/build-check.txt
BUILD_STATUS=$?
if [ $BUILD_STATUS -eq 0 ]; then
    echo "📊 Build Status: SUCCESS ✅"
else
    echo "📊 Build Status: FAILED ❌"
    echo "Últimas 20 linhas do log:"
    tail -20 /tmp/build-check.txt
fi
```

### 8. Verificação de Testes
```bash
echo "=== VERIFICAÇÃO TESTES ==="
npm test -- --run 2>&1 | tee /tmp/test-check.txt
TEST_STATUS=$?
TESTS_PASSED=$(grep -oP '\d+(?= passed)' /tmp/test-check.txt | tail -1 || echo "0")
TESTS_FAILED=$(grep -oP '\d+(?= failed)' /tmp/test-check.txt | tail -1 || echo "0")
echo "📊 Testes Passando: $TESTS_PASSED"
echo "📊 Testes Falhando: $TESTS_FAILED"
```

---

## 📊 CRITÉRIOS DE SUCESSO

| Verificação | Esperado | Tolerância |
|-------------|----------|------------|
| Erros TSC | 0 | ❌ Zero tolerância |
| any explícito | 0 | ❌ Zero tolerância |
| as any | 0 | ❌ Zero tolerância |
| @ts-ignore | 0 | ❌ Zero tolerância |
| @ts-nocheck | 0 | ❌ Zero tolerância |
| @ts-expect-error | 0 | ⚠️ Apenas em testes |
| Erros ESLint | 0 | ❌ Zero tolerância |
| Warnings ESLint | < 10 | ⚠️ Monitorar |
| Deps Circulares | 0 | ❌ Zero tolerância |
| Build | SUCCESS | ❌ Zero tolerância |
| Testes Falhando | 0 | ❌ Zero tolerância |

---

## 📋 TEMPLATE DE RELATÓRIO

Copie e preencha após executar as verificações:

```markdown
# RELATÓRIO DE VERIFICAÇÃO TYPESCRIPT

**Data/Hora:** YYYY-MM-DD HH:MM:SS
**Projeto:** AuraCore ERP
**Branch:** [BRANCH]
**Commit:** [SHORT_HASH]
**Verificado por:** [AGENTE/PESSOA]

## Resultados

| Verificação | Esperado | Encontrado | Status |
|-------------|----------|------------|--------|
| Erros TSC | 0 | [X] | ✅/❌ |
| any explícito | 0 | [X] | ✅/❌ |
| as any | 0 | [X] | ✅/❌ |
| @ts-ignore | 0 | [X] | ✅/❌ |
| @ts-nocheck | 0 | [X] | ✅/❌ |
| @ts-expect-error | 0 | [X] | ✅/❌ |
| Erros ESLint | 0 | [X] | ✅/❌ |
| Warnings ESLint | <10 | [X] | ✅/⚠️ |
| Deps Circulares | 0 | [X] | ✅/❌ |
| Build | SUCCESS | [X] | ✅/❌ |
| Testes Passando | [TOTAL] | [X] | ✅/❌ |
| Testes Falhando | 0 | [X] | ✅/❌ |

## Resultado Geral: ✅ APROVADO / ❌ REPROVADO

## Arquivos com Problemas (se houver)
[LISTAR ARQUIVOS]

## Ações Necessárias (se houver)
[LISTAR AÇÕES]

## Assinatura
- Verificado por: [AGENTE/PESSOA]
- Data/Hora: [DATA/HORA]
- Commit: [HASH]
```

---

## 🔧 SCRIPT AUTOMATIZADO

Para automatizar, crie o arquivo `scripts/verify-typescript.sh`:

```bash
#!/bin/bash
# ==============================================
# AuraCore TypeScript Verification Script
# Data: 2026-01-05
# ==============================================

set -e

echo "=============================================="
echo "AURACORE TYPESCRIPT VERIFICATION"
echo "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
echo "=============================================="

ERRORS=0

# TSC Check
echo -e "\n=== TSC CHECK ==="
TSC_OUTPUT=$(npx tsc --noEmit --incremental false 2>&1 || true)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")
echo "Erros TSC: $TSC_ERRORS"
if [ "$TSC_ERRORS" -gt 0 ]; then
    ERRORS=$((ERRORS + 1))
fi

# Any Check
echo -e "\n=== ANY CHECK ==="
ANY_EXPLICIT=$(grep -rn ": any" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | wc -l | tr -d ' ')
ANY_AS=$(grep -rn "as any" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
echo "any explícito: $ANY_EXPLICIT"
echo "as any: $ANY_AS"
if [ "$ANY_EXPLICIT" -gt 0 ] || [ "$ANY_AS" -gt 0 ]; then
    ERRORS=$((ERRORS + 1))
fi

# Suppressions Check
echo -e "\n=== SUPPRESSIONS CHECK ==="
TS_IGNORE=$(grep -rn "@ts-ignore" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
TS_NOCHECK=$(grep -rn "@ts-nocheck" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "@ts-ignore: $TS_IGNORE"
echo "@ts-nocheck: $TS_NOCHECK"
if [ "$TS_IGNORE" -gt 0 ] || [ "$TS_NOCHECK" -gt 0 ]; then
    ERRORS=$((ERRORS + 1))
fi

# ESLint Check
echo -e "\n=== ESLINT CHECK ==="
ESLINT_OUTPUT=$(npm run lint 2>&1 || true)
ESLINT_ERRORS=$(echo "$ESLINT_OUTPUT" | grep -c " error " || echo "0")
echo "Erros ESLint: $ESLINT_ERRORS"
if [ "$ESLINT_ERRORS" -gt 0 ]; then
    ERRORS=$((ERRORS + 1))
fi

# Build Check
echo -e "\n=== BUILD CHECK ==="
if npm run build > /dev/null 2>&1; then
    echo "Build: SUCCESS ✅"
else
    echo "Build: FAILED ❌"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo -e "\n=============================================="
if [ "$ERRORS" -eq 0 ]; then
    echo "✅ VERIFICAÇÃO APROVADA"
    exit 0
else
    echo "❌ VERIFICAÇÃO REPROVADA ($ERRORS categorias com problemas)"
    exit 1
fi
```

**Uso:**
```bash
chmod +x scripts/verify-typescript.sh
./scripts/verify-typescript.sh
```

---

## 🔄 INTEGRAÇÃO COM MCP

Use as tools MCP para verificação:

```
Tool: check_cursor_issues
Args: { "context": "full-project" }

Tool: validate_code
Args: { 
  "code": "[código a validar]",
  "contract_ids": ["type-safety"]
}

Tool: check_compliance
Args: { "file_path": "src/modules/financial/domain/use-cases/PayAccountPayable.ts" }
```

---

## 📝 QUANDO USAR

| Momento | Obrigatório | Comando |
|---------|-------------|---------|
| Antes do commit | ✅ SIM | `./scripts/verify-typescript.sh` |
| Depois do commit | ✅ SIM | `./scripts/verify-typescript.sh` |
| Antes do push | ✅ SIM | `./scripts/verify-typescript.sh` |
| CI/CD | ✅ SIM | Automático via GitHub Actions |
| Auditoria semanal | ⚠️ Recomendado | `./scripts/verify-typescript.sh` |

---

*Documento criado em: 2026-01-05 17:20:00 UTC*
*Épico: E7.12 - Documentação 100%*
