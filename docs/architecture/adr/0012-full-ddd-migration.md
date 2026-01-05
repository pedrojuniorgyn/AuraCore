# ADR 0012 — Migração Completa para DDD/Hexagonal (Eliminação de Arquitetura Híbrida)

**Data de Criação:** 2026-01-05 15:30:00 UTC  
**Status:** Aceito  
**Decisor:** Pedro Jr.  
**Autor:** Claude (Arquiteto Enterprise)

---

## Contexto

O AuraCore iniciou em 2024 com arquitetura **Vertical Slice** (APIs com lógica direta). Em Dezembro 2024, iniciou-se a migração E7 para **DDD/Hexagonal**, planejada como "híbrida":

```
PLANEJAMENTO ORIGINAL (E7_DDD_HEXAGONAL_HIBRIDO.md):
- Vertical Slice: ~46% do código (CRUDs simples)
- Functional Core: ~12% (cálculos puros)
- Hexagonal Lite: ~7% (operações médias)
- Hexagonal + DDD: ~35% (operações complexas)
```

Após análise em Janeiro 2026, identificou-se que esta abordagem híbrida:
1. Cria inconsistência de padrões
2. Dificulta onboarding de novos desenvolvedores
3. Impede automação completa de validações (MCP)
4. Não atende padrões enterprise-grade (SAP, Oracle, Salesforce)
5. Mantém dívida técnica permanente em 46% do código

---

## Decisão

**Migrar 100% do AuraCore para DDD/Hexagonal**, eliminando completamente:
- Vertical Slice em APIs
- Services legados com lógica de negócio
- Arquitetura híbrida/mista

### Estrutura Alvo (100% DDD)

```
src/
├── modules/                          # Modular Monolith
│   ├── financial/
│   │   ├── domain/                   # Entidades, VOs, Use Cases, Ports
│   │   ├── infrastructure/           # Adapters, Repositories
│   │   └── features/                 # Feature Handlers (thin)
│   ├── accounting/
│   ├── fiscal/
│   ├── tms/
│   ├── wms/
│   ├── admin/
│   └── integrations/
├── shared/                           # Kernel compartilhado
└── app/api/                          # Thin proxies (delegam para modules)
```

### Padrão Único para TODAS as Operações

```typescript
// Mesmo CRUDs "simples" seguem o padrão:
src/modules/financial/features/list-payables/
├── handler.ts              // HTTP Handler (thin)
├── handler.test.ts         // Teste
├── ListPayablesQuery.ts    // Query object
├── ListPayablesResult.ts   // Result object
└── index.ts                // Export
```

---

## Justificativa

### Por que NÃO manter híbrido?

| Aspecto | Híbrido | 100% DDD |
|---------|---------|----------|
| Consistência | ❌ 2 padrões | ✅ 1 padrão |
| Onboarding | ❌ Confuso | ✅ Claro |
| Testabilidade | ⚠️ Parcial | ✅ 100% |
| Automação MCP | ⚠️ Limitada | ✅ Completa |
| Enterprise-grade | ❌ Não | ✅ Sim |
| Manutenção | ❌ 2 estilos | ✅ 1 estilo |

### CRUDs "simples" também precisam de DDD?

**SIM**, porque:
1. CRUDs "simples" hoje viram operações complexas amanhã
2. Uniformidade reduz curva de aprendizado
3. 100% testável com mesmo padrão
4. ERPs tier-1 (SAP, Oracle) usam DDD em tudo

---

## Consequências

### Positivas ✅

1. **Código uniforme**: Um padrão para todo o projeto
2. **Testabilidade**: 100% do código testável isoladamente
3. **Onboarding**: Novos devs aprendem 1 padrão, não 4
4. **Automação**: MCP pode validar 100% do código
5. **Manutenção**: Refatorações mais seguras
6. **Enterprise-grade**: Padrão de mercado

### Negativas ❌

1. **Esforço adicional**: 12 semanas de migração (E7.12-E7.17)
2. **Mais arquivos**: CRUDs terão mais arquivos que Vertical Slice
3. **Overhead inicial**: Abstrações para operações simples

### Mitigações ⚠️

1. **Esforço**: AuraCore não está em produção, então não há risco de quebra
2. **Mais arquivos**: Geradores de código podem criar estrutura básica
3. **Overhead**: Compensado por testabilidade e manutenibilidade

---

## Épicos de Implementação

| Épico | Descrição | Duração |
|-------|-----------|---------|
| E7.12 | Documentação 100% | 1 semana |
| E7.13 | Migração Services → DDD | 3 semanas |
| E7.14 | Migração APIs → Features | 2 semanas |
| E7.15 | Arquivos SPED → DDD | 4 semanas |
| E7.16 | Verificação Semântica | 1 semana |
| E7.17 | Limpeza Final | 1 semana |

**Total:** 12 semanas + 1 semana buffer = **13 semanas**

---

## Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Código DDD | ~35% | 100% |
| Services legados | 9 arquivos | 0 |
| APIs Vertical Slice | ~46% | 0% |
| Padrões de código | 4 | 1 |

---

## Alternativas Consideradas

### Alternativa 1: Manter Híbrido
**Rejeitada**: Não atende padrão enterprise, dívida técnica permanente.

### Alternativa 2: Migração Gradual (5 anos)
**Rejeitada**: AuraCore não está em produção, pode migrar agora sem risco.

### Alternativa 3: Microserviços
**Adiada**: Migrar para DDD primeiro, depois avaliar extração de microserviços.

---

## Referências

- `docs/architecture/E7_DDD_HEXAGONAL_HIBRIDO.md` (planejamento original)
- "Domain-Driven Design" - Eric Evans
- "Implementing Domain-Driven Design" - Vaughn Vernon
- "Clean Architecture" - Robert C. Martin

---

## Relacionados

- ADR-0013: Eliminate Hybrid Architecture
- E7 DDD/Hexagonal Migration (E7.0-E7.11)
- Contracts: type-safety, api-contract, transactions

---

**Aprovado por:** Pedro Jr.  
**Data de Aprovação:** 2026-01-05 15:30:00 UTC
