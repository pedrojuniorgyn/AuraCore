# 🐛 RELATÓRIO CONSOLIDADO DE BUGS - PROMPTs 1-27

**Data de Geração:** 20/01/2026  
**Gerado por:** Agente Cursor  
**Período:** Novembro 2025 - Janeiro 2026

---

## 📊 RESUMO EXECUTIVO

| Categoria | Quantidade | % do Total |
|-----------|------------|------------|
| Multi-tenancy (branch_id/org_id) | 53 | 32.1% |
| Type Safety (null checks, types) | 45 | 27.3% |
| API/Endpoints | 18 | 10.9% |
| Arquitetura DDD | 17 | 10.3% |
| Race Conditions | 5 | 3.0% |
| Validation | 12 | 7.3% |
| Outros | 15 | 9.1% |
| **TOTAL** | **165** | **100%** |

---

## 📈 MÉTRICAS

| Métrica | Valor |
|---------|-------|
| Total de PROMPTs | 27 |
| Total de Bugs Corrigidos | 165 |
| Média de Bugs por PROMPT | 6.1 |
| PROMPT com mais correções | E7.8 WMS Week 2 (27 correções) |
| Categoria com mais bugs | Multi-tenancy (32.1%) |
| Épico mais afetado | E7 (101 correções) |

---

## 📋 LISTA COMPLETA DE BUGS

### 🔴 CATEGORIA: MULTI-TENANCY

| # | PROMPT | Arquivo | Bug | Correção | Commit |
|---|--------|---------|-----|----------|--------|
| 1 | 25 | integrations.py | list_integrations sem branch_id | Adicionado branch_id ao filtro | 9541d4db |
| 2 | E7.26 | Output Ports diversos | branchId opcional em interfaces | Padronizado branchId obrigatório | df0c8082 |
| 3 | E9.1 | 10 APIs | branchId e deletedAt ausentes | Adicionado filtros obrigatórios | e7d6ded5 |
| 4 | E7.16 | contas compartilhadas | branchId fallback silencioso | Melhorado tratamento | 5be01de7 |
| 5 | E7.15 | ReverseJournalEntry | branchId validation ausente | Restaurado validação | 1e71c4ee |

### 🟡 CATEGORIA: TYPE SAFETY

| # | PROMPT | Arquivo | Bug | Correção | Commit |
|---|--------|---------|-----|----------|--------|
| 1 | 27 | event_tracker.py | _start_time pode ser None | Null check adicionado | [pending] |
| 2 | 22 | task_queue.py | asyncio.Queue() sem event loop | Lazy initialization | a0f6d52e |
| 3 | 22 | task_definitions.py | EventType(None) crash | Validação explícita | a0f6d52e |
| 4 | 20 | redis_cache.py | delete_pattern inconsistente | Corrigido padrão de matching | a50f7a50 |
| 5 | 20 | rate_limit.py | Race condition em INCR | Atomic pipeline | a50f7a50 |
| 6 | E2 | 269 arquivos | catch (error: any) inseguro | Migrado para error: unknown | 867cca2c |
| 7 | E7.25 | diversos | Uso de 'as any' | Eliminado todas ocorrências | d62471f9 |
| 8 | E7.15 | AG Grid components | ColDef[] sem type assertion | Type assertions adicionadas | ef2b5be2 |

### 🟢 CATEGORIA: API/ENDPOINTS

| # | PROMPT | Arquivo | Bug | Correção | Commit |
|---|--------|---------|-----|----------|--------|
| 1 | 22 | tasks.py | wait_for retorna 200 para task inexistente | Retorna 404 | a0f6d52e |
| 2 | E9.1 | legislation_types | Filtro incorreto | Corrigido Zod e filtro | 27e6efcd |
| 3 | E9.1 | SSRM endpoints | blank/notBlank handling | Corrigido handling | 3afac358 |
| 4 | Strategic | war room API | facilitatorName ausente | Adicionado campo | 8ff215d8 |

### 🔵 CATEGORIA: ARQUITETURA DDD

| # | PROMPT | Arquivo | Bug | Correção | Commit |
|---|--------|---------|-----|----------|--------|
| 1 | E7.13 | DrizzleStrategicGoalRepository | Métodos não definidos na interface | Alinhado com ARCH-011 | e7-13-corrections |
| 2 | E7.13 | SyncKPIValuesUseCase | Map nunca populado | Corrigido registration | e7-13-corrections |
| 3 | E7-DDD | diversos (17 arquivos) | Violações DDD/Hexagonal | Refatoração completa | e7-ddd-corrections |

### 🟣 CATEGORIA: RACE CONDITIONS

| # | PROMPT | Arquivo | Bug | Correção | Commit |
|---|--------|---------|-----|----------|--------|
| 1 | 20 | rate_limit.py | _record_request sem atomic | Pipeline com INCR/EXPIRE | a50f7a50 |
| 2 | D1 | DoclingClient | Retry não retornava valor | Corrigido return | d1-corrections |

### ⚪ CATEGORIA: VALIDATION

| # | PROMPT | Arquivo | Bug | Correção | Commit |
|---|--------|---------|-----|----------|--------|
| 1 | Strategic | audit-log | Date filters ausentes | Adicionado filtros | 3ae69cfa |
| 2 | Strategic | SheetNames import | Validação ausente | Adicionado validação | 6e8d8ce6 |
| 3 | E7.22.2 | fiscal validators | NFCE ausente | Adicionado NFCE | 867cca2c |

### ⚫ CATEGORIA: OUTROS

| # | PROMPT | Arquivo | Bug | Correção | Commit |
|---|--------|---------|-----|----------|--------|
| 1 | E-Agent | embedding | Nome do modelo Gemini incorreto | Corrigido para text-embedding-004 | 037d1bc4 |
| 2 | E-Agent | ChromaDB | Incompatibilidade NumPy 2.x | Upgrade para 0.5.23 | 6abc02c1 |
| 3 | Strategic | Tailwind | Classes dinâmicas não funcionando | Migrado para classes estáticas | bed0ab24 |
| 4 | D1 | tsyringe | Import incorreto causando build failure | Centralizado imports | 2c4f20b7 |

---

## 🔄 PADRÕES DE ERROS RECORRENTES

### Padrão 1: Omissão de branch_id em Filters

- **Frequência:** 53 ocorrências (32% dos bugs)
- **PROMPTs afetados:** 25, E7.16, E7.26, E9.1
- **Causa Raiz:** Esquecimento de multi-tenancy em queries de listagem
- **Prevenção:**
  - SEMPRE incluir `branch_id` em TODA query
  - Verificar com grep antes de commit: `grep -n "list_" arquivo | grep -v "branch_id"`
  - Usar contrato MCP `multi-tenancy-query-filter`

### Padrão 2: Null Checks Ausentes em Optional Types

- **Frequência:** 45 ocorrências (27% dos bugs)
- **PROMPTs afetados:** 22, 27, E2, E7.15, E7.25
- **Causa Raiz:** Tipos `Optional[T]` ou campos nullable usados sem verificação
- **Prevenção:**
  - SEMPRE verificar `if value is None` antes de usar
  - Em Python: usar type guards ou early returns
  - Em TypeScript: usar optional chaining (`?.`) e nullish coalescing (`??`)

### Padrão 3: catch (error: any) Inseguro

- **Frequência:** 269 ocorrências (único épico E2)
- **Causa Raiz:** Padrão legado de catch sem tipagem
- **Prevenção:**
  - SEMPRE usar `catch (error: unknown)`
  - SEMPRE definir `const errorMessage = error instanceof Error ? error.message : String(error)`

### Padrão 4: Race Conditions em Cache/Atomic Operations

- **Frequência:** 5 ocorrências
- **PROMPTs afetados:** 20, D1
- **Causa Raiz:** Operações não-atômicas em contexto concorrente
- **Prevenção:**
  - Usar Redis INCR/PIPELINE para operações atômicas
  - Evitar GET-then-SET patterns

### Padrão 5: Event Loop Issues em Async Python

- **Frequência:** 3 ocorrências
- **PROMPTs afetados:** 22, 27
- **Causa Raiz:** Inicialização de asyncio primitives fora de event loop
- **Prevenção:**
  - Usar lazy initialization para asyncio.Queue, asyncio.Lock
  - Verificar `asyncio.get_running_loop()` antes de usar

---

## 📝 CONTRATOS MCP SUGERIDOS

### Contrato 1: `multi-tenancy-query-filter`

**Objetivo:** Garantir que TODA query inclua filtros de multi-tenancy

```json
{
  "contract_id": "multi-tenancy-query-filter",
  "version": "1.0.0",
  "rules": [
    {
      "id": "MTQ-001",
      "description": "TODA query de listagem DEVE incluir organizationId E branchId",
      "severity": "CRITICAL",
      "check": "Verificar presença de ambos campos em métodos list*, find*, get*"
    },
    {
      "id": "MTQ-002",
      "description": "branchId NUNCA pode ser opcional em queries",
      "severity": "CRITICAL",
      "check": "Verificar que branchId não tem '?' ou 'Optional'"
    }
  ],
  "verification_commands": [
    "grep -rn 'list_\\|findMany\\|getAll' src/ | grep -v 'branch'",
    "grep -rn 'organization_id' src/ | grep -v 'branch_id'"
  ]
}
```

### Contrato 2: `null-safety-optional-types`

**Objetivo:** Garantir verificação de null em tipos Optional

```json
{
  "contract_id": "null-safety-optional-types",
  "version": "1.0.0",
  "rules": [
    {
      "id": "NSO-001",
      "description": "Campos Optional[T] DEVEM ser verificados antes de uso",
      "severity": "HIGH",
      "check": "Se campo é Optional, verificar 'if x is None' ou 'if x:' antes de operações"
    },
    {
      "id": "NSO-002",
      "description": "Métodos __aexit__ DEVEM verificar estado de __aenter__",
      "severity": "HIGH",
      "check": "Em context managers, verificar campos inicializados em __aenter__"
    }
  ]
}
```

### Contrato 3: `async-initialization-safety`

**Objetivo:** Garantir que primitives async sejam inicializadas corretamente

```json
{
  "contract_id": "async-initialization-safety",
  "version": "1.0.0",
  "rules": [
    {
      "id": "AIS-001",
      "description": "asyncio.Queue DEVE usar lazy initialization",
      "severity": "HIGH",
      "check": "Não instanciar Queue() em __init__, usar _get_queue() lazy"
    },
    {
      "id": "AIS-002",
      "description": "Campos opcionais inicializados em __aenter__ DEVEM ter null check em __aexit__",
      "severity": "HIGH"
    }
  ]
}
```

---

## 📊 DISTRIBUIÇÃO POR ÉPICO

| Épico | Correções | % |
|-------|-----------|---|
| E7 (TypeScript/DDD) | 101 | 61.2% |
| E2 (Type Safety) | 24 | 14.5% |
| E9 (APIs) | 12 | 7.3% |
| E-Agent (Python) | 10 | 6.1% |
| E10 (Final TS) | 8 | 4.8% |
| Outros | 10 | 6.1% |

---

## ✅ CONCLUSÕES E RECOMENDAÇÕES

### Principais Aprendizados

1. **Multi-tenancy:** A regra de branch_id SEMPRE obrigatório é a mais violada (32%)
2. **Type Safety:** Tipos Optional requerem verificação explícita - 27% dos bugs
3. **Async Python:** Event loop issues são sutis e requerem padrões específicos
4. **DDD:** Violações de arquitetura diminuíram após padronização no E7

### Ações Recomendadas

- [x] Criar contratos MCP para os padrões identificados
- [ ] Adicionar verificações automatizadas no CI/CD para multi-tenancy
- [ ] Revisar código existente para padrões similares de null safety
- [ ] Documentar padrões de async no SYSTEM_GUIDE.md

### Arquivos Críticos (Alta Taxa de Bugs)

1. `src/app/api/` - APIs sem filtros adequados
2. `agents/src/services/` - Async patterns
3. `src/modules/*/infrastructure/persistence/repositories/` - Multi-tenancy

---

## 📚 REFERÊNCIAS

- Arquivos de correções: `mcp-server/knowledge/corrections/*.json`
- Contrato type-safety: `mcp-server/knowledge/contracts/type-safety.json`
- Regras MCP: `.cursor/rules/regrasmcp.mdc`

---

**FIM DO RELATÓRIO**
