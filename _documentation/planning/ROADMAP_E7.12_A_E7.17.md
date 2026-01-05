# 🗺️ ROADMAP E7.12-E7.17 - MIGRAÇÃO 100% DDD/HEXAGONAL

**Data/Hora de Criação:** 2026-01-05 16:15:00 UTC  
**Autor:** Claude (Arquiteto Enterprise Senior)  
**Aprovado por:** Pedro Jr. (2026-01-05)  
**Status:** APROVADO

---

## 📌 VISÃO GERAL

Este roadmap detalha a migração completa do AuraCore para arquitetura 100% DDD/Hexagonal, eliminando a arquitetura híbrida e todo código legado.

### Contexto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Arquitetura | Híbrida (4 padrões) | 100% DDD/Hexagonal |
| Services legados | 9 arquivos | 0 |
| APIs Vertical Slice | ~46% | 0% |
| Código DDD | ~35% | 100% |

### Duração Total

**13 semanas** (Janeiro - Abril 2026)

---

## 📅 CRONOGRAMA VISUAL

```
JANEIRO 2026
┌──────┬──────┬──────┬──────┬──────┐
│ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │
├──────┼──────┼──────┼──────┼──────┤
│  06  │  07  │  08  │  09  │  10  │ ← Semana 1: E7.12 Documentação
├──────┼──────┼──────┼──────┼──────┤
│  13  │  14  │  15  │  16  │  17  │ ← Semana 2: E7.13 Services (1/3)
├──────┼──────┼──────┼──────┼──────┤
│  20  │  21  │  22  │  23  │  24  │ ← Semana 3: E7.13 Services (2/3)
├──────┼──────┼──────┼──────┼──────┤
│  27  │  28  │  29  │  30  │  31  │ ← Semana 4: E7.13 Services (3/3)
└──────┴──────┴──────┴──────┴──────┘

FEVEREIRO 2026
┌──────┬──────┬──────┬──────┬──────┐
│ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │
├──────┼──────┼──────┼──────┼──────┤
│  03  │  04  │  05  │  06  │  07  │ ← Semana 5: E7.14 APIs (1/2)
├──────┼──────┼──────┼──────┼──────┤
│  10  │  11  │  12  │  13  │  14  │ ← Semana 6: E7.14 APIs (2/2)
├──────┼──────┼──────┼──────┼──────┤
│  17  │  18  │  19  │  20  │  21  │ ← Semana 7: E7.15 SPED (1/4)
├──────┼──────┼──────┼──────┼──────┤
│  24  │  25  │  26  │  27  │  28  │ ← Semana 8: E7.15 SPED (2/4)
└──────┴──────┴──────┴──────┴──────┘

MARÇO 2026
┌──────┬──────┬──────┬──────┬──────┐
│ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │
├──────┼──────┼──────┼──────┼──────┤
│  03  │  04  │  05  │  06  │  07  │ ← Semana 9: E7.15 SPED (3/4)
├──────┼──────┼──────┼──────┼──────┤
│  10  │  11  │  12  │  13  │  14  │ ← Semana 10: E7.15 SPED (4/4)
├──────┼──────┼──────┼──────┼──────┤
│  17  │  18  │  19  │  20  │  21  │ ← Semana 11: E7.16 Verificação
├──────┼──────┼──────┼──────┼──────┤
│  24  │  25  │  26  │  27  │  28  │ ← Semana 12: E7.17 Limpeza
├──────┼──────┼──────┼──────┼──────┤
│  31  │      │      │      │      │ ← Semana 13: Buffer
└──────┴──────┴──────┴──────┴──────┘

ABRIL 2026
┌──────┬──────┬──────┬──────┬──────┐
│ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │
├──────┼──────┼──────┼──────┼──────┤
│      │  01  │  02  │  03  │  04  │ ← Semana 13: Buffer (cont.)
└──────┴──────┴──────┴──────┴──────┘
                             ↑
                     🎉 CONCLUSÃO
```

---

## 🎯 ÉPICO E7.12: DOCUMENTAÇÃO 100%

**Duração:** 1 semana (06-10 Janeiro 2026)  
**Status:** 🟡 EM EXECUÇÃO  
**Responsável:** Claude + Pedro Jr.

### Objetivo
Atualizar 100% da documentação para refletir estado atual e decisões arquiteturais.

### Entregáveis

| Dia | Entregável | Status |
|-----|------------|--------|
| 1 | E7.12_DOCUMENTATION_MASTER.md | ✅ |
| 1 | ADR-0012: Full DDD Migration | ✅ |
| 1 | ADR-0013: Eliminate Hybrid Architecture | ✅ |
| 1 | E7_STATUS_FINAL.md | ✅ |
| 2 | SYSTEM_GUIDE.md (ENFORCE-021-029) | ⬜ |
| 2 | LESSONS_LEARNED.md (E7.8-E7.11) | ⬜ |
| 3 | ROADMAP_ONDAS_5A_A_9_EXECUTIVO.md | ⬜ |
| 3 | ROADMAP_MASTER_AURACORE.md | ⬜ |
| 4 | E7_DDD_HEXAGONAL.md (renomear/atualizar) | ⬜ |
| 4 | INDEX.md (adicionar ADRs) | ⬜ |
| 5 | 00_INDICE_MASTER.md | ⬜ |
| 5 | RESULTADO_FINAL_MARATONA.md | ⬜ |

### Critérios de Aceite
- [ ] 10 documentos atualizados
- [ ] 2 ADRs criados e aprovados
- [ ] Data/hora em todos os docs
- [ ] Cross-references funcionando

---

## 🎯 ÉPICO E7.13: MIGRAÇÃO SERVICES → DDD

**Duração:** 3 semanas (13-31 Janeiro 2026)  
**Status:** ⬜ PLANEJADO  
**Dependência:** E7.12

### Objetivo
Migrar 100% dos services em `/src/services/` para Use Cases DDD.

### Semana 1 (13-17 Jan): Services de Integração

| Dia | Arquivo | Use Cases | Testes |
|-----|---------|-----------|--------|
| 1-2 | sefaz-client.ts | AuthorizeCTe, CancelCTe, QueryCTe | 15+ |
| 3-4 | sefaz-processor.ts | ProcessDocuments, ImportNFe, ImportCTe | 15+ |
| 5 | tax-credit-engine.ts | ProcessTaxCredit, CalculateCredit | 10+ |

### Semana 2 (20-24 Jan): Services Financeiro/Contábil

| Dia | Arquivo | Use Cases | Testes |
|-----|---------|-----------|--------|
| 1-3 | accounting-engine.ts | PostJournalEntry, ReverseEntry, ValidateDoubleEntry | 30+ |
| 4-5 | financial-title-generator.ts | GenerateTitle, GenerateBoleto, GeneratePix | 15+ |

### Semana 3 (27-31 Jan): Services SPED (Parcial)

| Dia | Arquivo | Use Cases | Testes |
|-----|---------|-----------|--------|
| 1-2 | sped-fiscal-generator.ts (estrutura) | GenerateSpedFiscal | 20+ |
| 3 | sped-ecd-generator.ts (estrutura) | GenerateSpedEcd | 10+ |
| 4 | sped-contributions-generator.ts (estrutura) | GenerateSpedContributions | 10+ |
| 5 | Integração e validação | - | - |

### Critérios de Aceite
- [ ] 9 services migrados para Use Cases
- [ ] 0 lógica de negócio em /src/services/
- [ ] 125+ testes novos
- [ ] Todos os testes passando

---

## 🎯 ÉPICO E7.14: MIGRAÇÃO APIS → FEATURES

**Duração:** 2 semanas (03-14 Fevereiro 2026)  
**Status:** ⬜ PLANEJADO  
**Dependência:** E7.13

### Objetivo
Migrar 100% das APIs Vertical Slice para Feature Handlers.

### Semana 1 (03-07 Fev): Financial + Fiscal

| Dia | Módulo | Rotas | Destino |
|-----|--------|-------|---------|
| 1-2 | Financial | ~25 | modules/financial/features/ |
| 3-4 | Fiscal | ~20 | modules/fiscal/features/ |
| 5 | Validação e ajustes | - | - |

### Semana 2 (10-14 Fev): TMS + WMS + Admin

| Dia | Módulo | Rotas | Destino |
|-----|--------|-------|---------|
| 1 | TMS | ~15 | modules/tms/features/ |
| 2-3 | WMS | ~20 | modules/wms/features/ |
| 4 | Admin | ~10 | modules/admin/features/ |
| 5 | Integração e validação | - | - |

### Estrutura Padrão

```
src/modules/{module}/features/{feature-name}/
├── handler.ts              # HTTP Handler (thin)
├── handler.test.ts         # Teste do handler
├── {FeatureName}Query.ts   # Query/Command object
├── {FeatureName}Result.ts  # Result object
└── index.ts                # Export
```

### Critérios de Aceite
- [ ] ~90 rotas migradas
- [ ] 0 lógica de negócio em /src/app/api/
- [ ] Compatibilidade de API mantida
- [ ] Testes de integração para cada handler

---

## 🎯 ÉPICO E7.15: ARQUIVOS SPED → DDD

**Duração:** 4 semanas (17 Fevereiro - 14 Março 2026)  
**Status:** ⬜ PLANEJADO  
**Dependência:** E7.14

### Objetivo
Migrar 100% dos arquivos SPED críticos com cobertura de testes extensiva.

### Semana 1 (17-21 Fev): accounting-engine.ts

**Estrutura de Destino:**
```
src/modules/accounting/domain/
├── entities/
│   ├── JournalEntry.ts
│   ├── JournalEntryLine.ts
│   └── AccountingPeriod.ts
├── value-objects/
│   ├── AccountCode.ts
│   ├── DebitCredit.ts
│   └── PostingStatus.ts
├── services/
│   └── DoubleEntryValidator.ts
├── use-cases/
│   ├── PostJournalEntryUseCase.ts
│   ├── ReverseJournalEntryUseCase.ts
│   ├── CloseAccountingPeriodUseCase.ts
│   └── GenerateTrialBalanceUseCase.ts
└── __tests__/
    └── 30+ testes
```

**Regras de Negócio CRÍTICAS:**
- ∑Débito = ∑Crédito (INVARIANTE)
- Não pode lançar em conta sintética
- Período fechado é imutável
- Estorno cria lançamento inverso

### Semana 2 (24-28 Fev): financial-title-generator + SPED Base

**financial-title-generator.ts:**
```
src/modules/financial/domain/
├── entities/
│   ├── FinancialTitle.ts
│   ├── Boleto.ts
│   └── PixCharge.ts
├── value-objects/
│   ├── BoletoBarcode.ts
│   ├── PixQRCode.ts
│   └── DueDate.ts
└── use-cases/
    ├── GenerateFinancialTitleUseCase.ts
    ├── GenerateBoletoUseCase.ts
    └── GeneratePixChargeUseCase.ts
```

**SPED Base:**
```
src/modules/fiscal/domain/sped/
├── entities/
│   └── SpedDocument.ts
├── value-objects/
│   ├── SpedRegister.ts
│   └── SpedBlock.ts
└── interfaces/
    └── ISpedGenerator.ts
```

### Semana 3 (03-07 Mar): sped-fiscal-generator.ts

**Estrutura:**
```
src/modules/fiscal/domain/sped-fiscal/
├── blocks/
│   ├── Block0.ts (Abertura)
│   ├── BlockC.ts (Documentos Fiscais)
│   ├── BlockD.ts (CTe)
│   ├── BlockE.ts (Apuração ICMS)
│   ├── BlockH.ts (Inventário)
│   └── Block9.ts (Controle)
├── registers/
│   ├── Register0000.ts
│   ├── Register0001.ts
│   ├── RegisterC100.ts
│   ├── RegisterD100.ts
│   └── ... (todos os registros)
├── validators/
│   ├── SpedFiscalStructureValidator.ts
│   └── SpedFiscalContentValidator.ts
└── use-cases/
    └── GenerateSpedFiscalUseCase.ts
```

**Testes:** 50+ (por bloco, estrutura, formato)

### Semana 4 (10-14 Mar): sped-ecd + sped-contributions

**SPED ECD:**
```
src/modules/accounting/domain/sped-ecd/
├── blocks/
│   ├── Block0.ts
│   ├── BlockI.ts (Lançamentos)
│   ├── BlockJ.ts (Demonstrações)
│   ├── BlockK.ts (Conglomerados)
│   └── Block9.ts
└── use-cases/
    └── GenerateSpedEcdUseCase.ts
```

**SPED Contribuições:**
```
src/modules/fiscal/domain/sped-contributions/
├── blocks/
│   ├── Block0.ts
│   ├── BlockA.ts (Documentos)
│   ├── BlockC.ts (Receitas)
│   ├── BlockM.ts (Apuração)
│   └── Block9.ts
└── use-cases/
    └── GenerateSpedContributionsUseCase.ts
```

### Critérios de Aceite
- [ ] 5 services críticos migrados
- [ ] 150+ testes para SPED
- [ ] Cobertura > 95%
- [ ] Partidas dobradas 100% validadas
- [ ] Formato SPED validado

**NOTA:** Não temos arquivos SPED reais. Usar mocks/exemplos para validação.

---

## 🎯 ÉPICO E7.16: VERIFICAÇÃO SEMÂNTICA

**Duração:** 1 semana (17-21 Março 2026)  
**Status:** ⬜ PLANEJADO  
**Dependência:** E7.15

### Objetivo
Implementar verificação automática de referências circulares e erros semânticos.

### Entregáveis

| Dia | Entregável |
|-----|------------|
| 1 | Madge integration + npm script |
| 2 | ESLint rules expandidas |
| 3 | MCP tool `check_semantic_issues` |
| 4 | CI/CD integration |
| 5 | Documentação + validação |

### Configurações

**Madge:**
```bash
npm install --save-dev madge

# package.json
{
  "scripts": {
    "check:circular": "madge --circular --extensions ts src/"
  }
}
```

**ESLint:**
```javascript
{
  rules: {
    "no-use-before-define": ["error", { 
      "functions": false, 
      "classes": true, 
      "variables": true 
    }],
    "no-shadow": "error",
    "@typescript-eslint/no-use-before-define": ["error"],
    "@typescript-eslint/no-shadow": "error",
  }
}
```

### Critérios de Aceite
- [ ] 0 dependências circulares
- [ ] ESLint rules ativas
- [ ] MCP tool funcionando
- [ ] CI/CD verificando automaticamente

---

## 🎯 ÉPICO E7.17: LIMPEZA FINAL

**Duração:** 1 semana (24-28 Março 2026)  
**Status:** ⬜ PLANEJADO  
**Dependência:** E7.16

### Objetivo
Remover 100% do código legado e garantir arquitetura uniforme.

### Tarefas

| Dia | Tarefa |
|-----|--------|
| 1 | Deletar services legados |
| 2 | Verificar todos os imports |
| 3 | Atualizar documentação final |
| 4 | Executar validação completa |
| 5 | Revisão de pares + aprovação |

### Arquivos a Deletar

```bash
# Services legados
rm src/services/sefaz-client.ts
rm src/services/sefaz-processor.ts
rm src/services/accounting-engine.ts
rm src/services/financial-title-generator.ts
rm src/services/sped-fiscal-generator.ts
rm src/services/sped-ecd-generator.ts
rm src/services/sped-contributions-generator.ts
rm src/services/tax-credit-engine.ts
rm src/services/btg-banking.ts
```

### Verificações Finais

```bash
# Zero arquivos em /services/ com lógica
find src/services -name "*.ts" -type f | wc -l
# Esperado: 0

# Zero imports de services legados
grep -rn "from.*services/" src/modules --include="*.ts" | wc -l
# Esperado: 0

# Build passa
npm run build
# Esperado: SUCCESS

# Todos os testes passam
npm test
# Esperado: 889+ testes passando
```

### Critérios de Aceite
- [ ] 0 código legado
- [ ] 100% DDD/Hexagonal
- [ ] Todos os testes passando
- [ ] Build funcionando
- [ ] Documentação 100%

---

## 📊 MÉTRICAS DE SUCESSO

### Antes vs Depois

| Métrica | Antes (Jan 2026) | Depois (Abr 2026) |
|---------|------------------|-------------------|
| Código DDD | ~35% | 100% |
| Services legados | 9 arquivos | 0 |
| APIs Vertical Slice | ~46% | 0% |
| Padrões de código | 4 | 1 |
| Testes | ~889 | ~1500+ |
| Deps circulares | ? | 0 |

### KPIs

| KPI | Meta |
|-----|------|
| Cobertura de testes | > 80% |
| Build time | < 60s |
| Zero erros TypeScript | Mantido |
| Zero uso de `any` | Mantido |

---

## 🚨 RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| SPED quebra | Baixa | Alto | Testes extensivos, mock validation |
| Prazo estourado | Média | Médio | Buffer de 1 semana |
| Regressão de testes | Baixa | Alto | CI/CD, MCP checks |
| Documentação atrasada | Média | Baixo | Atualizar DURANTE desenvolvimento |

---

## ✅ APROVAÇÕES

| Pessoa | Papel | Data | Status |
|--------|-------|------|--------|
| Pedro Jr. | Product Owner | 2026-01-05 | ✅ APROVADO |
| Claude | Arquiteto | 2026-01-05 | ✅ CRIADO |

---

*Documento criado em: 2026-01-05 16:15:00 UTC*  
*Última atualização: 2026-01-05 16:15:00 UTC*
