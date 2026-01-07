# SMP - LESSONS LEARNED REGISTRY

**Versão:** 1.0.0  
**Última Atualização:** 07/01/2026

---

## 📋 SOBRE ESTE DOCUMENTO

Este documento registra todas as lições aprendidas durante refatorações no AuraCore. Cada entrada documenta um bug/issue, sua causa raiz, correção aplicada e regra criada para prevenir recorrência.

### Formato de ID

```
LL-YYYY-MM-DD-NNN
│  │    │  │  │
│  │    │  │  └── Número sequencial do dia
│  │    │  └───── Dia
│  │    └──────── Mês
│  └───────────── Ano
└──────────────── Prefixo (Lesson Learned)
```

---

## 📊 ÍNDICE POR CATEGORIA

| Categoria | Quantidade | Última Entrada |
|-----------|------------|----------------|
| SMP-INFRA | 1 | LL-2026-01-07-001 |
| SMP-MAP | 2 | LL-2026-01-07-010 |
| SMP-CAT | 0 | - |
| SMP-EXEC | 7 | LL-2026-01-07-009 |
| SMP-VERIFY | 0 | - |

---

## 📝 REGISTRO DE LIÇÕES

---

### LL-2026-01-07-001: Helper db.execute Ausente

**Contexto:** Épico E7.15 - Eliminação de `any`  
**Bug/Issue:** Código duplicado de fallback `(result.recordset || result)` em múltiplos arquivos  
**Causa Raiz:** Ausência de helper centralizado para lidar com dois formatos de retorno de db.execute()  
**Categoria:** SMP-INFRA  
**Impacto:** MÉDIO

**Antes (Código Duplicado):**
```typescript
// Em cada arquivo que usa db.execute:
const row = (result.recordset || result)[0];
const rows = (result.recordset || result) as T[];
```

**Depois (Helper Centralizado):**
```typescript
// src/lib/db/helpers.ts
export function getFirstRow<T>(result: DbExecuteResult<T>): T | undefined {
  return getDbRows(result)[0];
}

// Uso:
import { getFirstRow } from '@/lib/db/helpers';
const row = getFirstRow<MyType>(result);
```

**Regra Criada:**
- **SMP-INFRA-001:** Sempre criar helper centralizado quando padrão se repete em 3+ arquivos

**Prevenção:**
- Durante SMP-MAP, identificar padrões repetitivos
- Criar helper em SMP-INFRA antes de refatorar

---

### LL-2026-01-07-002: Mapeamento Incompleto de Escopo

**Contexto:** Épico E7.15 - Correção de fallback db.execute  
**Bug/Issue:** Correções pontuais que esqueciam arquivos, gerando múltiplas iterações  
**Causa Raiz:** Não mapear 100% do escopo antes de iniciar correções  
**Categoria:** SMP-MAP  
**Impacto:** ALTO

**Antes (Correção Pontual):**
```
Iteração 1: Corrigir arquivo A → Issue encontrada em B
Iteração 2: Corrigir arquivo B → Issue encontrada em C
Iteração 3: Corrigir arquivo C → Issue encontrada em D
... (ciclo infinito)
```

**Depois (Mapeamento Completo):**
```bash
# ANTES de qualquer correção:
grep -rn "padrão" src/ --include="*.ts" | wc -l  # Total
grep -rn "padrão" src/ --include="*.ts" | cut -d: -f1 | sort -u  # Arquivos
```

**Regra Criada:**
- **SMP-MAP-001:** Executar grep completo e documentar ANTES de qualquer correção
- **SMP-MAP-002:** Se total > 10, criar relatório de mapeamento formal

**Prevenção:**
- Sempre executar comandos de mapeamento no início
- Não iniciar correção até ter lista completa de arquivos

---

### LL-2026-01-07-003: Array.isArray em Resultado de db.execute

**Contexto:** Épico E7.15 - Correção de type-safety  
**Bug/Issue:** Uso de `Array.isArray(result)` como fallback que nunca executa (código morto)  
**Causa Raiz:** Não entender que db.execute() retorna objeto, não array  
**Categoria:** SMP-EXEC  
**Impacto:** CRÍTICO

**Antes (Código Morto):**
```typescript
// db.execute() retorna { recordset: T[] }, NUNCA array direto
// Array.isArray({ recordset: [...] }) = FALSE sempre!
const row = result.recordset?.[0] || 
  (Array.isArray(result) ? result[0] : undefined);  // NUNCA EXECUTA
```

**Depois (Padrão Correto):**
```typescript
// Fallback correto que funciona para ambos formatos
const row = (result.recordset || result)[0];
```

**Regra Criada:**
- **PC-002:** db.execute fallback DEVE usar `(result.recordset || result)`
- **AP-001:** NUNCA usar Array.isArray() em resultado de db.execute

**Prevenção:**
- Consultar PC-002 antes de modificar código com db.execute
- Verificar anti-patterns antes de aplicar correção

---

### LL-2026-01-07-004: Interface Não Corresponde aos Dados

**Contexto:** Épico E7.15 - Correção de interface byPlate  
**Bug/Issue:** Interface declarava `plate` mas código setava `costCenterName`  
**Causa Raiz:** Criar interface sem verificar dados reais  
**Categoria:** SMP-EXEC  
**Impacto:** CRÍTICO

**Antes (Interface Incorreta):**
```typescript
// Interface declara plate
const byPlate: Record<string, { plate: string; ... }> = {};

// Mas código seta costCenterName
byPlate[key] = { costCenterName: "x", ... };  // plate nunca setado!

// Runtime: plate é undefined
```

**Depois (Interface Alinhada):**
```typescript
// Verificar dados reais ANTES
grep -A10 "byPlate\[" arquivo.ts  // Ver o que é realmente setado

// Interface corresponde aos dados
const byPlate: Record<string, { costCenterName: string; ... }> = {};
byPlate[key] = { costCenterName: "x", ... };
```

**Regra Criada:**
- **VAT-001:** Interface DEVE corresponder aos dados reais
- **VAT-005:** Propriedades declaradas DEVEM ser setadas

**Prevenção:**
- Executar grep para ver atribuições antes de criar interface
- Verificar checklist VAT antes de commit

---

### LL-2026-01-07-005: União de Tipos Truncada

**Contexto:** Épico E7.15 - Correção de Select monthsAhead  
**Bug/Issue:** Type assertion `as 3 | 6 | 12` quando Select tinha opções até 60  
**Causa Raiz:** Não verificar todos os valores possíveis do componente  
**Categoria:** SMP-EXEC  
**Impacto:** ALTO

**Antes (União Truncada):**
```typescript
// Select oferece: 3, 6, 12, 24, 36, 60
// Mas type assertion trunca:
onValueChange={(v) => setValue(Number(v) as 3 | 6 | 12)}  // 24, 36, 60 incorretos!
```

**Depois (União Completa):**
```typescript
// Verificar TODOS os valores do Select
grep -B5 -A10 "SelectItem\|option" arquivo.tsx

// União inclui TODOS os valores
onValueChange={(v) => setValue(Number(v) as 3 | 6 | 12 | 24 | 36 | 60)}
```

**Regra Criada:**
- **VAT-002:** Union type DEVE incluir TODOS os valores possíveis

**Prevenção:**
- Verificar componente Select/options antes de criar type assertion
- Executar grep para encontrar todos os valores

---

### LL-2026-01-07-006: Cast Semântico Incorreto

**Contexto:** Épico E7.15 - Correção de fallback ruleResult  
**Bug/Issue:** Cast `(result as { recordset: T[] })[0]` acessa [0] em objeto, não array  
**Causa Raiz:** Cast sintaticamente correto mas semanticamente errado  
**Categoria:** SMP-EXEC  
**Impacto:** CRÍTICO

**Antes (Cast Incorreto):**
```typescript
// Cast para objeto, depois [0] no OBJETO
const row = (result as { recordset: Array<...> })[0];
// [0] em objeto retorna undefined, não primeiro elemento!
```

**Depois (Preserva Semântica):**
```typescript
// Entender o que o código original fazia
// Se fallback era para array direto, manter como array
const row = (result.recordset || result)[0];
```

**Regra Criada:**
- **SP-001:** Cast NÃO pode mudar comportamento/semântica do código
- **VAT-007:** Index access [0] deve corresponder ao tipo (array, não objeto)

**Prevenção:**
- Analisar O QUE o código faz, não apenas COMO está escrito
- Verificar se cast preserva comportamento original

---

### LL-2026-01-07-007: Migração Incompleta de Helper

**Contexto:** Épico E7.15 - Migração para helper getDbRows  
**Bug/Issue:** Alguns usos de `.recordset` não foram migrados, permanecendo acesso direto  
**Causa Raiz:** Busca grep incompleta durante mapeamento, não identificou todos os `.recordset.` e `.recordset[`  
**Categoria:** SMP-EXEC  
**Impacto:** MÉDIO

**Antes (Migração Incompleta):**
```typescript
// Helper criado mas não usado em todos os lugares
import { getFirstRow } from '@/lib/db/helpers';

// Linha migrada
const entry = getFirstRow<EntryRow>(entryResult);

// Linhas NÃO migradas no mesmo arquivo
if (items.recordset.length > 0) {
  for (const item of items.recordset) { ... }
}
```

**Depois (Migração Completa):**
```typescript
import { getFirstRow, getDbRows } from '@/lib/db/helpers';

const entry = getFirstRow<EntryRow>(entryResult);

const itemsData = getDbRows<ItemRow>(items);
if (itemsData.length > 0) {
  for (const item of itemsData) { ... }
}
```

**Regra Criada:**
- **SMP-EXEC-002:** Após migração, grep final DEVE retornar 0 para padrão antigo
- **SMP-VERIFY-002:** Verificar TODOS os padrões (.recordset., .recordset[, etc)

**Prevenção:**
- Durante SMP-EXEC, após cada arquivo, executar grep para confirmar
- Durante SMP-VERIFY, buscar múltiplas variações do padrão antigo

---

### LL-2026-01-07-008: Generic Muito Amplo (Record<string, unknown>)

**Contexto:** Épico E7.15 - Uso de helper getFirstRow  
**Bug/Issue:** Propriedades tipadas como `unknown` ao invés de tipos específicos  
**Causa Raiz:** Usar `Record<string, unknown>` genérico ao invés de criar interface com propriedades conhecidas  
**Categoria:** SMP-EXEC  
**Impacto:** MÉDIO

**Antes (Generic Amplo):**
```typescript
// Tipo muito genérico
const account = getFirstRow<Record<string, unknown>>(result);

// Todas as propriedades são unknown
if (account.is_analytical) { ... }  // Tipo: unknown ❌
const id = account.id;               // Tipo: unknown ❌
```

**Depois (Interface Específica):**
```typescript
// Interface com tipos específicos
interface AccountRow {
  id: number;
  code: string;
  name: string;
  is_analytical: boolean;
  account_type?: string;
}

const account = getFirstRow<AccountRow>(result);
if (account?.is_analytical) { ... }  // Tipo: boolean ✅
const id = account?.id;              // Tipo: number ✅
```

**Regra Criada:**
- **P-TYPE-007:** Criar interface específica ao invés de Record<string, unknown> quando propriedades são conhecidas
- **VAT-011:** Identificar propriedades acessadas e tipar corretamente

**Prevenção:**
- Antes de usar generic, listar propriedades que serão acessadas
- Criar interface local ou compartilhada para tipos de row do banco

---

### LL-2026-01-07-009: Falta Verificação Null após getFirstRow

**Contexto:** Épico E7.15 - Uso de helper getFirstRow  
**Bug/Issue:** Acesso a propriedades sem verificar se row existe (crash em runtime)  
**Causa Raiz:** Não usar `getFirstRowOrThrow` nem verificar null manualmente  
**Categoria:** SMP-EXEC  
**Impacto:** CRÍTICO

**Antes (Sem Verificação):**
```typescript
// getFirstRow retorna T | undefined
const orgData = getDbRows<OrgRow>(orgResult);
const org = orgData[0];  // Pode ser undefined!

// Acesso direto SEM verificar
console.log(org.document);  // CRASH se org é undefined ❌
console.log(org.name);      // CRASH se org é undefined ❌
```

**Depois Opção A (getFirstRowOrThrow):**
```typescript
import { getFirstRowOrThrow } from '@/lib/db/helpers';

// Lança erro com mensagem clara se não existir
const org = getFirstRowOrThrow<OrgRow>(orgResult, 'Organização não encontrada');
console.log(org.document);  // Seguro - org é garantido existir ✅
```

**Depois Opção B (Verificação Manual):**
```typescript
const org = getFirstRow<OrgRow>(orgResult);
if (!org) {
  throw new Error('Organização não encontrada');
}
console.log(org.document);  // Seguro após verificação ✅
```

**Regra Criada:**
- **P-DB-006:** getFirstRow DEVE ter verificação null ou usar getFirstRowOrThrow
- **P-DB-007:** NUNCA acessar propriedades de row sem verificar existência

**Prevenção:**
- Usar getFirstRowOrThrow quando row é obrigatório
- Usar getFirstRow + verificação quando row pode não existir
- TypeScript strict mode ajuda a detectar (usar optional chaining)

---

### LL-2026-01-07-010: Correção de Escopo Limitado

**Contexto:** Épico E7.15 - Migração helper db.execute()  
**Bug/Issue:** Correção focou apenas em arquivos mencionados no prompt, ignorando outros com mesmo padrão  
**Causa Raiz:** Não executou grep em TODO o codebase antes de corrigir, apenas nos arquivos citados  
**Categoria:** SMP-MAP  
**Impacto:** ALTO

**Antes (Processo Errado):**
```
1. Receber lista de 4 arquivos com bugs no prompt
2. Corrigir apenas esses 4 arquivos
3. Descobrir que existem 82 arquivos adicionais com mesmo padrão
4. Trabalho incompleto, bugs remanescentes
```

**Depois (Processo Correto):**
```
1. Receber indicação de padrão problemático (.recordset)
2. grep -rn ".recordset" src/ --include="*.ts" (TODO o codebase)
3. Mapear 100%: 25 .recordset., 21 .recordset[, 82+ arquivos total
4. Categorizar por tipo de correção
5. Corrigir TODOS os arquivos encontrados (ou por fases aprovadas)
6. Verificar grep = 0 no final
```

**Regra Criada:**
- **SMP-MAP-003:** Ao corrigir padrão, grep TODO o codebase, não apenas arquivos mencionados no prompt
- **SMP-MAP-004:** Mapeamento DEVE ser primeiro passo antes de qualquer correção

**Prevenção:**
- Fase SMP-MAP é OBRIGATÓRIA: sempre executar grep antes de iniciar
- Ignorar lista de arquivos do prompt, usar grep como fonte única
- Apresentar mapeamento completo para aprovação antes de corrigir
- Aguardar decisão: corrigir tudo de uma vez ou por fases

**Impacto Evitado:**
- Sem mapeamento: 4 arquivos corrigidos, 82 com bug remanescente (4.8% completo)
- Com mapeamento: visibilidade total, decisão informada sobre escopo

---

## 📊 ESTATÍSTICAS

### Bugs por Categoria SMP

| Categoria | Total | % |
|-----------|-------|---|
| SMP-INFRA | 1 | 10% |
| SMP-MAP | 2 | 20% |
| SMP-CAT | 0 | 0% |
| SMP-EXEC | 7 | 70% |
| SMP-VERIFY | 0 | 0% |

### Bugs por Impacto

| Impacto | Total | % |
|---------|-------|---|
| CRÍTICO | 4 | 40% |
| ALTO | 3 | 30% |
| MÉDIO | 3 | 30% |
| BAIXO | 0 | 0% |

### Regras Criadas

| Regra | Origem |
|-------|--------|
| SMP-INFRA-001 | LL-2026-01-07-001 |
| SMP-MAP-001 | LL-2026-01-07-002 |
| SMP-MAP-002 | LL-2026-01-07-002 |
| SMP-MAP-003 | LL-2026-01-07-010 |
| SMP-MAP-004 | LL-2026-01-07-010 |
| PC-002 | LL-2026-01-07-003 |
| AP-001 | LL-2026-01-07-003 |
| VAT-001 | LL-2026-01-07-004 |
| VAT-005 | LL-2026-01-07-004 |
| VAT-002 | LL-2026-01-07-005 |
| SP-001 | LL-2026-01-07-006 |
| VAT-007 | LL-2026-01-07-006 |
| SMP-EXEC-002 | LL-2026-01-07-007 |
| SMP-VERIFY-002 | LL-2026-01-07-007 |
| P-TYPE-007 | LL-2026-01-07-008 |
| VAT-011 | LL-2026-01-07-008 |
| P-DB-006 | LL-2026-01-07-009 |
| P-DB-007 | LL-2026-01-07-009 |

---

## 📝 COMO ADICIONAR NOVA LIÇÃO

```markdown
### LL-YYYY-MM-DD-NNN: [Título Descritivo]

**Contexto:** [Épico/Projeto]  
**Bug/Issue:** [Descrição clara do problema]  
**Causa Raiz:** [Por que aconteceu]  
**Categoria:** [SMP-INFRA | SMP-MAP | SMP-CAT | SMP-EXEC | SMP-VERIFY]  
**Impacto:** [CRÍTICO | ALTO | MÉDIO | BAIXO]

**Antes (Errado):**
```código```

**Depois (Correto):**
```código```

**Regra Criada:**
- **[ID]:** [Descrição da regra]

**Prevenção:**
- [Como evitar no futuro]
```
