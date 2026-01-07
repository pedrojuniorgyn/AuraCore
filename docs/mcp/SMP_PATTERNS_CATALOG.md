# SMP - PATTERNS CATALOG

**Versão:** 1.0.0  
**Última Atualização:** 07/01/2026

---

## 📋 SOBRE ESTE DOCUMENTO

Este catálogo documenta os padrões CORRETOS de código do AuraCore. Consulte antes de implementar qualquer funcionalidade para garantir consistência.

---

## 🗂️ ÍNDICE DE CATEGORIAS

| Categoria | Prefixo | Quantidade |
|-----------|---------|------------|
| Database | P-DB | 5 |
| TypeScript | P-TYPE | 6 |
| React | P-REACT | 4 |
| API | P-API | 4 |
| Domain/DDD | P-DDD | 5 |

---

## 🗄️ P-DB: Database Patterns

### P-DB-001: db.execute() Result Access

**Contexto:** Acessar resultado de db.execute() que pode retornar dois formatos

**Padrão:**
```typescript
import { getFirstRow, getDbRows } from '@/lib/db/helpers';

// Para primeira linha
const user = getFirstRow<User>(result);

// Para todas as linhas
const users = getDbRows<User>(result);

// Ou manualmente (se helper não disponível):
const data = (result.recordset || result) as T[];
const row = data[0];
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA fazer
const row = result.recordset[0];  // Falha se recordset undefined
const row = (result as any)[0];   // Viola type-safety
const row = Array.isArray(result) ? result[0] : undefined;  // Código morto
```

**Regras Relacionadas:** PC-002, AP-001

---

### P-DB-002: Transações

**Contexto:** Operações que modificam múltiplas tabelas

**Padrão:**
```typescript
import { withMssqlTransaction } from '@/lib/db/transaction';

const result = await withMssqlTransaction(async (tx) => {
  await tx.insert(tableA).values(dataA);
  await tx.insert(tableB).values(dataB);
  return { success: true };
});
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA fazer operações múltiplas sem transação
await db.insert(tableA).values(dataA);
await db.insert(tableB).values(dataB);  // Se falhar, tableA fica inconsistente
```

---

### P-DB-003: Multi-Tenancy Filter

**Contexto:** Toda query DEVE filtrar por organizationId e branchId

**Padrão:**
```typescript
const results = await db
  .select()
  .from(table)
  .where(
    and(
      eq(table.organizationId, ctx.organizationId),
      eq(table.branchId, ctx.branchId),  // NUNCA opcional
      isNull(table.deletedAt)  // Soft delete
    )
  );
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA omitir branchId
const results = await db
  .select()
  .from(table)
  .where(eq(table.organizationId, ctx.organizationId));  // branchId faltando!
```

**Regras Relacionadas:** ARCH-011, REPO-005

---

### P-DB-004: Soft Delete

**Contexto:** Deleção de registros

**Padrão:**
```typescript
// Soft delete - PREFERIDO
await db
  .update(table)
  .set({ deletedAt: new Date() })
  .where(eq(table.id, id));

// Queries SEMPRE filtram deletedAt
.where(isNull(table.deletedAt))
```

**Anti-Pattern:**
```typescript
// ❌ EVITAR hard delete
await db.delete(table).where(eq(table.id, id));
```

---

### P-DB-005: Paginação

**Contexto:** Queries que retornam múltiplos registros

**Padrão:**
```typescript
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const [items, countResult] = await Promise.all([
  db.select().from(table).limit(pageSize).offset((page - 1) * pageSize),
  db.select({ count: count() }).from(table)
]);

return {
  items,
  total: countResult[0].count,
  page,
  pageSize,
  totalPages: Math.ceil(countResult[0].count / pageSize)
};
```

---

## 🔷 P-TYPE: TypeScript Patterns

### P-TYPE-001: Eliminar any - Promise

**Contexto:** Funções que retornam Promise

**Padrão:**
```typescript
// Tipo específico
async function getUser(id: string): Promise<User | null> { ... }

// Tipo genérico quando estrutura desconhecida
async function fetchData(): Promise<Record<string, unknown>> { ... }

// Array de tipo genérico
async function fetchItems(): Promise<Array<Record<string, unknown>>> { ... }
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
async function getData(): Promise<any> { ... }
```

---

### P-TYPE-002: Eliminar any - Parâmetros

**Contexto:** Parâmetros de função

**Padrão:**
```typescript
// Interface específica
interface ProcessOptions {
  format: 'json' | 'xml';
  validate: boolean;
}
function process(data: InputData, options: ProcessOptions): Result { ... }

// Record para objetos dinâmicos
function processConfig(config: Record<string, unknown>): void { ... }
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
function process(data: any, options: any): any { ... }
```

---

### P-TYPE-003: Eliminar any - Type Assertion

**Contexto:** Conversão de tipos

**Padrão:**
```typescript
// Com interface conhecida
const user = data as User;

// Com type guard
if (isUser(data)) {
  const user = data;  // TypeScript infere User
}

// Record para dados dinâmicos
const config = data as Record<string, unknown>;
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
const user = data as any;
const value = (obj as any).property;
```

---

### P-TYPE-004: Eliminar any - Arrays

**Contexto:** Arrays de dados

**Padrão:**
```typescript
// Tipo específico
const users: User[] = [];

// Array genérico
const items: Array<Record<string, unknown>> = [];

// unknown quando realmente desconhecido
const rawData: unknown[] = [];
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
const data: any[] = [];
```

---

### P-TYPE-005: Union Types Completas

**Contexto:** Valores com conjunto finito de opções

**Padrão:**
```typescript
// TODOS os valores possíveis
type MonthsAhead = 3 | 6 | 12 | 24 | 36 | 60;

// Verificar componente Select para incluir todos
const [value, setValue] = useState<MonthsAhead>(12);
onValueChange={(v) => setValue(Number(v) as MonthsAhead)}
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA truncar união
type MonthsAhead = 3 | 6 | 12;  // Faltam 24, 36, 60!
```

**Regras Relacionadas:** VAT-002

---

### P-TYPE-006: Type Guards

**Contexto:** Verificar tipo em runtime

**Padrão:**
```typescript
// Type guard function
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

// Uso
if (isUser(data)) {
  console.log(data.email);  // TypeScript sabe que é User
}

// Error handling
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
}
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
catch (error: any) {
  console.log(error.message);  // Pode quebrar se não for Error
}
```

**Regras Relacionadas:** TYPE-UNKNOWN-001

---

## ⚛️ P-REACT: React Patterns

### P-REACT-001: Event Handlers

**Contexto:** Handlers de eventos DOM

**Padrão:**
```typescript
// Input
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

// Form
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

// Button
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  // ...
};
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
const handleChange = (e: any) => { ... }
```

---

### P-REACT-002: Component Props

**Contexto:** Props de componentes

**Padrão:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function Button({ label, onClick, variant = 'primary', disabled }: ButtonProps) {
  // ...
}
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
function Button(props: any) { ... }
```

---

### P-REACT-003: AG Grid Cell Renderers

**Contexto:** Custom cell renderers no AG Grid

**Padrão:**
```typescript
import type { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';

// Cell renderer
const StatusRenderer = (params: ICellRendererParams<Order>) => {
  return <Badge>{params.value}</Badge>;
};

// Value formatter
const currencyFormatter = (params: ValueFormatterParams<Order>) => {
  return `R$ ${params.value?.toLocaleString('pt-BR')}`;
};
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
const renderer = (params: any) => { ... }
```

---

### P-REACT-004: Icon className

**Contexto:** Classes CSS em ícones Lucide

**Padrão:**
```typescript
// SEMPRE altura E largura
<Icon className="h-5 w-5" />
<ChevronRight className="h-4 w-4" />
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA duplicar classe
<Icon className="h-5 h-5" />  // Falta w-5!
```

**Regras Relacionadas:** PC-005

---

## 🌐 P-API: API Route Patterns

### P-API-001: Request Body Validation

**Contexto:** Validar corpo de requisição

**Padrão:**
```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1).trim(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'USER', 'VIEWER']),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  
  const data: CreateUserInput = parsed.data;
  // ...
}
```

---

### P-API-002: Response Types

**Contexto:** Tipagem de respostas

**Padrão:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
}

return NextResponse.json<ApiResponse<UserResponse>>({
  success: true,
  data: user
});
```

---

### P-API-003: Error Handling

**Contexto:** Tratamento de erros em API routes

**Padrão:**
```typescript
import { getErrorMessage } from '@/shared/types/type-guards';

export async function GET(req: NextRequest) {
  try {
    // ...
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Anti-Pattern:**
```typescript
// ❌ NUNCA usar
catch (error: any) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

---

### P-API-004: ExecutionContext

**Contexto:** Contexto de execução com multi-tenancy

**Padrão:**
```typescript
interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  permissions: string[];
}

export async function POST(req: NextRequest) {
  const ctx = await getExecutionContext(req);
  
  // Usar ctx em queries
  await repository.findByOrg(ctx.organizationId, ctx.branchId);
}
```

---

## 🏛️ P-DDD: Domain-Driven Design Patterns

### P-DDD-001: Entity com create() e reconstitute()

**Contexto:** Criação de entidades de domínio

**Padrão:**
```typescript
export class User extends AggregateRoot<string> {
  private constructor(id: string, private readonly props: UserProps) {
    super(id);
  }

  // Factory COM validações - para criar NOVO
  static create(props: CreateUserProps): Result<User, string> {
    if (!props.email) return Result.fail('Email obrigatório');
    if (!props.name?.trim()) return Result.fail('Nome obrigatório');
    
    return Result.ok(new User(crypto.randomUUID(), {
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  // Factory SEM validações - para reconstituir do banco
  static reconstitute(props: UserProps & { id: string }): Result<User, string> {
    return Result.ok(new User(props.id, props));
  }
}
```

**Regras Relacionadas:** ENTITY-002, ENTITY-003, MAPPER-004

---

### P-DDD-002: Value Object Imutável

**Contexto:** Value objects de domínio

**Padrão:**
```typescript
export class Email extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);  // Object.freeze aplicado automaticamente
  }

  get value(): string {
    return this.props.value;
  }

  static create(email: string): Result<Email, string> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      return Result.fail('Email inválido');
    }
    return Result.ok(new Email({ value: trimmed }));
  }
}
```

**Regras Relacionadas:** VO-001 a VO-010

---

### P-DDD-003: Repository Interface em Domain

**Contexto:** Definição de contratos de repositório

**Padrão:**
```typescript
// domain/ports/output/IUserRepository.ts
export interface IUserRepository {
  findById(id: string, orgId: number, branchId: number): Promise<User | null>;
  findMany(filter: UserFilter): Promise<PaginatedResult<User>>;
  save(entity: User): Promise<void>;
  delete(id: string, orgId: number, branchId: number): Promise<void>;
}

// branchId NUNCA opcional no filter
export interface UserFilter {
  organizationId: number;
  branchId: number;  // Obrigatório
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}
```

**Regras Relacionadas:** REPO-001, REPO-005

---

### P-DDD-004: Mapper toDomain/toPersistence

**Contexto:** Conversão entre domínio e persistência

**Padrão:**
```typescript
export class UserMapper {
  // Banco → Domínio (usa reconstitute, NUNCA create)
  static toDomain(row: UserRow): Result<User, string> {
    return User.reconstitute({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // Domínio → Banco
  static toPersistence(entity: User): UserInsert {
    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
```

**Regras Relacionadas:** MAPPER-001 a MAPPER-008

---

### P-DDD-005: Domain Service Stateless

**Contexto:** Lógica de domínio que não pertence a uma entidade

**Padrão:**
```typescript
export class TaxCalculator {
  // Constructor privado impede instanciação
  private constructor() {}

  // Métodos estáticos - 100% stateless
  static calculateICMS(value: Money, rate: number): Result<Money, string> {
    if (rate < 0 || rate > 100) {
      return Result.fail('Alíquota inválida');
    }
    return Money.create(value.amount * (rate / 100), value.currency);
  }
}
```

**Regras Relacionadas:** DOMAIN-SVC-001 a DOMAIN-SVC-010

---

## 📝 COMO ADICIONAR NOVO PADRÃO

```markdown
### P-[CAT]-NNN: [Nome do Padrão]

**Contexto:** [Quando usar este padrão]

**Padrão:**
```typescript
// Código correto
```

**Anti-Pattern:**
```typescript
// ❌ O que NÃO fazer
```

**Regras Relacionadas:** [IDs das regras]
```
