# Fase 2 - Implementar 6 Tools MCP

## Objetivo

Implementar tools que usam knowledge base para auxiliar desenvolvimento.

## Tools a Implementar

### 2.1 - Tools Simples (45min)

#### Tool 1: get_epic_status
**Função:** Retornar status de épico específico  
**Input:** epic_id (E0-E8)  
**Output:** JSON com status, deliverables, progress  
**Arquivo:** `mcp-server/knowledge/epics/{epic_id}.json`  
**Complexidade:** BAIXA

#### Tool 2: get_contract (adaptar resource)
**Função:** Retornar contrato completo  
**Input:** contract_id  
**Output:** Contrato JSON completo  
**Nota:** Já existe via resources, adaptar para tool  
**Complexidade:** BAIXA

### 2.2 - Tools Intermediários (1h)

#### Tool 3: search_patterns
**Função:** Buscar padrões de código aprovados  
**Input:** query (texto)  
**Output:** Lista de padrões matching  
**Arquivo:** `mcp-server/knowledge/patterns/approved/`  
**Complexidade:** MÉDIA

#### Tool 4: propose_pattern
**Função:** Propor novo padrão para aprovação  
**Input:** pattern_name, description, code_example  
**Output:** Criar JSON em patterns/proposed/  
**Complexidade:** MÉDIA

### 2.3 - Tools Complexos (1h15min)

#### Tool 5: validate_code
**Função:** Validar código contra contratos  
**Input:** code (string), contract_ids (array)  
**Output:** Lista de violações encontradas  
**Lógica:**
- Parse código (AST básico ou regex)
- Verificar rules de contratos
- Retornar violações  
**Complexidade:** ALTA

#### Tool 6: check_compliance
**Função:** Verificar compliance geral de arquivo  
**Input:** file_path  
**Output:** Relatório compliance (contratos, padrões, ADRs)  
**Lógica:**
- Ler arquivo
- Verificar contra todos contratos relevantes
- Verificar contra padrões
- Consolidar resultado  
**Complexidade:** ALTA

## Ordem de Implementação

1. get_epic_status (15min)
2. get_contract (15min)
3. search_patterns (30min)
4. propose_pattern (30min)
5. validate_code (45min)
6. check_compliance (30min)

**TOTAL:** ~2h45min

## Validação

Cada tool deve:
- Ter inputSchema bem definido
- Validar argumentos (sem any!)
- Error handling robusto
- Retornar formato consistente
- Ser testado individualmente

## Commit Strategy

- Commit após cada 2 tools
- Mensagens descritivas
- Testes validados antes de commit

