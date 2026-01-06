# ADR-0015: Arquitetura 100% DDD/Hexagonal

**Data:** 06/01/2026  
**Status:** Aceito  
**Decisores:** Equipe de Arquitetura AuraCore  

---

## Contexto

O AuraCore ERP evoluiu organicamente durante o desenvolvimento, resultando em uma arquitetura híbrida com múltiplos padrões coexistindo:

- **Vertical Slice** (~46%) - CRUDs simples
- **Functional Core** (~12%) - Funções de cálculo isoladas
- **Hexagonal Lite** (~7%) - Integrações externas básicas
- **Hexagonal + DDD** (~35%) - Módulos mais complexos

Esta diversidade de padrões criou os seguintes problemas:

1. **Inconsistência entre módulos** - Cada desenvolvedor implementava de forma diferente
2. **Dificuldade de onboarding** - Novos devs precisavam aprender múltiplos padrões
3. **Manutenção complexa** - Código legado em `src/services/` fora da estrutura modular
4. **Testabilidade reduzida** - Sem separação clara de camadas
5. **Acoplamento indesejado** - Domain importando de infrastructure

---

## Decisão

**Adotamos 100% DDD (Domain-Driven Design) + Hexagonal Architecture** para todo o código do AuraCore, com as seguintes definições:

### Estrutura Obrigatória por Módulo

```
src/modules/{module}/
├── domain/                     # Núcleo - ZERO dependências externas
│   ├── entities/               # Entidades com identidade e comportamento
│   ├── value-objects/          # Objetos imutáveis
│   ├── aggregates/             # Aggregate Roots
│   ├── services/               # Domain Services (stateless)
│   ├── events/                 # Domain Events
│   ├── errors/                 # Erros tipados
│   └── ports/
│       ├── input/              # Interfaces de Use Cases
│       └── output/             # Interfaces de Repositories/Gateways
├── application/                # Orquestração
│   ├── commands/               # Write Operations (mudam estado)
│   ├── queries/                # Read Operations (não mudam estado)
│   ├── services/               # Application Services complexos
│   └── dtos/                   # Data Transfer Objects
├── infrastructure/             # Implementações concretas
│   ├── persistence/
│   │   ├── repositories/       # Implementam ports/output
│   │   ├── mappers/            # Domain <-> Persistence
│   │   └── schemas/            # 1 arquivo por tabela
│   ├── adapters/               # Serviços externos (SEFAZ, BTG)
│   └── di/                     # Dependency Injection
└── index.ts                    # API pública do módulo
```

### Regras Invioláveis

1. **Domain Layer**
   - ZERO imports de outras camadas
   - ZERO imports de bibliotecas externas (drizzle, axios, etc)
   - ZERO imports de módulos Node.js (fs, path, etc)
   - Entities têm comportamento, não são anêmicas
   - Value Objects são imutáveis
   - Domain Services são stateless (métodos estáticos)

2. **Application Layer**
   - Commands em `commands/`, Queries em `queries/`
   - Use Cases implementam interface de `domain/ports/input/`
   - Use Cases orquestram, não têm lógica de negócio
   - Use Cases usam DI para repositories

3. **Infrastructure Layer**
   - Repositories implementam `domain/ports/output/`
   - Mappers convertem Domain <-> Persistence
   - 1 schema por tabela de banco
   - ACL para integrações externas

4. **Banco de Dados**
   - Multi-tenancy: `organizationId + branchId` em toda query
   - Money: 2 colunas (`amount` + `currency`)
   - Soft delete: `deletedAt` nullable
   - Auditoria: `createdAt`, `updatedAt` obrigatórios
   - Índices compostos para queries frequentes

### Padrões Descontinuados

- ❌ Vertical Slice (migrar para commands/queries)
- ❌ Functional Core isolado (incorporar a Domain Services)
- ❌ Código em `src/services/` (migrar para módulos)
- ❌ Use Cases em `domain/use-cases/` (mover para application/)

---

## Consequências

### Positivas

1. **Consistência total** - Todos os módulos seguem mesmo padrão
2. **Onboarding rápido** - Dev novo aprende uma vez, aplica em todo lugar
3. **Testabilidade** - Domain 100% testável sem mocks de infra
4. **Manutenibilidade** - Mudanças localizadas, sem efeitos colaterais
5. **Flexibilidade** - Trocar banco/framework sem tocar no domain
6. **Documentação via código** - Estrutura autoexplicativa

### Negativas

1. **Mais arquivos** - Estrutura mais verbosa
2. **Curva inicial** - Time precisa aprender DDD/Hexagonal
3. **Refatoração necessária** - Migrar código legado

### Mitigações

- **Mais arquivos**: Compensado por clareza e manutenibilidade
- **Curva inicial**: Templates e contratos MCP guiam implementação
- **Refatoração**: Sprint dedicada de 7 dias para padronização

---

## Implementação

### Fase 1: Fundação (Dias 1-2)
- Documentação atualizada
- 11 contratos MCP com 120 regras
- Templates de código

### Fase 2: Estrutura (Dias 3-4)
- Criar pastas faltantes em todos os módulos
- Separar commands/queries
- Criar input ports
- Auditar e padronizar schemas

### Fase 3: Migração (Dias 5-6)
- Migrar `src/services/` para módulos
- Criar Domain Services
- Atualizar DI

### Fase 4: Validação (Dia 7)
- Checklist 81 itens
- Testes (1032+ passando)
- Zero TypeScript errors

---

## Conformidade

Todo novo código DEVE:

1. Seguir estrutura de pastas definida
2. Passar no checklist de 81 itens
3. Ser validado pelos 11 contratos MCP
4. Ter testes unitários
5. Usar Result pattern, não throw

---

## Referências

- Eric Evans - Domain-Driven Design (Blue Book)
- Vaughn Vernon - Implementing Domain-Driven Design (Red Book)
- Alistair Cockburn - Hexagonal Architecture (Ports & Adapters)
- Robert C. Martin - Clean Architecture

---

## Revisão

Este ADR deve ser revisado em caso de:
- Novo módulo com requisitos muito diferentes
- Mudança significativa de stack tecnológica
- Problemas recorrentes com a arquitetura definida

**Próxima revisão sugerida:** 06/07/2026 (6 meses)

