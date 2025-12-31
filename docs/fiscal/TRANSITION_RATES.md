# Alíquotas de Transição - Reforma Tributária 2026-2033

## Visão Geral

Este documento descreve as alíquotas progressivas dos novos tributos (IBS e CBS) durante o período de transição da reforma tributária brasileira.

## Fases da Transição

### Fase de Teste (2026)

Ano de teste com alíquotas simbólicas para adaptação dos sistemas.

| Tributo      | Alíquota | Destinatário |
|--------------|----------|--------------|
| IBS UF       | 0.06%    | Estado       |
| IBS Municipal| 0.04%    | Município    |
| **IBS Total**| **0.10%**| -            |
| CBS          | 0.90%    | União        |
| **TOTAL**    | **1.00%**| -            |

**Tributos antigos**: Mantidos 100% (ICMS, ISS, PIS, COFINS)

### Fase 1 - Extinção PIS/COFINS (2027-2028)

PIS e COFINS são extintos, CBS assume alíquota cheia.

| Tributo      | Alíquota | Destinatário |
|--------------|----------|--------------|
| IBS UF       | 0.06%    | Estado       |
| IBS Municipal| 0.04%    | Município    |
| **IBS Total**| **0.10%**| -            |
| CBS          | 8.80%    | União        |
| **TOTAL**    | **8.90%**| -            |

**Tributos antigos**:
- ❌ PIS/COFINS: Extintos
- ✅ ICMS: Mantido (sem novos fatos geradores)
- ✅ ISS: Mantido

### Fase 2 - Transição Progressiva (2029-2032)

Redução gradual do ICMS e aumento do IBS.

| Ano  | ICMS Mult. | IBS UF  | IBS Mun | CBS   | IBS Total | Total IBS+CBS |
|------|------------|---------|---------|-------|-----------|---------------|
| 2029 | 90%        | 1.06%   | 0.71%   | 8.80% | 1.77%     | 10.57%        |
| 2030 | 80%        | 2.12%   | 1.42%   | 8.80% | 3.54%     | 12.34%        |
| 2031 | 60%        | 4.25%   | 2.83%   | 8.80% | 7.08%     | 15.88%        |
| 2032 | 40%        | 6.37%   | 4.25%   | 8.80% | 10.62%    | 19.42%        |

**Notas**:
- ICMS Mult.: Multiplicador aplicado à alíquota de ICMS (ex: 90% de 18% = 16.2%)
- IBS aumenta para compensar redução de ICMS
- CBS mantém 8.80% em todo o período

### Fase 3 - Sistema Completo (2033+)

Alíquotas finais, ICMS e ISS extintos.

| Tributo      | Alíquota | Destinatário | % do IBS Total |
|--------------|----------|--------------|----------------|
| IBS UF       | 10.62%   | Estado       | 60%            |
| IBS Municipal| 7.08%    | Município    | 40%            |
| **IBS Total**| **17.70%**| -           | 100%           |
| CBS          | 8.80%    | União        | -              |
| **TOTAL**    | **26.50%**| -           | -              |

**Tributos antigos**: Todos extintos (ICMS, ISS, PIS, COFINS)

## Fórmulas de Cálculo

### IBS Total
```
IBS Total = 17.70%
IBS UF = IBS Total × 60% = 10.62%
IBS Municipal = IBS Total × 40% = 7.08%
```

### Transição IBS (2029-2032)

O IBS aumenta linearmente, compensando a redução do ICMS:

```
Ano 2029: IBS = 1.77% (10% do valor final)
Ano 2030: IBS = 3.54% (20% do valor final)
Ano 2031: IBS = 7.08% (40% do valor final)
Ano 2032: IBS = 10.62% (60% do valor final)
Ano 2033: IBS = 17.70% (100% - valor final)
```

### Cálculo de um Item

```typescript
// Para um item de R$ 1.000,00 em 2030

baseValue = 1000.00

// IBS UF
ibsUfRate = 2.12 // %
ibsUfValue = baseValue * (ibsUfRate / 100) = 1000 * 0.0212 = 21.20

// IBS Municipal
ibsMunRate = 1.42 // %
ibsMunValue = baseValue * (ibsMunRate / 100) = 1000 * 0.0142 = 14.20

// CBS
cbsRate = 8.80 // %
cbsValue = baseValue * (cbsRate / 100) = 1000 * 0.088 = 88.00

// Total IBS + CBS
totalNewTaxes = ibsUfValue + ibsMunValue + cbsValue = 123.40
```

## Imposto Seletivo (IS)

O Imposto Seletivo (IS) é aplicado sobre produtos específicos:

- Bebidas alcoólicas
- Cigarros e derivados do tabaco
- Veículos
- Embarcações e aeronaves
- Produtos prejudiciais à saúde ou ao meio ambiente

**Alíquotas IS**: Definidas por categoria de produto (entre 0.5% e 4.0%)

**Incidência**: Sobre a mesma base do IBS/CBS

**Exemplo** (veículo de luxo):
```
Base: R$ 200.000,00
IBS: R$ 35.400,00 (17.70%)
CBS: R$ 17.600,00 (8.80%)
IS: R$ 8.000,00 (4.00%)
Total: R$ 61.000,00
```

## Comparação: Sistema Atual vs Novo (Exemplo)

### Produto: R$ 10.000,00

#### Sistema Atual (2025)
```
ICMS (18%):     R$ 1.800,00
PIS (1.65%):    R$   165,00
COFINS (7.6%):  R$   760,00
──────────────────────────
Total:          R$ 2.725,00 (27.25%)
```

#### Sistema Novo (2033+)
```
IBS UF (10.62%):   R$ 1.062,00
IBS Mun (7.08%):   R$   708,00
CBS (8.80%):       R$   880,00
──────────────────────────
Total:             R$ 2.650,00 (26.50%)
```

**Diferença**: -R$ 75,00 (-2.75%)

**Nota**: A reforma visa simplificar o sistema (menos tributos), não necessariamente reduzir a carga total.

## Regras Especiais

### 1. Cashback (Devolução para Baixa Renda)

Famílias de baixa renda terão direito a cashback sobre IBS/CBS:
- Devolução parcial ou total
- Baseado em faixa de renda
- Implementação a ser definida

### 2. Alíquotas Reduzidas

Alguns produtos/serviços terão alíquotas reduzidas:
- Alimentos básicos
- Medicamentos
- Serviços de saúde
- Serviços de educação
- Transporte coletivo

### 3. Alíquotas Zero

Produtos da cesta básica podem ter alíquota zero (isenção).

## Implementação no Sistema

As alíquotas estão codificadas em:

```typescript
// src/modules/fiscal/domain/tax/services/TransitionTaxEngine.ts

private readonly TRANSITION_RATES = {
  2026: { ibsUf: 0.06, ibsMun: 0.04, cbs: 0.90, icmsMultiplier: 1.00 },
  2027: { ibsUf: 0.06, ibsMun: 0.04, cbs: 8.80, icmsMultiplier: 0.00 },
  2029: { ibsUf: 1.06, ibsMun: 0.71, cbs: 8.80, icmsMultiplier: 0.90 },
  2030: { ibsUf: 2.12, ibsMun: 1.42, cbs: 8.80, icmsMultiplier: 0.80 },
  2031: { ibsUf: 4.25, ibsMun: 2.83, cbs: 8.80, icmsMultiplier: 0.60 },
  2032: { ibsUf: 6.37, ibsMun: 4.25, cbs: 8.80, icmsMultiplier: 0.40 },
};

// NewTaxEngine.ts (2033+)
private readonly IBS_UF_RATE = 10.62;
private readonly IBS_MUN_RATE = 7.08;
private readonly CBS_RATE = 8.80;
```

## Fontes e Referências

- [Emenda Constitucional 132/2023](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm)
- [Lei Complementar 214/2025](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- Comitê Gestor do IBS (Portal oficial)
- Receita Federal - Guia da Reforma Tributária

## Glossário

- **IBS**: Imposto sobre Bens e Serviços (substitui ICMS e ISS)
- **CBS**: Contribuição sobre Bens e Serviços (substitui PIS e COFINS)
- **IS**: Imposto Seletivo (novo tributo sobre produtos específicos)
- **UF**: Unidade Federativa (Estado)
- **ICMS Mult.**: Multiplicador de ICMS durante transição

---

**Última atualização**: 2025-12-30  
**Válido para**: Reforma Tributária 2026-2033

