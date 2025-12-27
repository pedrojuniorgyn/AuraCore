# AuraCore - Sistema de Qualidade e Aprendizado Contínuo

## Versão: 1.0.0
## Data: 27/12/2025

---

## 1. VISÃO GERAL

O AuraCore possui um sistema integrado de qualidade baseado em MCP (Model Context Protocol) que:
- Valida código automaticamente antes/depois de commits
- Registra correções como regras permanentes
- Impede reincidência de erros conhecidos
- Aprende continuamente com cada correção

---

## 2. ARQUITETURA MCP

### 2.1 Localização
```
mcp-server/
├── src/
│   ├── server.ts              # Servidor principal
│   ├── index.ts               # Entry point
│   └── tools/
│       ├── check-cursor-issues.ts    # Verificação tsc + eslint
│       ├── register-correction.ts    # Registro de correções
│       ├── validate-code.ts          # Validação contra contratos
│       ├── check-compliance.ts       # Compliance de arquivo
│       ├── get-epic-status.ts        # Status de épicos
│       ├── get-contract-tool.ts      # Buscar contrato
│       ├── search-patterns.ts        # Buscar padrões
│       └── propose-pattern.ts        # Propor padrão
├── knowledge/
│   ├── contracts/             # Contratos arquiteturais
│   ├── patterns/
│   │   ├── approved/          # Padrões aprovados
│   │   └── proposed/          # Padrões em avaliação
│   ├── corrections/           # Histórico de correções
│   ├── adrs/                  # Architecture Decision Records
│   └── epics/                 # Status dos épicos
└── dist/                      # Código compilado
```

### 2.2 Configuração Cursor
```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "auracore-knowledge": {
      "command": "node",
      "args": ["/Users/pedrolemes/aura_core/mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

## 3. TOOLS DISPONÍVEIS (9)

### 3.1 Verificação e Validação

| Tool | Função | Quando Usar |
|------|--------|-------------|
| `check_cursor_issues` | Executa tsc + eslint | Antes/depois de commits |
| `validate_code` | Valida código contra contratos | Durante desenvolvimento |
| `check_compliance` | Verifica compliance de arquivo | Revisão de código |

### 3.2 Consulta de Conhecimento

| Tool | Função | Quando Usar |
|------|--------|-------------|
| `get_contract` | Retorna contrato completo | Antes de codificar |
| `search_patterns` | Busca padrões aprovados | Antes de codificar |
| `get_epic_status` | Status de épico | Planejamento |

### 3.3 Registro e Proposta

| Tool | Função | Quando Usar |
|------|--------|-------------|
| `register_correction` | Registra correção permanente | Após corrigir issue |
| `propose_pattern` | Propõe novo padrão | Quando identificar padrão útil |

### 3.4 Utilitários

| Tool | Função | Quando Usar |
|------|--------|-------------|
| `ping` | Teste de conexão | Debug |

---

## 4. CONTRATOS DISPONÍVEIS (7)

| Contrato | Categoria | Descrição |
|----------|-----------|-----------|
| `type-safety` | TypeScript | Regras de tipagem (VIVO - atualiza automaticamente) |
| `api-contract` | API | Regras para Route Handlers |
| `tenant-branch-contract` | Multi-tenancy | Regras de tenant + branch |
| `transactions-contract` | SQL | Regras de transações |
| `error-contract` | Erros | Padrões de erro HTTP |
| `rbac-contract` | Segurança | Regras de permissão |
| `sqlserver-performance-contract` | Performance | Regras de performance SQL |

---

## 5. FLUXO DE QUALIDADE

### 5.1 Fluxo de Commit (OBRIGATÓRIO)
```
1. Codificar alterações
         │
         ▼
2. check_cursor_issues (pré-commit)
         │
         ├── Issues? → Corrigir → Voltar ao 2
         │
         ▼
3. git commit -m "mensagem"
         │
         ▼
4. check_cursor_issues (pós-commit)
         │
         ├── Issues? → Corrigir + register_correction → Novo commit → Voltar ao 4
         │
         ▼
5. git push origin main ✅
```

### 5.2 Fluxo de Desenvolvimento (RECOMENDADO)
```
1. Receber tarefa
         │
         ▼
2. Consultar MCP:
   - get_contract("tipo-relevante")
   - search_patterns("tema")
         │
         ▼
3. Codificar seguindo contratos e padrões
         │
         ▼
4. validate_code no código criado
         │
         ├── Violações? → Corrigir → Voltar ao 4
         │
         ▼
5. Seguir Fluxo de Commit (5.1)
```

---

## 6. SISTEMA DE APRENDIZADO

### 6.1 Como Funciona
```
Erro encontrado
      │
      ▼
Erro corrigido
      │
      ▼
register_correction({
  epic: "E2",
  error_description: "Descrição do erro",
  correction_applied: "Como foi corrigido",
  files_affected: ["arquivo.ts"],
  pattern_name: "nome-do-padrao"
})
      │
      ├──► Salva em corrections/{epic}-corrections.json
      │
      └──► Atualiza type-safety.json (learned_corrections)
             │
             ▼
      validate_code BLOQUEIA este erro em futuros commits
```

### 6.2 Correções Registradas

| ID | Épico | Erro | Padrão Criado |
|----|-------|------|---------------|
| LC-001 | E0.1 | result[0] any implícito | sql-query-typing |
| LC-002 | E0.1 | catch (error: any) | error-handling-unknown |
| LC-677308 | MCP | path traversal | input-sanitization |

---

## 7. ÉPICOS E PROGRESSO

| Épico | Nome | Status | Resultado |
|-------|------|--------|-----------|
| E0.1 | Eliminar any implícito SQL | ✅ COMPLETO | 38 any eliminados |
| E2 | Tipar rotas API | 🔄 PRÓXIMO | - |
| E9 | Arquivos críticos (com testes) | ⏳ FUTURO | - |

---

## 8. ARQUIVOS CRÍTICOS (NÃO TOCAR SEM TESTES)

| Arquivo | Motivo | Risco |
|---------|--------|-------|
| accounting-engine.ts | Contabilização | Multa R$ 5.000+ |
| financial-title-generator.ts | Títulos financeiros | Multa R$ 5.000+ |
| sped-fiscal-generator.ts | SPED Fiscal | Multa R$ 5.000+ |
| sped-ecd-generator.ts | SPED Contábil | Multa R$ 5.000+ |
| sped-contributions-generator.ts | SPED PIS/COFINS | Multa R$ 5.000+ |

---

## 9. REGRAS OBRIGATÓRIAS PARA AGENTES

### 9.1 Antes de Codificar
```
Tool: get_contract
Args: { "contract_id": "type-safety" }

Tool: search_patterns
Args: { "query": "[tema relevante]" }
```

### 9.2 Fluxo de Commit
```
1. check_cursor_issues (pré-commit)
2. Se issues = 0: commit
3. check_cursor_issues (pós-commit)
4. Se issues = 0: push
5. Se issues > 0: corrigir + register_correction + repetir
```

### 9.3 Regras de Código

- ❌ NUNCA use `any` (use `unknown` ou tipo específico)
- ❌ NUNCA use `@ts-ignore` ou `as any`
- ✅ SEMPRE crie interfaces para resultados SQL
- ✅ SEMPRE valide existência antes de acessar propriedades
- ✅ SEMPRE use type guards com `unknown`
- ✅ SEMPRE use Zod para validação de input em APIs

### 9.4 Relatório Final Obrigatório
```markdown
## TAREFA CONCLUÍDA

### Verificações MCP
- check_cursor_issues (pré-commit): ✅/❌
- check_cursor_issues (pós-commit): ✅/❌

### Commits
- Hash: [hash]
- Mensagem: [mensagem]

### Push
- Status: ✅ Realizado / ⏳ Pendente

### Correções Registradas
- [LC-XXXXX]: [descrição] (se houver)
```

---

## 10. COMANDOS ÚTEIS

### MCP Server
```bash
# Rebuild após alterações
cd mcp-server && npm run build

# Verificar se está funcionando
# (verificar ponto verde em Cursor > Settings > Tools & MCP)
```

### Verificação Manual
```bash
# TypeScript
npx tsc --noEmit 2>&1 | grep "error TS" | head -20

# ESLint
npm run lint 2>&1 | grep "error" | head -20

# Contagem de erros
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

---

## 11. TROUBLESHOOTING

### MCP não conecta (ponto vermelho)
1. Verificar se dist/index.js existe: `ls mcp-server/dist/index.js`
2. Rebuild: `cd mcp-server && npm run build`
3. Reiniciar Cursor (Cmd+Q e reabrir)

### Tool não funciona
1. Verificar logs do Cursor
2. Testar tool manualmente no chat
3. Verificar se arquivo .ts foi compilado para .js

### Correção não registrada
1. Verificar se type-safety.json foi atualizado
2. Verificar se corrections/{epic}-corrections.json existe
3. Rebuild MCP Server

---

## 12. PREVENÇÃO DE REGRESSÕES (CRÍTICO) 🚨

### 12.1 Após Scripts de Automação

**SEMPRE** seguir este checklist após executar scripts que modificam múltiplos arquivos:

```bash
# 1. Contar erros ANTES
ANTES=$(npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS")
echo "⏱️  Erros antes: $ANTES"

# 2. Executar script
npx tsx scripts/seu-script.ts

# 3. Contar erros DEPOIS
DEPOIS=$(npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS")
echo "⏱️  Erros depois: $DEPOIS"

# 4. Verificar se padrão antigo ainda existe
PADRÃO_ANTIGO=$(grep -rn "PADRÃO_ANTIGO" src --include="*.ts" | wc -l)
echo "🔍 Padrão antigo restante: $PADRÃO_ANTIGO"

# 5. Decidir
if [ $DEPOIS -gt $ANTES ]; then
  echo "❌ REGRESSÃO DETECTADA! Não fazer commit."
  echo "   Erros aumentaram de $ANTES para $DEPOIS (+$((DEPOIS - ANTES)))"
  git checkout .
  exit 1
elif [ $PADRÃO_ANTIGO -gt 0 ]; then
  echo "⚠️  ATENÇÃO: Script incompleto! Padrão antigo ainda existe."
  echo "   Revisar script antes de commit."
  exit 1
else
  echo "✅ OK para commit (erros: $ANTES → $DEPOIS)"
fi
```

### 12.2 Lição Aprendida: E2 BATCH 1 → Regressão TS18046

#### O que aconteceu

| Fase | Ação | Resultado | Problema |
|------|------|-----------|----------|
| 1. E2 BATCH 1 | Script substituiu `catch (error: any)` → `catch (error: unknown)` | ✅ 269 substituições | - |
| 2. E2 BATCH 1 | Script criou `const errorMessage = ...` | ✅ 269 criações | - |
| 3. E2 BATCH 1 | Script substituiu `error.message` → `errorMessage` | ❌ **PARCIAL** (apenas 179/412) | **233 erros TS18046** |
| 4. E2 BATCH 1 | check_cursor_issues executado | ❌ **Não detectou** | tsc estava cacheado |
| 5. E2 BATCH 1 | Commit + Push realizado | ✅ Sucesso | **Regressão passou despercebida** |
| 6. E3 BATCH 3 | Verificação manual pós-E2 | ⚠️ **233 erros TS18046** descobertos | Necessário BATCH 3 |
| 7. E3 BATCH 3 | Script melhorado executado | ✅ 179 correções | 79 erros inline restantes |

#### Por que aconteceu

| Causa | Detalhes | Impacto |
|-------|----------|---------|
| **Regex incompleta** | Script não capturou `error.message` em contextos inline como `{ error: error.message }` | 233 erros não corrigidos |
| **tsc cacheado** | `check_cursor_issues` usou `tsc --noEmit` (com cache incremental) | Erros TS18046 não detectados |
| **Falta de verificação** | Não verificou se padrão antigo (`error.message`) ainda existia | Script passou como "sucesso" |
| **Commit imediato** | Commit realizado sem comparação de erros antes/depois | Regressão enviada ao repositório |

#### Como prevenir

| Etapa | Ação | Comando/Tool | Objetivo |
|-------|------|--------------|----------|
| **1. Antes do script** | Contar erros TypeScript | `npx tsc --noEmit --incremental false 2>&1 \| grep -c "error TS"` | Baseline |
| **2. Após script** | Contar erros novamente | Mesmo comando | Comparação |
| **3. Verificar padrão** | Buscar padrão antigo | `grep -rn "error\\.message" src \| wc -l` | Completude |
| **4. Validar resultado** | Se erros aumentaram | `git checkout .` | Cancelar mudanças |
| **5. MCP check** | `check_cursor_issues` com `--incremental false` | Tool MCP | Verificação final |
| **6. Commit** | Só se erros <= baseline | `git commit` | Segurança |

#### Checklist Obrigatório para Scripts de Automação

```bash
#!/bin/bash
# Template de verificação pós-script

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 VERIFICAÇÃO PÓS-SCRIPT"
echo "========================="

# 1. Contar erros ANTES (se disponível em variável de ambiente)
if [ -z "$ERRORS_BEFORE" ]; then
  echo "${YELLOW}⚠️  ERRORS_BEFORE não definido. Execute script com:${NC}"
  echo "   export ERRORS_BEFORE=\$(npx tsc --noEmit --incremental false 2>&1 | grep -c 'error TS')"
  exit 1
fi

# 2. Contar erros DEPOIS
ERRORS_AFTER=$(npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS")

# 3. Verificar padrão antigo (exemplo: error.message)
OLD_PATTERN_COUNT=$(grep -rn "error\.message" src --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

# 4. Calcular diferença
DIFF=$((ERRORS_AFTER - ERRORS_BEFORE))

# 5. Relatório
echo ""
echo "📊 RESULTADOS:"
echo "   Erros antes:  $ERRORS_BEFORE"
echo "   Erros depois: $ERRORS_AFTER"
echo "   Diferença:    $DIFF"
echo "   Padrão antigo: $OLD_PATTERN_COUNT ocorrências"
echo ""

# 6. Decisão
if [ $DIFF -gt 0 ]; then
  echo "${RED}❌ REGRESSÃO DETECTADA!${NC}"
  echo "   Erros aumentaram em $DIFF"
  echo "   Executando git checkout ..."
  git checkout .
  exit 1
elif [ $OLD_PATTERN_COUNT -gt 0 ]; then
  echo "${YELLOW}⚠️  ATENÇÃO: Script incompleto!${NC}"
  echo "   Padrão antigo ainda existe em $OLD_PATTERN_COUNT locais"
  echo "   Revisar e melhorar script antes de commit."
  exit 1
elif [ $DIFF -lt 0 ]; then
  echo "${GREEN}✅ EXCELENTE! Erros reduziram em ${DIFF#-}${NC}"
  echo "   OK para commit."
  exit 0
else
  echo "${GREEN}✅ OK para commit (sem mudanças)${NC}"
  exit 0
fi
```

### 12.3 Casos de Uso

#### Exemplo 1: Script de Substituição de Tipos

```bash
# Salvar baseline
export ERRORS_BEFORE=$(npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS")
echo "Baseline: $ERRORS_BEFORE erros"

# Executar script
npx tsx scripts/fix-types.ts

# Verificar
bash scripts/verify-post-script.sh
```

#### Exemplo 2: Refatoração em Massa

```bash
# 1. Baseline
tsc_before=$(npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS")

# 2. Refatoração
npx tsx scripts/refactor-all.ts

# 3. Verificação
tsc_after=$(npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS")

# 4. Comparação
if [ $tsc_after -gt $tsc_before ]; then
  echo "❌ REGRESSÃO: $tsc_before → $tsc_after (+$((tsc_after - tsc_before)))"
  git checkout .
else
  echo "✅ OK: $tsc_before → $tsc_after"
fi
```

### 12.4 Ferramentas de Prevenção

#### Script: verify-post-automation.sh

Criar em: `scripts/verify-post-automation.sh`

```bash
#!/bin/bash
# Verificação automática após scripts de automação
# Uso: bash scripts/verify-post-automation.sh "error\\.message"

PATTERN="$1"
ERRORS_BEFORE="${ERRORS_BEFORE:-0}"

if [ -z "$PATTERN" ]; then
  echo "❌ Uso: $0 'PADRÃO_ANTIGO'"
  exit 1
fi

# Contar erros
ERRORS_AFTER=$(npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS")
PATTERN_COUNT=$(grep -rn "$PATTERN" src --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

# Decidir
DIFF=$((ERRORS_AFTER - ERRORS_BEFORE))

if [ $DIFF -gt 0 ] || [ $PATTERN_COUNT -gt 0 ]; then
  echo "❌ FALHOU"
  echo "   Erros: $ERRORS_BEFORE → $ERRORS_AFTER"
  echo "   Padrão antigo: $PATTERN_COUNT"
  exit 1
else
  echo "✅ PASSOU"
  exit 0
fi
```

---

## 13. HISTÓRICO DE VERSÕES

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 27/12/2025 | Versão inicial com sistema completo |
| 1.1.0 | 27/12/2025 | + Seção 12: Prevenção de Regressões (lição E2 BATCH 1) |

