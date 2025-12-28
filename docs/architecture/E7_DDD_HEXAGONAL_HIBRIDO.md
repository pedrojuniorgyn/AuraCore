# E7 - Arquitetura DDD + Hexagonal Híbrida

## 📋 Sumário Executivo

O AuraCore está migrando para uma arquitetura **Domain-Driven Design (DDD)** com **Arquitetura Hexagonal** de forma **híbrida e incremental**.

### Objetivos
- Separar regras de negócio da infraestrutura
- Facilitar testes e manutenção
- Reduzir acoplamento entre módulos
- Preparar para escala enterprise

### Cronograma
- **Duração Total:** 21 semanas (~5 meses)
- **Início:** Dezembro 2024
- **Término Previsto:** Maio 2025

---

## 🎯 Filosofia Híbrida

Nem toda operação precisa de DDD completo. Usamos **o padrão certo para cada complexidade**:

| Padrão | % do Código | Quando Usar | Exemplo |
|--------|-------------|-------------|---------|
| **Vertical Slice** | ~46% | CRUDs simples | list-payables, create-payable |
| **Functional Core** | ~12% | Cálculos puros, 100% testáveis | calculate-interest, validate-cnpj |
| **Hexagonal Lite** | ~7% | Operações médias | transferências, consultas |
| **Hexagonal + DDD** | ~35% | Operações complexas | PayAccountPayable, GenerateSPED |

### Critérios de Decisão
```
┌─────────────────────────────────────────────────────────────────┐
│  COMO DECIDIR O PADRÃO?                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  É CRUD simples (list/create/update/delete)?                   │
│  └── SIM → Vertical Slice                                      │
│                                                                 │
│  É cálculo puro sem side effects?                              │
│  └── SIM → Functional Core                                     │
│                                                                 │
│  Tem regras de negócio complexas?                              │
│  └── SIM → Hexagonal + DDD                                     │
│                                                                 │
│  Precisa de integração externa?                                │
│  └── SIM → Hexagonal Lite (ou DDD se complexo)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Estrutura de Pastas
```
src/
├── modules/                              # 📦 MODULAR MONOLITH
│   ├── financial/                        # Módulo Financeiro
│   │   ├── index.ts                      # API pública do módulo
│   │   ├── features/                     # 🟢 Vertical Slice (CRUDs)
│   │   │   ├── list-payables/
│   │   │   │   ├── handler.ts
│   │   │   │   └── handler.test.ts
│   │   │   ├── create-payable/
│   │   │   ├── update-payable/
│   │   │   └── delete-payable/
│   │   ├── core/                         # 🔵 Functional Core (cálculos)
│   │   │   ├── calculate-interest.ts
│   │   │   ├── calculate-interest.test.ts
│   │   │   ├── calculate-fine.ts
│   │   │   ├── calculate-discount.ts
│   │   │   └── calculate-tax-retention.ts
│   │   ├── domain/                       # 🔴 Hexagonal + DDD
│   │   │   ├── entities/
│   │   │   │   ├── AccountPayable.ts
│   │   │   │   └── Payment.ts
│   │   │   ├── value-objects/
│   │   │   │   └── PaymentTerms.ts
│   │   │   ├── events/
│   │   │   │   ├── PaymentCompletedEvent.ts
│   │   │   │   └── PaymentCancelledEvent.ts
│   │   │   ├── ports/                    # Interfaces (Ports)
│   │   │   │   ├── input/
│   │   │   │   │   └── IPayAccountUseCase.ts
│   │   │   │   └── output/
│   │   │   │       ├── IPayableRepository.ts
│   │   │   │       └── IBankAccountRepository.ts
│   │   │   └── use-cases/
│   │   │       ├── PayAccountPayable.ts
│   │   │       └── ReceivePayment.ts
│   │   ├── infrastructure/               # Adapters
│   │   │   ├── repositories/
│   │   │   │   └── DrizzlePayableRepository.ts
│   │   │   ├── gateways/
│   │   │   │   └── BtgGateway.ts
│   │   │   └── http/
│   │   │       └── PayablesController.ts
│   │   └── schema.ts                     # Drizzle schema do módulo
│   │
│   ├── accounting/                       # Módulo Contábil
│   ├── fiscal/                           # Módulo Fiscal
│   ├── tms/                              # Módulo TMS
│   └── wms/                              # Módulo WMS
│
├── shared/                               # 🔷 KERNEL COMPARTILHADO
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── AggregateRoot.ts
│   │   │   ├── Entity.ts
│   │   │   └── ValueObject.ts
│   │   ├── value-objects/
│   │   │   ├── Money.ts
│   │   │   ├── CNPJ.ts
│   │   │   ├── CPF.ts
│   │   │   └── Email.ts
│   │   ├── errors/
│   │   │   └── DomainError.ts
│   │   ├── events/
│   │   │   └── DomainEvent.ts
│   │   └── types/
│   │       └── Result.ts
│   └── infrastructure/
│       └── di/
│           ├── container.ts
│           └── tokens.ts
│
└── app/                                  # Next.js (routing apenas)
    └── api/
```

---

## 📐 Camadas da Arquitetura

### 1. Domain Layer (Núcleo)
**Localização:** `src/modules/*/domain/` e `src/shared/domain/`

**Contém:**
- Entities (com comportamento)
- Value Objects (imutáveis)
- Domain Events
- Repository Interfaces (Ports)
- Domain Services

**Regras:**
- ✅ ZERO dependências externas
- ✅ Lógica de negócio AQUI
- ❌ Nunca importa de infrastructure
- ❌ Nunca usa `any`

### 2. Application Layer (Use Cases)
**Localização:** `src/modules/*/domain/use-cases/`

**Contém:**
- Use Cases (orquestração)
- Application Services
- DTOs

**Regras:**
- ✅ Importa apenas de `domain`
- ✅ Gerencia transações
- ✅ Publica eventos
- ❌ Nunca tem lógica de negócio

### 3. Infrastructure Layer (Adapters)
**Localização:** `src/modules/*/infrastructure/`

**Contém:**
- Repository Implementations
- Database (Drizzle ORM)
- External APIs (BTG, SEFAZ)
- Event Bus

**Regras:**
- ✅ Implementa interfaces do domain
- ❌ Nunca contém lógica de negócio

### 4. Presentation Layer (HTTP)
**Localização:** `src/app/api/`

**Contém:**
- API Routes (Next.js)

**Regras:**
- ✅ Apenas validação e orquestração
- ✅ Chama Use Cases
- ❌ Nunca tem lógica de negócio

---

## 🔄 Fluxo de Dependências
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  REGRA DE OURO: Dependências apontam para DENTRO (Domain)      │
│                                                                 │
│  Presentation → Application → Domain ← Infrastructure          │
│                                                                 │
│  ┌──────────────┐                                              │
│  │ Presentation │ ─────────────────────────┐                   │
│  └──────────────┘                          │                   │
│         │                                  │                   │
│         ▼                                  │                   │
│  ┌──────────────┐                          │                   │
│  │ Application  │ ────────────┐            │                   │
│  └──────────────┘             │            │                   │
│         │                     │            │                   │
│         ▼                     ▼            ▼                   │
│  ┌────────────────────────────────────────────┐                │
│  │              DOMAIN (Núcleo)               │                │
│  │  Entities, Value Objects, Events, Ports    │                │
│  └────────────────────────────────────────────┘                │
│                       ▲                                        │
│                       │                                        │
│  ┌──────────────────────────────────────────┐                  │
│  │           Infrastructure                  │                  │
│  │  Repositories, Gateways, Database         │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Cronograma de Implementação

| Fase | Duração | Descrição | Status |
|------|---------|-----------|--------|
| **E7.0** | 1 semana | Setup + Infraestrutura de Testes | ✅ Concluído |
| **E7.1** | 1 semana | Shared Kernel + Value Objects | ✅ Concluído |
| **E7.2** | 4 semanas | Módulo Financial (Piloto) | ⬜ Pendente |
| **E7.3** | 3 semanas | Módulo Accounting | ⬜ Pendente |
| **E7.4** | 4 semanas | Módulo Fiscal (Crítico!) | ⬜ Pendente |
| **E7.5** | 3 semanas | Módulo TMS | ⬜ Pendente |
| **E7.6** | 2 semanas | Módulo WMS | ⬜ Pendente |
| **E7.7** | 2 semanas | Integrações Externas | ⬜ Pendente |
| **E7.8** | 1 semana | Cleanup + CI/CD | ⬜ Pendente |

**Total:** 21 semanas (~5 meses)

---

## 🧪 Estratégia de Testes

### Cobertura Mínima
- **Global:** 80%
- **Functional Core:** 100%
- **Domain Entities:** 90%
- **Use Cases:** 85%

### Pirâmide de Testes
```
        ┌───────────────┐
        │   E2E (10%)   │  ← Poucos, lentos, caros
        ├───────────────┤
        │Integration(20)│  ← APIs, Repositories
        ├───────────────┤
        │  Unit (70%)   │  ← Muitos, rápidos, baratos
        └───────────────┘
```

### Framework
- **Vitest** para testes
- **Coverage V8** para cobertura
- **InMemoryRepository** para mocks

---

## 📦 Value Objects Implementados (E7.1)

| Value Object | Descrição | Testes |
|--------------|-----------|--------|
| Money | Valores monetários, operações, formatação | 25 |
| CNPJ | Validação brasileira com dígitos verificadores | 10 |
| Email | Validação de formato, lowercase | 12 |
| CPF | (Pendente) | - |
| DateRange | (Pendente) | - |
| TaxRate | (Pendente) | - |

---

## 🔧 Padrões de Código

### Result Pattern
```typescript
// Uso correto
const result = Money.create(100);
if (Result.isOk(result)) {
  console.log(result.value.amount);
}

// NUNCA usar try/catch para fluxo de controle
```

### Entity com Comportamento
```typescript
// ✅ CORRETO - Entity com métodos de negócio
class AccountPayable extends AggregateRoot<string> {
  pay(amount: Money, date: Date): Result<Payment, string> {
    // Validações de negócio AQUI
    if (this.status !== 'OPEN') {
      return Result.fail('Cannot pay non-open account');
    }
    // ...
  }
}

// ❌ ERRADO - Entity anêmica
class AccountPayable {
  id: string;
  amount: number;
  // Sem métodos de negócio
}
```

### Repository Interface
```typescript
// Port (interface no domain)
interface IPayableRepository {
  findById(id: string): Promise<AccountPayable | null>;
  save(payable: AccountPayable): Promise<void>;
}

// Adapter (implementação na infrastructure)
class DrizzlePayableRepository implements IPayableRepository {
  // Implementação com Drizzle
}
```

---

## 🚀 Benefícios Esperados

### Curto Prazo (3 meses)
- ✅ Código mais testável
- ✅ Separação clara de responsabilidades
- ✅ Redução de bugs em regras de negócio

### Médio Prazo (6 meses)
- ✅ Facilidade para adicionar novos módulos
- ✅ Refatorações mais seguras
- ✅ Onboarding mais rápido para novos devs

### Longo Prazo (12+ meses)
- ✅ Possibilidade de extrair microserviços
- ✅ Código enterprise-ready
- ✅ Manutenibilidade superior

---

## 📚 Referências

### Livros
- "Domain-Driven Design" - Eric Evans
- "Implementing Domain-Driven Design" - Vaughn Vernon
- "Clean Architecture" - Robert C. Martin

### Decisões Arquiteturais
- ADR-0001: SQL Server como único banco
- ADR-0002: Tenant Context como fonte de verdade
- ADR-0005: Transações obrigatórias em Financeiro/Contábil

### Contratos
- TENANT_BRANCH_CONTRACT.md
- TRANSACTIONS_CONTRACT.md
- API_CONTRACT.md

---

## 📝 Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2024-12-28 | 1.0.0 | E7.0 - Setup + Infraestrutura |
| 2024-12-28 | 1.1.0 | E7.1 - Value Objects (Money, CNPJ, Email) |

