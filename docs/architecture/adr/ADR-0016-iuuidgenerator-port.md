# ADR-0016: IUuidGenerator Port for UUID Abstraction

**Data:** 06/01/2026  
**Status:** Accepted  
**Decisores:** Equipe de Arquitetura AuraCore  
**Épico:** E7.14  

---

## Contexto

Use Cases estavam usando `crypto.randomUUID()` diretamente, o que violava múltiplos princípios arquiteturais:

1. **ARCH-004**: Domain não deve importar módulos Node.js
2. **Testabilidade**: UUIDs aleatórios tornam testes não-determinísticos
3. **DDD Puro**: Application layer estava acoplada a implementação de infraestrutura
4. **Dependency Inversion**: Sem abstração para geração de IDs

### Problemas Específicos

- Use Cases com `crypto.randomUUID()` geravam IDs diferentes a cada execução
- Testes unitários não podiam prever IDs gerados, dificultando assertions
- 12 Use Cases violando ARCH-004 (financial: 2, accounting: 2, fiscal: 2, wms: 6)
- 17 ocorrências de `crypto.randomUUID()` espalhadas pela Application layer

---

## Decisão

Criamos **`IUuidGenerator` port** no domain com dois adapters:

### Estrutura Implementada

```
src/shared/
├── domain/
│   └── ports/
│       └── IUuidGenerator.ts          # Interface (Port)
├── infrastructure/
    ├── adapters/
    │   ├── CryptoUuidGenerator.ts      # Adapter Produção
    │   ├── DeterministicUuidGenerator.ts # Adapter Testes
    │   ├── __tests__/
    │   │   └── UuidGenerator.test.ts   # 12 testes
    │   └── index.ts
    └── di/
        ├── tokens.ts                   # TOKENS.UuidGenerator
        └── container.ts                # Singleton registration
```

### Interfaces

```typescript
// Port (Domain)
export interface IUuidGenerator {
  generate(): string;
}

// Adapter Produção
@injectable()
export class CryptoUuidGenerator implements IUuidGenerator {
  generate(): string {
    return globalThis.crypto.randomUUID();
  }
}

// Adapter Testes
export class DeterministicUuidGenerator implements IUuidGenerator {
  private counter = 0;

  generate(): string {
    this.counter++;
    const hexCounter = this.counter.toString(16).padStart(8, '0');
    return `${hexCounter}-0000-4000-8000-000000000000`;
  }

  reset(): void {
    this.counter = 0;
  }

  peekNext(): string {
    const next = this.counter + 1;
    const hexCounter = next.toString(16).padStart(8, '0');
    return `${hexCounter}-0000-4000-8000-000000000000`;
  }
}
```

### Uso em Use Cases

```typescript
@injectable()
export class CreatePayableUseCase {
  constructor(
    @inject(TOKENS.PayableRepository) private payableRepository: IPayableRepository,
    @inject(TOKENS.UuidGenerator) private uuidGenerator: IUuidGenerator
  ) {}

  async execute(input: Input, ctx: ExecutionContext): Promise<Result<Output, string>> {
    const id = this.uuidGenerator.generate();
    const payableResult = AccountPayable.create({ id, ...input });
    // ...
  }
}
```

### Uso em Testes

```typescript
describe('CreatePayableUseCase', () => {
  let mockUuidGenerator: IUuidGenerator;

  beforeEach(() => {
    mockUuidGenerator = {
      generate: vi.fn().mockReturnValue('00000001-0000-4000-8000-000000000000'),
    };

    useCase = new CreatePayableUseCase(mockRepository, mockUuidGenerator);
  });

  it('should create payable with deterministic UUID', async () => {
    const result = await useCase.execute(validInput, ctx);
    
    expect(Result.isOk(result)).toBe(true);
    expect(mockUuidGenerator.generate).toHaveBeenCalledTimes(1);
  });
});
```

---

## Consequências

### Positivas

1. **✅ Domain/Application 100% Puro**: Zero imports de Node.js modules
2. **✅ Testes Determinísticos**: UUIDs previsíveis (`00000001-...`, `00000002-...`)
3. **✅ ARCH-004 Compliance**: Todas as 17 ocorrências substituídas
4. **✅ Dependency Inversion**: Application depende de abstração, não implementação
5. **✅ Testabilidade**: `peekNext()` permite assertions sem executar `generate()`
6. **✅ Flexibilidade**: Fácil trocar implementação (UUID v7, ULID, Snowflake, etc)

### Negativas

1. **❌ Boilerplate Adicional**: Interface + 2 adapters + DI setup
2. **❌ Todos os Testes Precisam Mock**: 4 Use Case tests tiveram que ser atualizados
3. **❌ Mais Injeção de Dependência**: Cada Use Case precisa injetar IUuidGenerator

### Mitigações

- **Boilerplate**: Compensado por clareza arquitetural e testabilidade
- **Testes**: Mock é simples (1 método) e pode ser reutilizado em helper
- **DI**: tsyringe automatiza injeção, overhead mínimo

---

## Métricas de Implementação

| Métrica | Valor |
|---------|-------|
| Use Cases refatorados | 12 |
| Ocorrências substituídas | 17 |
| Testes criados (adapters) | 12 |
| Testes atualizados (Use Cases) | 4 |
| Arquivos criados | 7 |
| Linhas de código (total) | ~150 |
| Tempo de implementação | ~2h |
| **Cobertura DDD/Hexagonal** | **100%** |

### Distribuição por Módulo

| Módulo | Use Cases | Ocorrências |
|--------|-----------|-------------|
| Financial | 2 | 2 |
| Accounting | 2 | 3 |
| Fiscal | 2 | 3 |
| WMS | 6 | 9 |
| **Total** | **12** | **17** |

---

## Alternativas Consideradas

### 1. Usar `globalThis.crypto.randomUUID()` em Entities

**Prós:**
- Menos código (sem port/adapters)
- globalThis não requer import (não viola ARCH-004)

**Contras:**
- ❌ Testes ainda não-determinísticos
- ❌ Entities gerando IDs viola Single Responsibility
- ❌ Dificulta trocar estratégia de geração de ID

**Decisão:** Rejeitada. Testabilidade e flexibilidade são prioritárias.

### 2. Passar ID como parâmetro para `Entity.create()`

**Prós:**
- Use Case controla geração de ID
- Sem port/adapter necessário

**Contras:**
- ❌ ID obrigatório em toda chamada `create()`
- ❌ Ainda acopla Use Case a `crypto.randomUUID()`
- ❌ Não resolve ARCH-004

**Decisão:** Rejeitada. Não resolve problema de acoplamento.

### 3. UUID em Domain Service

**Prós:**
- Domain Service centraliza lógica

**Contras:**
- ❌ Domain Service ainda precisa usar `globalThis.crypto` ou receber port
- ❌ Adiciona camada desnecessária

**Decisão:** Rejeitada. Port/Adapter é mais direto.

---

## Conformidade

### Contratos MCP Atualizados

- **ENTITY-010**: Agora menciona `IUuidGenerator` implementado em E7.14
- **ARCH-004**: Lista `globalThis.crypto` como exceção permitida

### Testes Arquiteturais

```bash
# SCHEMA-003: Validação automática de índices compostos
npm run test:arch
✅ 1 test passed (schema-composite-index.test.ts)
```

### Testes Unitários

```bash
npm test -- --run
✅ 876/876 testes passando (incluindo 12 novos do IUuidGenerator)
```

---

## Referências

- **Cockburn, A.** (2005). *Hexagonal Architecture (Ports and Adapters)*
- **Vernon, V.** (2013). *Implementing Domain-Driven Design*, Cap. 4 (Architecture)
- **Martin, R. C.** (2017). *Clean Architecture*, Cap. 22 (Clean Architecture)
- **Fowler, M.** (2002). *Patterns of Enterprise Application Architecture*, Cap. 8 (Identity Field)
- **ADR-0015**: 100% DDD/Hexagonal Architecture

---

## Revisão

Este ADR deve ser revisado em caso de:
- Mudança de estratégia de geração de IDs (UUID v7, ULID, Snowflake)
- Necessidade de IDs distribuídos (múltiplos servidores)
- Performance crítica de geração de ID

**Próxima revisão sugerida:** 06/07/2026 (6 meses)

---

**Status:** ✅ Implementado e testado (06/01/2026)

