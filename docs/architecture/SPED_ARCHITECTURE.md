# Arquitetura SPED - AuraCore

**Versão:** 2.0.0  
**Data:** 15/01/2026  
**Épico:** E7.18 - Migração SPED para DDD/Hexagonal  
**Arquitetura:** 100% DDD/Hexagonal (ADR-0015)

---

## 📋 Visão Geral

O módulo SPED (Sistema Público de Escrituração Digital) foi completamente migrado para arquitetura DDD/Hexagonal, implementando:

- ✅ **Input Ports**: Contratos de entrada (interfaces no Domain)
- ✅ **Use Cases**: Orquestração de negócio (Application Layer)
- ✅ **Domain Services**: Lógica pura de geração SPED
- ✅ **Output Ports**: Contratos de saída (ISpedDataRepository)
- ✅ **DI Container**: Injeção de dependência via tsyringe
- ✅ **Multi-tenancy**: ExecutionContext obrigatório

---

## 📂 Estrutura de Arquivos

```
src/modules/fiscal/
├── domain/
│   ├── ports/
│   │   ├── input/                       # Contratos de entrada
│   │   │   ├── IGenerateSpedFiscal.ts   # SPED Fiscal (EFD-ICMS/IPI)
│   │   │   ├── IGenerateSpedEcd.ts      # SPED ECD (Contábil)
│   │   │   └── IGenerateSpedContributions.ts # SPED Contribuições (PIS/COFINS)
│   │   └── output/                      # Contratos de saída
│   │       └── ISpedDataRepository.ts   # Acesso a dados
│   ├── services/                        # Lógica de negócio pura
│   │   ├── SpedFiscalGenerator.ts       # Geração SPED Fiscal
│   │   ├── SpedEcdGenerator.ts          # Geração SPED ECD
│   │   └── SpedContributionsGenerator.ts # Geração SPED Contribuições
│   └── value-objects/
│       └── SpedDocument.ts              # Documento SPED (VO)
├── application/
│   └── use-cases/
│       └── sped/
│           ├── GenerateSpedFiscalUseCase.ts       # Orquestra geração Fiscal
│           ├── GenerateSpedEcdUseCase.ts          # Orquestra geração ECD
│           └── GenerateSpedContributionsUseCase.ts # Orquestra geração Contribuições
└── infrastructure/
    ├── persistence/
    │   ├── repositories/
    │   │   └── DrizzleSpedDataRepository.ts # Implementação do repositório
    │   └── schemas/                         # Schemas Drizzle ORM
    ├── di/
    │   └── FiscalModule.ts                  # Registro DI
    └── bootstrap.ts                         # Inicialização do módulo
```

### Arquivos Legados (Deprecated)

```
src/services/                            # ⚠️ LEGACY - NÃO USAR
├── sped-fiscal-generator.ts             # Substituído por SpedFiscalGenerator (domain)
├── sped-ecd-generator.ts                # Substituído por SpedEcdGenerator (domain)
└── sped-contributions-generator.ts      # Substituído por SpedContributionsGenerator (domain)
```

---

## 🔄 Fluxo de Execução

### Exemplo: Geração SPED Fiscal

```
┌─────────────────────────────────────────────────────────────┐
│  1. API Route                                               │
│  POST /api/sped/fiscal/generate                             │
│  - Autenticação (auth)                                      │
│  - Multi-tenancy (getTenantContext)                         │
│  - Validação de input                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Resolução via DI                                        │
│  const useCase = container.resolve<IGenerateSpedFiscal>(    │
│    TOKENS.GenerateSpedFiscalUseCase                         │
│  );                                                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Use Case (Application Layer)                            │
│  GenerateSpedFiscalUseCase.execute(input, context)          │
│  - Valida input (competencia, finalidade)                   │
│  - Valida ExecutionContext (orgId, branchId, userId)        │
│  - Prepara dados para Domain Service                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Domain Service (Pure Business Logic)                   │
│  SpedFiscalGenerator.generate(period, data)                 │
│  - Gera blocos SPED (0, C, D, E, H, 9)                      │
│  - Aplica regras fiscais (Lei Kandir, RICMS)               │
│  - Retorna SpedDocument (Value Object)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Repository (Infrastructure)                             │
│  ISpedDataRepository.getOrganizationData()                  │
│  ISpedDataRepository.getNFes()                              │
│  ISpedDataRepository.getCTes()                              │
│  - Acessa banco de dados (SQL Server)                       │
│  - Retorna dados em formato Domain                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Retorno ao Use Case                                     │
│  - Converte SpedDocument para string                        │
│  - Calcula hash SHA256                                      │
│  - Gera filename                                            │
│  - Retorna Result<Output, string>                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Resposta HTTP                                           │
│  - Status 200 (sucesso) ou 400/500 (erro)                  │
│  - Headers: Content-Disposition, X-Sped-Hash, etc          │
│  - Body: Arquivo SPED (.txt, encoding ISO-8859-1)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Tokens DI (Dependency Injection)

Os Use Cases SPED são registrados no container tsyringe usando Symbols:

| Token (Symbol) | Interface (Input Port) | Implementação (Use Case) |
|----------------|------------------------|--------------------------|
| `TOKENS.GenerateSpedFiscalUseCase` | `IGenerateSpedFiscal` | `GenerateSpedFiscalUseCase` |
| `TOKENS.GenerateSpedEcdUseCase` | `IGenerateSpedEcd` | `GenerateSpedEcdUseCase` |
| `TOKENS.GenerateSpedContributionsUseCase` | `IGenerateSpedContributions` | `GenerateSpedContributionsUseCase` |
| `TOKENS.SpedDataRepository` | `ISpedDataRepository` | `DrizzleSpedDataRepository` |

### Uso Correto

```typescript
// ✅ CORRETO - Via DI Container
import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IGenerateSpedFiscal } from '@/modules/fiscal/domain/ports/input';

const useCase = container.resolve<IGenerateSpedFiscal>(
  TOKENS.GenerateSpedFiscalUseCase
);

const result = await useCase.execute(input, context);
```

```typescript
// ❌ OBSOLETO - Factory Functions (deprecated)
import { createGenerateSpedFiscalUseCase } from '@/modules/fiscal/infrastructure/di/FiscalModule';

const useCase = createGenerateSpedFiscalUseCase(); // @deprecated
```

---

## 🌐 APIs REST

### POST /api/sped/fiscal/generate

Gera arquivo SPED Fiscal (EFD-ICMS/IPI).

**Input Port:** `IGenerateSpedFiscal`

**Body:**
```json
{
  "competencia": "012026",          // Formato MMAAAA
  "finalidade": "ORIGINAL",         // ORIGINAL | RETIFICADORA | SUBSTITUTA
  "hashRetificado": "abc123..."     // Opcional (obrigatório se finalidade != ORIGINAL)
}
```

**Response (Success):**
- Status: 200
- Headers:
  - `Content-Type: text/plain; charset=utf-8`
  - `Content-Disposition: attachment; filename="SPED_FISCAL_012026.txt"`
  - `X-Sped-Hash: <sha256>`
  - `X-Sped-Total-Registros: 1234`
- Body: Arquivo SPED (texto)

**Response (Error):**
```json
{
  "error": "Descrição do erro"
}
```

---

### POST /api/sped/ecd/generate

Gera arquivo SPED ECD (Escrituração Contábil Digital).

**Input Port:** `IGenerateSpedEcd`

**Body:**
```json
{
  "anoExercicio": 2026,             // Ano (ex: 2026)
  "finalidade": "ORIGINAL",         // ORIGINAL | RETIFICADORA | SUBSTITUTA
  "hashRetificado": "abc123..."     // Opcional
}
```

**Response:** Similar ao SPED Fiscal

---

### POST /api/sped/contributions/generate

Gera arquivo SPED Contribuições (EFD-PIS/COFINS).

**Input Port:** `IGenerateSpedContributions`

**Body:**
```json
{
  "competencia": "012026",          // Formato MMAAAA
  "finalidade": "ORIGINAL",         // ORIGINAL | RETIFICADORA
  "hashRetificado": "abc123..."     // Opcional
}
```

**Response:** Similar ao SPED Fiscal

---

## 🏗️ Princípios Arquiteturais

### 1. Dependency Inversion (ARCH-005, ARCH-006)

```
Infrastructure → Application → Domain
      ↓              ↓            ↑
   [Adapters]   [Use Cases]  [Contracts]
                                  ↑
                            [Everybody depends
                             on this layer]
```

- Domain não depende de nada (exceto @/shared/domain)
- Application depende apenas de Domain (via Input/Output Ports)
- Infrastructure implementa Output Ports e injeta dependências

### 2. Input Ports Pattern (ARCH-010)

Todo Use Case implementa uma interface Input Port:

```typescript
// Domain Layer - Contract
export interface IGenerateSpedFiscal {
  execute(
    input: GenerateSpedFiscalInput,
    context: ExecutionContext
  ): Promise<Result<GenerateSpedFiscalOutput, string>>;
}

// Application Layer - Implementation
export class GenerateSpedFiscalUseCase implements IGenerateSpedFiscal {
  async execute(...) { ... }
}
```

### 3. Output Ports Pattern (ARCH-011)

Domain define contratos de saída (interfaces):

```typescript
// Domain Layer - Contract
export interface ISpedDataRepository {
  getOrganizationData(...): Promise<Result<OrganizationData, string>>;
  getNFes(...): Promise<Result<NFe[], string>>;
  // ...
}

// Infrastructure Layer - Implementation
export class DrizzleSpedDataRepository implements ISpedDataRepository {
  async getOrganizationData(...) { ... }
}
```

### 4. Domain Services Stateless (ARCH-009)

Domain Services são **pure functions** (sem estado):

```typescript
export class SpedFiscalGenerator {
  // ✅ Stateless - recebe tudo via parâmetros
  generate(
    period: SpedFiscalPeriod,
    data: SpedFiscalData
  ): Result<SpedDocument, string> {
    // Lógica pura, sem side effects
  }
}
```

### 5. Multi-Tenancy Obrigatório

Todo Use Case recebe `ExecutionContext`:

```typescript
export interface ExecutionContext {
  organizationId: number;  // Obrigatório
  branchId: number;        // Obrigatório (NUNCA opcional)
  userId: string;          // Obrigatório
}
```

---

## 🧪 Testes

### Testes Unitários

```bash
# Todos os testes do módulo fiscal
npm test -- --run tests/unit/modules/fiscal/

# Apenas testes SPED
npm test -- --run tests/unit/modules/fiscal/domain/services/Sped*.test.ts
```

**Cobertura SPED:**
- ✅ SpedFiscalGenerator.test.ts (3 testes)
- ✅ SpedEcdGenerator.test.ts (3 testes)
- ✅ SpedContributionsGenerator.test.ts (2 testes)
- **Total:** 8 testes básicos

### Testes de Integração (Planejado)

- [ ] POST /api/sped/fiscal/generate (E2E)
- [ ] POST /api/sped/ecd/generate (E2E)
- [ ] POST /api/sped/contributions/generate (E2E)

---

## ⚖️ Legislação e Conformidade

### Bases Legais

| SPED | Legislação | Multa Mínima | Periodicidade |
|------|------------|--------------|---------------|
| **SPED Fiscal** (EFD-ICMS/IPI) | Lei 8.218/91 Art. 12 | R$ 5.000/mês | Mensal |
| **SPED ECD** (Contábil) | Lei 8.218/91 Art. 12 | R$ 5.000/mês | Anual |
| **SPED Contribuições** (PIS/COFINS) | Lei 8.218/91 Art. 12 | R$ 5.000/mês | Mensal |

### Blocos Implementados

#### SPED Fiscal (EFD-ICMS/IPI)
- ✅ Bloco 0: Cadastros (0000, 0001, 0005, 0015, 0150, 0990)
- ✅ Bloco C: Documentos Fiscais - Entrada (C100, C170, C190, C990)
- ✅ Bloco D: Serviços/CTe (D100, D190, D990)
- ✅ Bloco E: Apuração ICMS (E100, E110, E990)
- ✅ Bloco H: Inventário (H005, H010, H990)
- ✅ Bloco 9: Encerramento (9001, 9900, 9990, 9999)

#### SPED ECD (Contábil)
- ✅ Bloco 0: Cadastros (0000, 0001, 0007, 0020, 0150, 0990)
- ✅ Bloco I: Lançamentos Contábeis (I010, I050, I051, I052, I990)
- ✅ Bloco J: Plano de Contas (J005, J100, J990)
- ✅ Bloco K: Saldos das Contas (K155, K990)
- ✅ Bloco 9: Encerramento (9001, 9900, 9990, 9999)

#### SPED Contribuições (PIS/COFINS)
- ✅ Bloco 0: Cadastros (0000, 0001, 0100, 0140, 0150, 0990)
- ✅ Bloco A: Receitas (A100, A170, A990)
- ✅ Bloco C: Créditos (C100, C170, C990)
- ✅ Bloco M: Apuração (M100, M110, M200, M210, M990)
- ✅ Bloco 9: Encerramento (9001, 9900, 9990, 9999)

---

## 📚 Referências

### Documentos Internos
- **ADR-0015:** Arquitetura 100% DDD/Hexagonal
- **E7.18:** Épico de Migração SPED
- **regrasmcp.mdc:** Regras de implementação obrigatórias

### Legislação
- **Lei 8.218/91 Art. 12:** Multas por não entrega de SPED
- **Lei Complementar 87/96 (Lei Kandir):** ICMS
- **Lei 10.637/02:** PIS não-cumulativo
- **Lei 10.833/03:** COFINS não-cumulativo
- **IN RFB 1.774/17:** SPED

### Arquitetura
- **Vernon, V. (2013):** Implementing Domain-Driven Design
- **Cockburn, A. (2005):** Hexagonal Architecture (Ports and Adapters)
- **Martin, R. C. (2017):** Clean Architecture

---

## 🔄 Histórico de Versões

| Versão | Data | Mudanças |
|--------|------|----------|
| 2.0.0 | 15/01/2026 | Migração completa para DDD/Hexagonal (E7.18) |
| 1.0.0 | 07/01/2026 | Implementação inicial (services diretos) |

---

**Mantido por:** Equipe de Engenharia AuraCore  
**Contato:** pedro.lemes@tcltransporte.com.br  
**Última Atualização:** 15/01/2026
