# Reforma Tributária 2026 - Módulo IBS/CBS

## Visão Geral

Implementação completa da reforma tributária brasileira conforme Emenda Constitucional 132/2023 e Lei Complementar 214/2025, incluindo os novos tributos IBS (Imposto sobre Bens e Serviços) e CBS (Contribuição sobre Bens e Serviços) que substituirão progressivamente ICMS, ISS, PIS e COFINS.

### Status da Implementação

✅ **100% Completo** - E7.4.1 Semanas 1-10 concluídas

- ✅ Domain Layer: Value Objects, Tax Engines, Domain Services
- ✅ Application Layer: Use Cases, DTOs, Validators
- ✅ Infrastructure Layer: Schemas, Mappers, XML Builders, Validators
- ✅ Presentation Layer: API Routes
- ✅ Tests: Unit, Integration, E2E (200+ testes)
- ✅ Documentation: ADRs, README, Guias

## Componentes Principais

### Domain Layer (`src/modules/fiscal/domain/`)

#### Value Objects
- **IBSCBSGroup**: Agrupa todos os valores de IBS/CBS para um item
- **TaxClassificationCode**: Código NCM/CBS de 9 dígitos
- **CstIbsCbs**: Código de Situação Tributária (00-90)
- **TaxRate**: Alíquota tributária (0-100%)
- **ISGroup**: Imposto Seletivo (produtos específicos)
- **GovernmentPurchaseGroup**: Grupos para compras governamentais

#### Tax Engines
- **CurrentTaxEngine**: Sistema tributário atual (até 2025)
- **TransitionTaxEngine**: Período de transição (2026-2032)
- **NewTaxEngine**: Sistema completo (2033+)
- **TaxEngineFactory**: Factory para seleção automática de engine

#### Domain Services
- **IbsCbsCalculationService**: Cálculo de IBS/CBS
- **TaxComparisonService**: Comparação entre regimes
- **CompensationCalculationService**: Cálculo de compensação de créditos

### Application Layer (`src/modules/fiscal/application/`)

#### Use Cases
- **CalculateIbsCbsUseCase**: Cálculo de IBS/CBS para documento fiscal
- **SimulateTaxScenarioUseCase**: Simulação multi-ano
- **CompareTaxRegimesUseCase**: Comparação current vs new
- **GetTaxRatesUseCase**: Consulta de alíquotas por localidade
- **CalculateCompensationUseCase**: Compensação de créditos
- **ValidateIbsCbsGroupUseCase**: Validação de grupo IBSCBS
- **AuditTaxTransitionUseCase**: Auditoria de transição

### Infrastructure Layer (`src/modules/fiscal/infrastructure/`)

#### XML Builders
- **GrupoIBSCBS**: Gera XML do grupo IBSCBS (NT 2025.001/002)
- **GrupoIS**: Gera XML do Imposto Seletivo
- **GrupoCompraGov**: Gera XML para compras governamentais

#### XML Validators
- **IbsCbsXmlValidator**: Valida grupo IBSCBS
- **MockXsdValidator**: Mock de validador XSD
- **XmlSchemaValidator**: Interface unificada de validação
- **RtcMockValidator**: Mock do validador RTC da SEFAZ

#### XML Utilities
- **XmlEscaper**: Escape/unescape de caracteres XML
- **XmlFormatter**: Formatação de valores para XML

### Presentation Layer (`src/app/api/fiscal/tax-reform/`)

#### API Routes
- `POST /api/fiscal/tax-reform/calculate` - Calcular IBS/CBS
- `POST /api/fiscal/tax-reform/simulate` - Simular cenários
- `POST /api/fiscal/tax-reform/compare` - Comparar regimes
- `GET /api/fiscal/tax-reform/rates` - Consultar alíquotas
- `POST /api/fiscal/tax-reform/compensation` - Calcular compensação
- `POST /api/fiscal/tax-reform/validate` - Validar grupo IBSCBS
- `POST /api/fiscal/tax-reform/audit` - Auditar transição

## Cronograma de Transição

### Fase de Teste (2026)
- **IBS**: 0.10% (UF 0.06% + Municipal 0.04%)
- **CBS**: 0.90%
- **ICMS**: 100% (mantido)
- **PIS/COFINS**: 100% (mantidos)

### Fase 1 - Extinção PIS/COFINS (2027)
- **IBS**: 0.10% (mantido)
- **CBS**: 8.80% (alíquota cheia)
- **ICMS**: 0% (mantido mas sem novos fatos geradores)
- **PIS/COFINS**: Extintos

### Fase 2 - Transição Progressiva (2029-2032)

| Ano  | ICMS Mult. | IBS UF  | IBS Mun | CBS   | IBS Total |
|------|------------|---------|---------|-------|-----------|
| 2029 | 90%        | 1.06%   | 0.71%   | 8.80% | 1.77%     |
| 2030 | 80%        | 2.12%   | 1.42%   | 8.80% | 3.54%     |
| 2031 | 60%        | 4.25%   | 2.83%   | 8.80% | 7.08%     |
| 2032 | 40%        | 6.37%   | 4.25%   | 8.80% | 10.62%    |

### Fase 3 - Sistema Completo (2033+)
- **IBS**: 17.70% (UF 10.62% + Municipal 7.08%)
- **CBS**: 8.80%
- **ICMS**: Extinto
- **ISS**: Extinto

## Exemplos de Uso

### 1. Calcular IBS/CBS para Documento Fiscal

```typescript
const response = await fetch('/api/fiscal/tax-reform/calculate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-organization-id': '1',
    'x-branch-id': '1',
  },
  body: JSON.stringify({
    fiscalDocumentId: 'uuid-here',
    operationDate: '2030-01-15T10:00:00Z',
    items: [
      {
        itemId: 'uuid-item',
        baseValue: 1000.00,
        cfop: '5102',
        ncm: '01012100',
        ufOrigem: 'SP',
        ufDestino: 'RJ',
        municipioDestino: '3304557',
      },
    ],
  }),
});

const result = await response.json();
// result.data.items[0].ibsUfValue: 35.4 (3.54% de 1000)
// result.data.items[0].ibsMunValue: 23.6 (2.36% de 1000)
// result.data.items[0].cbsValue: 88.0 (8.80% de 1000)
```

### 2. Simular Cenários Multi-Ano

```typescript
const response = await fetch('/api/fiscal/tax-reform/simulate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-organization-id': '1',
    'x-branch-id': '1',
  },
  body: JSON.stringify({
    fiscalDocumentId: 'uuid-here',
    baseValue: 10000.00,
    cfop: '5102',
    ncm: '01012100',
    ufOrigem: 'SP',
    ufDestino: 'RJ',
    municipioDestino: '3304557',
    years: [2026, 2029, 2030, 2033],
  }),
});

const result = await response.json();
// result.data.scenarios: Array com resultado para cada ano
```

### 3. Comparar Regime Atual vs Novo

```typescript
const response = await fetch('/api/fiscal/tax-reform/compare', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-organization-id': '1',
    'x-branch-id': '1',
  },
  body: JSON.stringify({
    fiscalDocumentId: 'uuid-here',
    baseValue: 10000.00,
    cfop: '5102',
    ncm: '01012100',
    ufOrigem: 'SP',
    ufDestino: 'RJ',
    currentIcms: 1200.00,
    currentPis: 165.00,
    currentCofins: 760.00,
  }),
});

const result = await response.json();
// result.data.currentSystem.total: 2125.00
// result.data.newSystem.total: 2650.00
// result.data.difference: 525.00 (24.7% increase)
```

## Validações e Conformidade

### Validação de Campos

Todos os endpoints validam:
- ✅ UUIDs para IDs
- ✅ Datas em formato ISO 8601
- ✅ Valores não negativos
- ✅ CFOPs com 4 dígitos
- ✅ NCMs com 8 dígitos
- ✅ UFs com 2 caracteres
- ✅ Municípios com 7 dígitos (quando obrigatório)

### Multi-Tenancy

Todos os endpoints exigem:
```
x-organization-id: número da organização
x-branch-id: número da filial
```

### XML Compliance

- ✅ Conforme NT 2025.001 (CT-e)
- ✅ Conforme NT 2025.002 (NF-e)
- ✅ Escape de caracteres especiais
- ✅ Formatação decimal com ponto
- ✅ Datas em formato ISO
- ✅ Namespaces corretos
- ✅ Ordem de elementos conforme XSD

## Split Payment (Preparação 2027)

Estrutura preparatória implementada para Split Payment (obrigatório em 2027):

- `ISplitPaymentService`: Interface do serviço
- `SplitPaymentTypes`: Tipos e enums
- `SplitPaymentSchema`: Schema Drizzle para persistência
- `MockSplitPaymentService`: Implementação mock para testes

**Nota**: Integração real com instituições financeiras será implementada em 2027.

## Testes

### Cobertura

- **Unit Tests**: 100+ testes (Value Objects, Tax Engines, Services)
- **Integration Tests**: 50+ testes (Use Cases, API Routes)
- **E2E Tests**: 50+ testes (Fluxos completos)
- **Total**: 200+ testes

### Executar Testes

```bash
# Todos os testes
npm test

# Apenas testes de reforma tributária
npm test tax-reform

# E2E tests
npm test tests/e2e/fiscal/tax-reform/
```

## Documentação Adicional

- [ADR 0010: Implementação IBS/CBS](../architecture/adr/0010-ibs-cbs-implementation.md)
- [ADR 0011: Split Payment Structure](../architecture/adr/0011-split-payment-structure.md)
- [Tabela de Alíquotas de Transição](./TRANSITION_RATES.md)

## Suporte e Contato

Para dúvidas sobre a implementação:
- Consultar ADRs em `docs/architecture/adr/`
- Verificar contratos em `docs/architecture/contracts/`
- Consultar exemplos em `tests/e2e/fiscal/tax-reform/`

## Conformidade Legal

Este módulo implementa:
- ✅ Emenda Constitucional 132/2023
- ✅ Lei Complementar 214/2025
- ✅ Nota Técnica 2025.001 (CT-e)
- ✅ Nota Técnica 2025.002 (NF-e)

**Última atualização**: 2025-12-30

