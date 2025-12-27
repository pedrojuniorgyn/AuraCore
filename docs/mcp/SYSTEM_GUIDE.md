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

## 12. HISTÓRICO DE VERSÕES

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 27/12/2025 | Versão inicial com sistema completo |

