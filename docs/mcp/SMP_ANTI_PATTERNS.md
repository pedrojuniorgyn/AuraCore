# SMP - ANTI-PATTERNS

**Versão:** 1.0.0  
**Última Atualização:** 07/01/2026

---

## 📋 SOBRE ESTE DOCUMENTO

Este documento registra **O QUE NÃO FAZER** no AuraCore. Cada anti-pattern documenta código problemático, por que é errado, e a alternativa correta.

**CONSULTAR ANTES DE IMPLEMENTAR** - Se seu código se parece com algo aqui, pare e corrija.

---

## 🗂️ ÍNDICE

| ID | Nome | Severidade | Categoria |
|----|------|------------|-----------|
| AP-001 | Array.isArray em db.execute | CRÍTICO | Database |
| AP-002 | Interface não corresponde aos dados | CRÍTICO | TypeScript |
| AP-003 | União de tipos truncada | ALTO | TypeScript |
| AP-004 | Cast que muda semântica | CRÍTICO | TypeScript |
| AP-005 | any em Promise | ALTO | TypeScript |
| AP-006 | any em catch block | MÉDIO | TypeScript |
| AP-007 | Acesso .recordset direto | MÉDIO | Database |
| AP-008 | branchId opcional | CRÍTICO | Multi-Tenancy |
| AP-009 | Correção pontual sem mapeamento | ALTO | Processo |
| AP-010 | Classe CSS duplicada | BAIXO | React |

---

## 🚫 ANTI-PATTERNS

---

### AP-001: Array.isArray em Resultado de db.execute

**Severidade:** 🔴 CRÍTICO  
**Categoria:** Database  
**Origem:** E7.15, LL-2026-01-07-003

#### ⚠️ REINCIDÊNCIA DETECTADA (07/01/2026)

**Este anti-pattern foi aplicado novamente mesmo após documentação.**

**Ocorrências:**
- `test-classification/route.ts` (3 ocorrências - linhas 21, 76, 86)
- `migrate-fiscal-data-v2/route.ts` (1 ocorrência - linha 116)
- `update-fiscal-partners/route.ts` (1 ocorrência - linha 30)

**Causa:** Agent não consultou `SMP_ANTI_PATTERNS.md` antes de aplicar correção.

**Regra reforçada:** **SMP-EXEC-003** - Consultar anti-patterns ANTES de corrigir é OBRIGATÓRIO.

**Correção aplicada:** Commit `5a0d3dc2` - Todas ocorrências substituídas por `getDbRows<T>(result)`

#### ❌ Código Errado

```typescript
// db.execute() retorna { recordset: T[] }, NUNCA array direto
// Array.isArray({ recordset: [...] }) = FALSE sempre!

const row = result.recordset?.[0] || 
  (Array.isArray(result) ? result[0] : undefined);  // ← CÓDIGO MORTO

// Array.isArray NUNCA será true, fallback NUNCA executa
```

#### Por Que É Errado

1. `db.execute()` retorna objeto `{ recordset: T[] }`, não array
2. `Array.isArray({ recordset: [...] })` sempre retorna `false`
3. O fallback nunca executa = código morto
4. Se `recordset` for `undefined`, retorna `undefined` silenciosamente

#### ✅ Código Correto

```typescript
// Usar helper centralizado
import { getFirstRow } from '@/lib/db/helpers';
const row = getFirstRow<MyType>(result);

// Ou padrão manual
const row = (result.recordset || result)[0];
```

#### Regras Relacionadas
- PC-002: db.execute fallback pattern
- P-DB-001: db.execute() Result Access

---

### AP-002: Interface Não Corresponde aos Dados

**Severidade:** 🔴 CRÍTICO  
**Categoria:** TypeScript  
**Origem:** E7.15, LL-2026-01-07-004

#### ❌ Código Errado

```typescript
// Interface declara "plate"
interface VehicleData {
  plate: string;
  revenue: number;
}

// Mas código seta "costCenterName"
const byPlate: Record<string, VehicleData> = {};
byPlate[key] = { 
  costCenterName: "ABC",  // ← plate NUNCA é setado!
  revenue: 1000 
};

// Runtime: byPlate[key].plate é undefined
```

#### Por Que É Errado

1. TypeScript compila sem erros (propriedades extras permitidas em atribuição)
2. Runtime falha ao acessar `plate` (é `undefined`)
3. Bugs silenciosos difíceis de debugar
4. Viola contrato da interface

#### ✅ Código Correto

```typescript
// 1. VERIFICAR dados reais antes de criar interface
grep -A10 "byPlate\[" arquivo.ts

// 2. Interface corresponde ao que é REALMENTE setado
interface VehicleData {
  costCenterName: string;  // ← O que realmente existe
  revenue: number;
}

const byPlate: Record<string, VehicleData> = {};
byPlate[key] = { 
  costCenterName: "ABC",
  revenue: 1000 
};
```

#### Regras Relacionadas
- VAT-001: Interface = dados reais
- VAT-005: Props declaradas = props setadas

---

### AP-003: União de Tipos Truncada

**Severidade:** 🟠 ALTO  
**Categoria:** TypeScript  
**Origem:** E7.15, LL-2026-01-07-005

#### ❌ Código Errado

```typescript
// Select oferece opções: 3, 6, 12, 24, 36, 60
<SelectItem value="3">3 meses</SelectItem>
<SelectItem value="6">6 meses</SelectItem>
<SelectItem value="12">12 meses</SelectItem>
<SelectItem value="24">24 meses</SelectItem>
<SelectItem value="36">36 meses</SelectItem>
<SelectItem value="60">60 meses</SelectItem>

// Mas type assertion trunca!
onValueChange={(v) => setValue(Number(v) as 3 | 6 | 12)}  // ← Faltam 24, 36, 60!

// Selecionar 24 resulta em valor incorreto
```

#### Por Que É Errado

1. TypeScript aceita `as` sem validar valores
2. Valores 24, 36, 60 são incorretamente convertidos
3. Dados errados são salvos/exibidos
4. Bug silencioso

#### ✅ Código Correto

```typescript
// 1. VERIFICAR todos os valores do Select
grep -B5 -A10 "SelectItem" arquivo.tsx

// 2. União inclui TODOS os valores
type MonthsAhead = 3 | 6 | 12 | 24 | 36 | 60;

onValueChange={(v) => setValue(Number(v) as MonthsAhead)}
```

#### Regras Relacionadas
- VAT-002: Union type = TODOS os valores

---

### AP-004: Cast Que Muda Semântica

**Severidade:** 🔴 CRÍTICO  
**Categoria:** TypeScript  
**Origem:** E7.15, LL-2026-01-07-006

#### ❌ Código Errado

```typescript
// Código original (funcionava):
const row = (result as any)[0];  // Tratava result como array

// "Correção" que quebra:
const row = (result as { recordset: Array<T> })[0];  // ← [0] em OBJETO!

// [0] em objeto retorna undefined, não primeiro elemento
// Comportamento mudou de "pegar primeiro do array" para "undefined"
```

#### Por Que É Errado

1. `[0]` em array: retorna primeiro elemento
2. `[0]` em objeto: retorna `undefined` (propriedade "0" não existe)
3. Cast sintaticamente correto, semanticamente errado
4. Muda comportamento do código

#### ✅ Código Correto

```typescript
// Entender O QUE o código faz, não apenas COMO está escrito
// Se era fallback para array, manter como array:
const row = (result.recordset || result)[0];

// Ou com type guard explícito:
const data = Array.isArray(result) ? result : result.recordset || [];
const row = data[0];
```

#### Regras Relacionadas
- SP-001: Cast não muda comportamento
- VAT-007: Index access corresponde ao tipo

---

### AP-005: any em Promise

**Severidade:** 🟠 ALTO  
**Categoria:** TypeScript  
**Origem:** E7.15

#### ❌ Código Errado

```typescript
async function fetchData(): Promise<any> {
  const response = await fetch('/api/data');
  return response.json();
}

// Quem chama não sabe o tipo
const data = await fetchData();
data.unknownProperty;  // ← Nenhum erro de TypeScript, falha em runtime
```

#### Por Que É Errado

1. Perde benefícios de type-safety
2. Erros descobertos apenas em runtime
3. IDE não oferece autocomplete
4. Refatoração perigosa

#### ✅ Código Correto

```typescript
interface DataResponse {
  items: Item[];
  total: number;
}

async function fetchData(): Promise<DataResponse> {
  const response = await fetch('/api/data');
  return response.json() as DataResponse;
}

// Agora TypeScript valida
const data = await fetchData();
data.items;  // ← Autocomplete funciona
data.unknownProperty;  // ← ERRO de compilação
```

#### Regras Relacionadas
- P-TYPE-001: Eliminar any - Promise

---

### AP-006: any em Catch Block

**Severidade:** 🟡 MÉDIO  
**Categoria:** TypeScript  
**Origem:** E7.15

#### ❌ Código Errado

```typescript
try {
  await riskyOperation();
} catch (error: any) {
  console.log(error.message);  // ← Pode quebrar se não for Error
  console.log(error.code);     // ← Pode não existir
}
```

#### Por Que É Errado

1. `error` pode ser qualquer coisa (string, número, objeto)
2. Acessar `.message` pode falhar
3. Não há garantia de estrutura

#### ✅ Código Correto

```typescript
import { getErrorMessage } from '@/shared/types/type-guards';

try {
  await riskyOperation();
} catch (error: unknown) {
  // Type guard obrigatório
  const message = error instanceof Error ? error.message : String(error);
  
  // Ou usar helper centralizado
  const message = getErrorMessage(error);
}
```

#### Regras Relacionadas
- TYPE-UNKNOWN-001: Type guard obrigatório para unknown
- P-TYPE-006: Type Guards

---

### AP-007: Acesso .recordset Direto

**Severidade:** 🟡 MÉDIO  
**Categoria:** Database  
**Origem:** E7.15

#### ❌ Código Errado

```typescript
const result = await db.execute(sql`SELECT * FROM users`);
const user = result.recordset[0];  // ← Pode falhar se recordset undefined
```

#### Por Que É Errado

1. Em alguns casos, `recordset` pode ser `undefined`
2. Acesso direto causa erro de runtime
3. Não há fallback

#### ✅ Código Correto

```typescript
// Usar helper
import { getFirstRow } from '@/lib/db/helpers';
const user = getFirstRow<User>(result);

// Ou com fallback manual
const user = (result.recordset || result)[0];
```

#### Regras Relacionadas
- PC-002: db.execute fallback pattern
- P-DB-001: db.execute() Result Access

---

### AP-008: branchId Opcional em Filter

**Severidade:** 🔴 CRÍTICO  
**Categoria:** Multi-Tenancy  
**Origem:** Arquitetura AuraCore

#### ❌ Código Errado

```typescript
interface UserFilter {
  organizationId: number;
  branchId?: number;  // ← NUNCA opcional!
}

// Query sem branchId retorna dados de TODAS as filiais
const users = await repo.findMany({ organizationId: 1 });  // ← Vazamento de dados!
```

#### Por Que É Errado

1. Multi-tenancy EXIGE filtro por filial
2. Dados de outras filiais podem vazar
3. Violação de segurança

#### ✅ Código Correto

```typescript
interface UserFilter {
  organizationId: number;
  branchId: number;  // ← SEMPRE obrigatório
}

// Todas as queries filtram por branchId
const users = await repo.findMany({ 
  organizationId: ctx.organizationId, 
  branchId: ctx.branchId 
});
```

#### Regras Relacionadas
- REPO-005: TODA query filtra organizationId + branchId
- PREVENT-006: branchId SEMPRE obrigatório

---

### AP-009: Correção Pontual Sem Mapeamento

**Severidade:** 🟠 ALTO  
**Categoria:** Processo  
**Origem:** E7.15, LL-2026-01-07-002

#### ❌ Processo Errado

```
Encontrar bug no arquivo A → Corrigir A → Descobrir mesmo bug em B
Corrigir B → Descobrir em C → Corrigir C → ...
(Loop infinito de correções)
```

#### Por Que É Errado

1. Nunca sabe o escopo total
2. Correções incompletas
3. Múltiplas iterações
4. Bugs reaparecem

#### ✅ Processo Correto

```bash
# 1. MAPEAR TUDO antes de corrigir
grep -rn "padrão" src/ --include="*.ts" | wc -l
grep -rn "padrão" src/ --include="*.ts" | cut -d: -f1 | sort -u

# 2. Documentar lista completa
# 3. Corrigir TODOS de uma vez
# 4. Verificar que nenhum ficou
```

#### Regras Relacionadas
- SMP-MAP-001: Mapear 100% antes de corrigir
- SMP-MAP-002: Relatório formal se > 10 ocorrências

---

### AP-010: Classe CSS Duplicada em Ícone

**Severidade:** 🟢 BAIXO  
**Categoria:** React  
**Origem:** E7.15

#### ❌ Código Errado

```typescript
<Icon className="h-5 h-5" />  // ← h-5 duplicado, falta w-5!
```

#### Por Que É Errado

1. Altura definida duas vezes
2. Largura não definida
3. Ícone pode ficar distorcido

#### ✅ Código Correto

```typescript
<Icon className="h-5 w-5" />  // ← Altura E largura
```

#### Regras Relacionadas
- PC-005: Icon className usa h-N w-N
- P-REACT-004: Icon className

---

## 📊 ESTATÍSTICAS

### Por Severidade

| Severidade | Quantidade | % |
|------------|------------|---|
| 🔴 CRÍTICO | 4 | 40% |
| 🟠 ALTO | 3 | 30% |
| 🟡 MÉDIO | 2 | 20% |
| 🟢 BAIXO | 1 | 10% |

### Por Categoria

| Categoria | Quantidade |
|-----------|------------|
| TypeScript | 5 |
| Database | 2 |
| Multi-Tenancy | 1 |
| Processo | 1 |
| React | 1 |

---

## 📝 COMO ADICIONAR NOVO ANTI-PATTERN

```markdown
### AP-NNN: [Nome do Anti-Pattern]

**Severidade:** [🔴 CRÍTICO | 🟠 ALTO | 🟡 MÉDIO | 🟢 BAIXO]  
**Categoria:** [Database | TypeScript | React | Processo | etc]  
**Origem:** [Épico/Projeto, Lição Aprendida]

#### ❌ Código Errado

```código```

#### Por Que É Errado

1. [Razão 1]
2. [Razão 2]

#### ✅ Código Correto

```código```

#### Regras Relacionadas
- [ID]: [Nome]
```
