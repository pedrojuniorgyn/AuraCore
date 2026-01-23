# 🏗️ AuraCore - Arquitetura DDD/Hexagonal

**Versão:** 2.0.0  
**Data:** 06/01/2026  
**Status:** Definitivo (ADR-0015)  

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Princípios Fundamentais](#2-princípios-fundamentais)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Camadas da Arquitetura](#4-camadas-da-arquitetura)
5. [Padrões de Código](#5-padrões-de-código)
6. [Banco de Dados](#6-banco-de-dados)

---

## 1. Visão Geral

O AuraCore utiliza **100% DDD (Domain-Driven Design) + Hexagonal Architecture** conforme decisão documentada em [ADR-0015](./adr/ADR-0015-100-percent-ddd.md).

### Por que esta arquitetura?

| Benefício | Como Alcançamos |
|-----------|-----------------|
| **Testabilidade** | Domain sem dependências externas |
| **Manutenibilidade** | Separação clara de responsabilidades |
| **Flexibilidade** | Trocar infra sem tocar no domain |
| **Consistência** | Padrão único em todos os módulos |
| **Onboarding** | Estrutura previsível e documentada |

---

## 2. Princípios Fundamentais

### 2.1 Regra de Ouro: Dependências Apontam para Dentro

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   PRESENTATION (src/app/api/)                                          │
│   └── Valida input, chama Use Cases, formata response                  │
│                              │                                          │
│                              ▼                                          │
│   APPLICATION (commands/, queries/)                                     │
│   └── Orquestra Domain, gerencia transações, publica eventos           │
│                              │                                          │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                         DOMAIN                                   │  │
│   │                                                                  │  │
│   │   🔒 ZERO DEPENDÊNCIAS EXTERNAS 🔒                              │  │
│   │                                                                  │  │
│   │   Entities • Value Objects • Domain Services • Events • Ports   │  │
│   │                                                                  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              ▲                                          │
│                              │                                          │
│   INFRASTRUCTURE (persistence/, adapters/)                             │
│   └── Implementa Ports, Drizzle ORM, clientes HTTP                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Imports Permitidos

| Camada | Pode Importar de |
|--------|------------------|
| **Domain** | `@/shared/domain` apenas |
| **Application** | Domain, `@/shared/domain` |
| **Infrastructure** | Domain, Application, bibliotecas externas |
| **Presentation** | Application, Infrastructure (DI) |

---

## 3. Estrutura de Pastas

### Template Oficial

```
src/modules/{module-name}/
│
├── domain/                              # 🔴 NÚCLEO
│   ├── entities/
│   ├── value-objects/
│   ├── aggregates/
│   ├── services/                        # Domain Services
│   ├── events/
│   ├── errors/
│   └── ports/
│       ├── input/                       # Use Case interfaces
│       └── output/                      # Repository interfaces
│
├── application/                         # 🟡 ORQUESTRAÇÃO
│   ├── commands/                        # Write Operations
│   ├── queries/                         # Read Operations
│   ├── services/
│   └── dtos/
│
├── infrastructure/                      # 🟢 ADAPTERS
│   ├── persistence/
│   │   ├── repositories/
│   │   ├── mappers/
│   │   └── schemas/                     # 1 arquivo por tabela
│   ├── adapters/
│   └── di/
│
└── index.ts
```

---

## 4. Camadas da Arquitetura

### 4.1 Domain Layer

**Regras:**
- ✅ ZERO dependências externas
- ✅ Lógica de negócio AQUI
- ✅ Result pattern (não throw)
- ❌ Nunca importa de infrastructure/application

### 4.2 Application Layer

**Regras:**
- ✅ Commands em `commands/`, Queries em `queries/`
- ✅ Implementa interfaces de `domain/ports/input/`
- ✅ Orquestra, não tem lógica de negócio
- ❌ Nunca importa de infrastructure diretamente

### 4.3 Infrastructure Layer

**Regras:**
- ✅ Implementa interfaces do domain
- ✅ Usa Mapper para conversão
- ✅ 1 schema por tabela
- ❌ Nunca contém lógica de negócio

---

## 5. Padrões de Código

### Entity

```typescript
export class Entity extends AggregateRoot<string> {
  static create(props): Result<Entity, string> { /* validações */ }
  static reconstitute(props): Result<Entity, string> { /* sem validações */ }
}
```

### Value Object

```typescript
export class VO extends ValueObject<Props> {
  static create(value): Result<VO, string> { /* validações */ }
}
```

### Domain Service

```typescript
export class Service {
  private constructor() {}
  static calculate(params): Result<Output, string> { /* lógica pura */ }
}
```

---

## 6. Banco de Dados

### Regras de Schema

| Regra | Descrição |
|-------|-----------|
| Multi-tenancy | `organizationId + branchId` obrigatórios |
| Money | 2 colunas: `amount` + `currency` |
| Soft Delete | `deletedAt` nullable |
| Auditoria | `createdAt`, `updatedAt` obrigatórios |
| Índices | Compostos para queries frequentes |

---

## 7. Status da Migração DDD

### 7.1 Módulos DDD (12/12) ✅

| Módulo | Domain | Application | Infrastructure | DI |
|--------|--------|-------------|----------------|-----|
| accounting | ✅ | ✅ | ✅ | ✅ |
| commercial | ✅ | - | ✅ | ✅ |
| contracts | ✅ | ✅ | ✅ | ✅ |
| documents | ✅ | ✅ | ✅ | ✅ |
| financial | ✅ | ✅ | ✅ | ✅ |
| fiscal | ✅ | ✅ | ✅ | ✅ |
| fleet | ✅ | - | ✅ | ✅ |
| integrations | ✅ | ✅ | ✅ | ✅ |
| knowledge | ✅ | ✅ | ✅ | ✅ |
| strategic | ✅ | ✅ | ✅ | ✅ |
| tms | ✅ | ✅ | ✅ | ✅ |
| wms | ✅ | ✅ | ✅ | ✅ |

### 7.2 Código Legado (Anti-Corruption Layer)

O diretório `src/services/` contém **39 serviços legados** que são acessados **exclusivamente via Adapters** na camada de infrastructure.

**Estratégia:** Anti-Corruption Layer (ACL)
```
API Route → Use Case → Domain → [Adapter] → Legacy Service
                         ↓
              Infrastructure Adapter encapsula
              chamadas para @/services/*
```

**Benefícios:**
- Domain permanece puro (sem imports de services/)
- Migração gradual sem quebrar produção
- Cada adapter pode ser substituído por implementação DDD pura

### 7.3 Épicos de Arquitetura

| Épico | Nome | Status | Data |
|-------|------|--------|------|
| E7 | DDD/Hexagonal Migration | ✅ Concluído | 2025-12 |
| E8 | API Routes em DDD | ✅ Concluído | 2026-01 |
| E9 | Strategic Module DDD | ✅ Concluído | 2026-01 |
| E10 | Auditoria Arquitetural | ✅ Concluído | 2026-01-23 |
| E11 | Correções Arquiteturais Críticas | ✅ Concluído | 2026-01-23 |

### 7.4 E11 - Correções Arquiteturais (Concluído)

**Violações Corrigidas:**

| Contrato | Antes | Depois | Correção |
|----------|:-----:|:------:|----------|
| ARCH-001 | 11 | 0 | Movido DTOs para domain/types |
| ARCH-002 | 10 | 0 | Movido tipos docling para shared/domain |
| ARCH-004 | 1 | 0 | Substituído crypto por hash simples |
| **Total** | **22** | **0** | **100% corrigido** |

**Arquivos Criados:**
- `src/modules/financial/domain/types/payable.types.ts`
- `src/modules/accounting/domain/types/journal-entry.types.ts`
- `src/modules/wms/domain/types/wms.types.ts`
- `src/shared/domain/types/document-extraction.types.ts`

---

**Versão:** 2.2.0 | **Última atualização:** 23/01/2026

