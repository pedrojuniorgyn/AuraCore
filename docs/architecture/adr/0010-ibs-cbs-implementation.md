# ADR 0010 — Implementação IBS/CBS (Reforma Tributária 2026)

## Status
**Aceito** - 2025-12-30

## Contexto

A Emenda Constitucional 132/2023 e a Lei Complementar 214/2025 instituem uma reforma tributária profunda no Brasil, criando dois novos tributos (IBS e CBS) que substituirão progressivamente ICMS, ISS, PIS e COFINS entre 2026 e 2033.

### Desafios

1. **Período de Transição Longo**: 7 anos de coexistência de sistemas (2026-2032)
2. **Alíquotas Progressivas**: Mudanças anuais nas alíquotas
3. **Cálculo Complexo**: IBS dividido em UF e Municipal
4. **Múltiplos Regimes**: CURRENT, TRANSITION, NEW
5. **Retrocompatibilidade**: Sistema atual deve continuar funcionando
6. **XML Compliance**: Novas estruturas XML (NT 2025.001/002)

## Decisão

### 1. Arquitetura em Camadas (Clean Architecture)

```
Domain Layer
├── Value Objects (IBSCBSGroup, TaxClassificationCode, CstIbsCbs)
├── Tax Engines (Current, Transition, New)
└── Domain Services (IbsCbsCalculation, TaxComparison, Compensation)

Application Layer
├── Use Cases (Calculate, Simulate, Compare, GetRates, Compensate, Validate, Audit)
└── DTOs (Input/Output schemas)

Infrastructure Layer
├── XML Builders (GrupoIBSCBS, GrupoIS, GrupoCompraGov)
├── XML Validators (IbsCbs, MockXsd, Schema, RtcMock)
├── XML Utilities (Escaper, Formatter)
└── Persistence (Schemas, Mappers - preparação futura)

Presentation Layer
└── API Routes (7 endpoints REST)
```

### 2. Tax Engine Strategy Pattern

Implementar 3 engines distintas:

- **CurrentTaxEngine**: Sistema atual (até 2025)
- **TransitionTaxEngine**: Período de transição (2026-2032)
  - Alíquotas progressivas por ano
  - Multiplicadores de ICMS decrescentes
  - IBS crescente, CBS estável após 2027
- **NewTaxEngine**: Sistema completo (2033+)
  - Alíquotas fixas (IBS 17.70%, CBS 8.80%)

**Factory** seleciona engine automaticamente baseado na data da operação.

### 3. Value Objects Imutáveis

Todos os cálculos tributários usam Value Objects imutáveis:

```typescript
IBSCBSGroup {
  cst: CstIbsCbs
  classificationCode: TaxClassificationCode
  baseValue: Money
  ibsUfRate: TaxRate
  ibsUfValue: Money
  ibsMunRate: TaxRate
  ibsMunValue: Money
  cbsRate: TaxRate
  cbsValue: Money
}
```

**Benefícios:**
- Validação em tempo de criação
- Imutabilidade garante consistência
- Testável isoladamente
- Serialização para XML simples

### 4. XML Builders Modulares

Cada grupo XML tem seu próprio builder:

```typescript
GrupoIBSCBS.build(group) → '<IBSCBS>...</IBSCBS>'
GrupoIS.build(group) → '<IS>...</IS>'
GrupoCompraGov.build(group) → '<COMPRAGOV>...</COMPRAGOV>'
```

**Benefícios:**
- Responsabilidade única
- Testável isoladamente
- Fácil manutenção
- Conformidade NT 2025.001/002

### 5. Validação em Camadas

**Camada API** (Zod):
- Tipos de dados
- Formatos (UUID, ISO date)
- Ranges básicos

**Camada Domain** (Value Objects):
- Regras de negócio
- Consistência matemática
- Validações complexas

**Camada XML** (Validators):
- Estrutura XML
- Campos obrigatórios
- Consistência de valores

### 6. Multi-Tenancy Obrigatório

Todos os endpoints exigem:
```typescript
headers: {
  'x-organization-id': string,
  'x-branch-id': string,
}
```

Garante isolamento entre organizações.

### 7. Result Pattern para Erros

```typescript
Result<T> {
  isSuccess: boolean
  value?: T
  error?: string
}
```

**Benefícios:**
- Errors como valores (não exceptions)
- Composição de operações
- Rastreamento de falhas

## Consequências

### Positivas ✅

1. **Preparado para Transição**: Sistema suporta 3 regimes simultâneos
2. **Simulação de Cenários**: Permite comparação multi-ano
3. **Auditoria Completa**: Registro de cálculos e comparações
4. **XML Compliant**: Conforme NTs da SEFAZ
5. **Testável**: 200+ testes (unit + integration + e2e)
6. **Manutenível**: Clean Architecture facilita evolução
7. **Escalável**: Validadores e engines são plugáveis

### Negativas ❌

1. **Complexidade**: 3 engines + múltiplos validadores
2. **Overhead**: Validação em múltiplas camadas
3. **Manutenção**: Alíquotas hardcoded (não vêm do banco)
   - *Mitigação*: Centralizado em TransitionTaxEngine
4. **Testes**: Muitos cenários para cobrir (200+ testes)

### Neutras ⚪

1. **Split Payment**: Estrutura preparatória (implementação real em 2027)
2. **Persistência**: Schemas criados mas não usados (preparação futura)
3. **Mock Validators**: Validadores reais serão integrados posteriormente

## Alternativas Consideradas

### Alternativa 1: Engine Única com Configuração
**Rejeitada**: Lógica condicional complexa, difícil testar

### Alternativa 2: Cálculo Direto (sem Value Objects)
**Rejeitada**: Validação dispersa, difícil manter consistência

### Alternativa 3: Alíquotas no Banco de Dados
**Adiada**: Primeira versão com alíquotas hardcoded para simplicidade

### Alternativa 4: XML Builders Genéricos
**Rejeitada**: Perda de type-safety, difícil validar

## Referências

- [EC 132/2023](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm)
- [LC 214/2025](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- Nota Técnica 2025.001 (CT-e com IBS/CBS)
- Nota Técnica 2025.002 (NF-e com IBS/CBS)
- Clean Architecture (Robert C. Martin)
- Domain-Driven Design (Eric Evans)

## Relacionados

- ADR 0011: Split Payment Structure
- Contract: infrastructure-layer.json
- Contract: mcp-enforcement-rules.json

---

**Autor**: AuraCore Team  
**Última revisão**: 2025-12-30

