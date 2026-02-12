# Relatório de Implementação: Módulos Financial, Fiscal e Accounting

**Versão:** 1.0.0  
**Data:** 08/02/2026  
**Autor:** Implementação automatizada via Cursor AI  
**Plano:** `.cursor/plans/financial_fiscal_production_d9d66e9e.plan.md`  
**Escopo:** Fases F0 a F7 (F8 Go-Live pendente)

---

## Sumário Executivo

Implementação completa dos módulos **Financial**, **Fiscal** e **Accounting** do ERP Logístico AuraCore, seguindo arquitetura **100% DDD/Hexagonal** (ADR-0015). O trabalho cobriu 8 fases (F0-F7) de um plano de 10 fases, totalizando:

| Métrica | Valor |
|---------|-------|
| Fases concluídas | 8 de 10 (F0-F7) |
| Arquivos TypeScript (Financial) | ~180 |
| Arquivos TypeScript (Fiscal) | ~276 |
| Arquivos TypeScript (Accounting) | ~83 |
| Rotas API V2 DDD | 16 endpoints |
| Migrations SQL | 69 arquivos |
| Testes novos | 133 (9 arquivos) |
| Componentes React | 8 novos |

**Decisões arquiteturais fundamentais:**
1. Tabelas DDD novas com UUID `char(36)`, tabelas legacy INT removidas (sem migração de dados)
2. Escopo fiscal completo: CTe/NFe real via SEFAZ, SPED Fiscal/ECD/Contribuições, retenções na fonte
3. Módulo Strategic como referência arquitetural (DDD, frontend rico)
4. Deploy gradual com checkpoints intermediários

---

## Fase 0: Fundação DDD + Setup

### F0.1 — Migration SQL Consolidada

**Migration:** `drizzle/migrations/0069_drop_legacy_create_ddd.sql`

Ações realizadas:
- DROP de tabelas legacy conflitantes: `payments`, `accounts_payable`, `accounts_receivable`, `journal_entry_lines`, `journal_entries`, `financial_transactions`
- Criação de tabelas DDD com UUID `char(36)` via schemas Drizzle
- Resolução DT-001: consolidação de `net_amount` vs `total_value` em `fiscal_document_items`
- ALTER em tabelas existentes: `billing_items` (multi-tenancy), `fiscal_documents` (currency)
- Correção de multi-tenancy em `paymentsTable`, `receivableReceiptsTable`, `journalEntryLinesTable`
- Índices compostos para ~15 tabelas com `WHERE deleted_at IS NULL`

### F0.2 — Barrel Files e Exports

Criados `index.ts` em:
- `src/modules/financial/infrastructure/persistence/schemas/index.ts`
- `src/modules/accounting/infrastructure/persistence/schemas/index.ts`

Adicionados exports em `src/lib/db/schema.ts`:
```typescript
export * from '@/modules/financial/infrastructure/persistence/schemas';
export * from '@/modules/accounting/infrastructure/persistence/schemas';
```

### F0.3 — Atualizar Imports V1

~40 rotas em `src/app/api/financial/` atualizadas:
- `accountsPayable` → `accountsPayableTable` (schemas DDD)
- Revisão individual de nomes de coluna por rota
- Validação de INSERT com UUID funcionando

### F0.4 — Setup Homologação

**Status:** PENDENTE (tarefa operacional/infraestrutura)

Requer:
- SQL Server 2022 (container Docker ou cloud)
- Certificado digital SEFAZ A1 homologação (.pfx)
- Credenciais SEFAZ (CSC, ID Token)

---

## Fase 0.5: Input Ports + NFe/CTe → Financeiro

### F0.5.1 — 27 Input Ports (ARCH-010)

Criados 27 arquivos de interface em `domain/ports/input/`:

**Financial (11 ports):**
- `ICancelPayable`, `ICreatePayable`, `IGeneratePayableTitle`, `IGenerateReceivableTitle`
- `IPayAccountPayable`, `IReverseTitles`, `IApproveExpenseReport`, `IRejectExpenseReport`
- `ISubmitExpenseReport`, `IGetPayableById`, `IListPayables`

**Fiscal (16 ports):**
- `IAuditTaxTransition`, `IAuthorizeFiscalDocument`, `ICalculateCompensation`
- `ICalculateIbsCbs`, `ICalculateTaxes`, `ICancelFiscalDocument`
- `ICompareTaxRegimes`, `ICreateFiscalDocument`, `IGenerateSpedContributions`
- `IGenerateSpedEcd`, `IGenerateSpedFiscal`, `IGetTaxRates`
- `IProcessTaxCredits`, `ISimulateTaxScenario`, `ISubmitFiscalDocument`
- `IValidateIbsCbsGroup`

### F0.5.2 — CreatePayablesFromNFeUseCase

**Arquivo:** `src/modules/financial/application/commands/CreatePayablesFromNFeUseCase.ts`

Funcionalidade:
- Extrai `<pag>` (forma de pagamento) e `<cobr><dup>` (parcelas) do XML NFe
- Interpreta payment terms ("0" = à vista, "30/60/90" = parcelas)
- Cria AccountPayable para cada parcela com `dueDate` calculado
- Linka `payable_items` com itens da NFe (NCM, produto, quantidade, valor)

### F0.5.3 — CreatePayableFromExternalCTeUseCase

**Arquivo:** `src/modules/financial/application/commands/CreatePayableFromExternalCTeUseCase.ts`

Funcionalidade:
- Quando CTe com `cte_origin=EXTERNAL` e `tpServ=REDESPACHO` é importado
- Cria AccountPayable automaticamente (valor do frete)
- Usa `AccountDetermination` para contas contábeis

---

## Fase 1: Integração Contábil — "Nenhum Centavo sem Rastro"

### F1.1 — Account Determination

**Arquivos criados:**
- Entity: `src/modules/accounting/domain/entities/AccountDetermination.ts`
- Schema: `src/modules/accounting/infrastructure/persistence/schemas/account-determination.schema.ts`
- Repository: `src/modules/accounting/infrastructure/persistence/repositories/DrizzleAccountDeterminationRepository.ts`
- Service: `src/modules/accounting/domain/services/AccountDeterminationService.ts`
- Seed: ~30 operações (PAYMENT, RECEIPT, FREIGHT_INCOME, FISCAL_SALE, FISCAL_PURCHASE, IRRF_RETENTION, etc.)
- VO: `OperationType` (value object para tipo de operação)

### F1.2 — FinancialAccountingIntegration

**Arquivo:** `src/modules/financial/application/services/FinancialAccountingIntegration.ts`

Handlers de eventos implementados:
| Handler | Débito | Crédito |
|---------|--------|---------|
| `onPaymentCompleted()` | Fornecedores | Banco |
| `onReceivableReceived()` | Banco | Clientes |
| `onBillingFinalized()` | Clientes | Receita Transporte |
| `onPayableCancelled()` | Estorno | Estorno |
| `onInterestAccrued()` | Banco | Receitas Financeiras |
| `onDiscountGiven()` | Descontos Concedidos | Clientes |

Todas as contas determinadas via `AccountDeterminationService` (sem IDs hardcoded).

### F1.3 — Fix FiscalAccountingIntegration

**Arquivo:** `src/modules/fiscal/application/services/FiscalAccountingIntegration.ts`

Correções:
- Injetado `IAccountDeterminationRepository`
- Substituídos `accountId: '1'` por lookup dinâmico
- Corrigido typo `isAuthrized` → `isAuthorized`

### F1.4 — EventDispatcher Global

**Arquivo:** `src/shared/infrastructure/events/` (movido de `financial/`)

- `DomainEventDispatcher` agora é singleton global via DI
- Handlers cross-module registrados:
  - `PaymentCompletedHandler` → `FinancialAccountingIntegration`
  - `ReceivableReceivedHandler` → `FinancialAccountingIntegration`
  - `FiscalDocumentAuthorizedHandler` → `FiscalAccountingIntegration`
  - `BillingFinalizedHandler` → `FinancialAccountingIntegration`

### F1.5 — FinalizeBillingInvoiceUseCase

**Arquivo:** `src/modules/financial/application/commands/FinalizeBillingInvoiceUseCase.ts`

Fluxo:
1. Valida invoice (status DRAFT, dados completos)
2. Calcula retenções via `WithholdingTaxCalculator`
3. Cria `AccountReceivable` (valor líquido)
4. Cria títulos de retenção separados (IRRF, ISS, PIS, COFINS, CSLL, INSS)
5. Atualiza `billingStatus` dos CTes vinculados para `BILLED`
6. Emite `BillingFinalizedEvent`
7. Retorna `receivableId`

### F1.6 — Baixas com Juros/Multa/Desconto

**Arquivos estendidos:**
- `PayAccountPayableUseCase` — suporte a `interestAmount`, `penaltyAmount`, `discountAmount`, `iofAmount`, `feeAmount`
- `ReceivePaymentUseCase` — mesmas extensões

Cálculo: `netAmount = amount + interest + penalty - discount + iof + fee`

Cada componente gera lançamento contábil separado via `AccountDetermination`:
- Juros → D: Despesa Financeira / C: Banco
- Multa → D: Despesa Financeira / C: Banco
- Desconto → D: Fornecedor / C: Desconto Obtido

### F1.7 — Transactional Outbox Pattern

**Arquivos:**
- Schema: `domain_event_outbox` table
- Helper: `saveToOutbox()` — salva eventos na mesma transação do aggregate
- Job: background publisher para eventos pendentes
- Idempotency check via `eventId` no handler

### F1.8 — Validações de Integridade Contábil

**Arquivo:** `src/modules/accounting/domain/services/AccountIntegrityService.ts`

Regras implementadas:
- Bloquear exclusão de conta com lançamentos existentes
- Bloquear edição de código após lançamentos postados
- Bloquear lançamento em conta sintética (apenas analíticas)
- Validar partida dobrada (débito = crédito) em todo lançamento

---

## Fase 2: Migrar Rotas Financial para DDD

### F2.1 — Payables (7 rotas + 3 Use Cases novos)

| Rota | Use Case | Status |
|------|----------|--------|
| GET /payables | `ListPayablesUseCase` | Migrado |
| POST /payables | `CreatePayableUseCase` | Migrado |
| GET /payables/[id] | `GetPayableByIdUseCase` | Migrado |
| PUT /payables/[id] | `UpdatePayableUseCase` | **NOVO** |
| DELETE /payables/[id] | `CancelPayableUseCase` | Migrado |
| POST /payables/[id]/pay | `PayAccountPayableUseCase` | Migrado |
| POST /payables/[id]/split | `SplitPayableUseCase` | **NOVO** |
| POST /payables/[id]/reschedule | `ReschedulePayableUseCase` | **NOVO** |

### F2.2 — Receivables (6 rotas + 2 Use Cases novos)

Use Cases novos: `UpdateReceivableUseCase`, `PartialPaymentUseCase`

### F2.3 — Billing (8 Use Cases)

- `CreateBillingInvoiceUseCase`
- `UpdateBillingInvoiceUseCase`
- `CancelBillingInvoiceUseCase`
- `ListBillingInvoicesQuery`
- `GetBillingInvoiceByIdQuery`
- `FinalizeBillingInvoiceUseCase` (criado em F1.5)
- `SendBillingInvoiceUseCase` (email)
- `GenerateBillingPdfQuery` (PDF)

### F2.4 — Rotas Restantes + SQL Views

Migrados para DDD:
- Chart of Accounts CRUD (3 rotas)
- Financial Categories CRUD
- Cost Centers CRUD
- Bank Accounts CRUD

**SQL Views criadas (migrations):**
- `vw_dre_report` — DRE por período
- `vw_cash_flow` — Fluxo de caixa projetado
- `vw_trial_balance` — Balancete de verificação

---

## Fase 3: Fiscal Completo

### F3.1 — SEFAZ Real

**Arquivos criados:**
- `src/modules/fiscal/infrastructure/adapters/sefaz/SefazHttpClient.ts` — HTTP com mTLS (`https.Agent` + pfx)
- `signXml()` — Assinatura digital XML com `xml-crypto` + `node-forge`
- `SefazRetryPolicy` — Exponential backoff (max 3 retries, apenas erros de rede)

Endpoints implementados:
- CTe: envio, consulta, cancelamento, inutilização
- NFe: envio, consulta, manifestação
- SOAP envelope builder + XML response parser

### F3.2 — WithholdingTaxCalculator

**Arquivo:** `src/modules/financial/domain/services/WithholdingTaxCalculator.ts`

| Tributo | Alíquota | Base Legal | Condição |
|---------|----------|------------|----------|
| IRRF | 1.5% | Art. 724 RIR/2018 | PJ, min R$ 10 |
| PIS | 0.65% | Art. 30 Lei 10.833/03 | PJ, não Simples, > R$ 5.000 |
| COFINS | 3.0% | Art. 30 Lei 10.833/03 | PJ, não Simples, > R$ 5.000 |
| CSLL | 1.0% | Art. 30 Lei 10.833/03 | PJ, não Simples, > R$ 5.000 |
| ISS | 2-5% | LC 116/03 | Serviço de outro município |
| INSS | 11% / 15% | Art. 31 Lei 8.212/91 | Cessão de mão de obra |

Integrado no `FinalizeBillingInvoiceUseCase`.

### F3.3 — CFOP Determination

**Arquivos:**
- Entity: `src/modules/fiscal/domain/entities/CFOPDetermination.ts`
- Service: `src/modules/fiscal/domain/services/CFOPDeterminationService.ts`
- Repository: `DrizzleCFOPDeterminationRepository`
- Seed: ~50 combinações (vendas internas/interestaduais, compras, prestação transporte)

Funcionalidades:
- `determine()` — busca CFOP por operationType + direction + scope
- `inferScope()` — deduz INTRASTATE/INTERSTATE/FOREIGN pelas UFs
- `inferDirection()` — deduz ENTRY/EXIT pela operação
- `convertDirection()` — converte 5xxx↔1xxx, 6xxx↔2xxx, 7xxx↔3xxx

Integrado em `CreateCteUseCase` e `CreateFiscalDocumentUseCase`.

### F3.4 — SPED com Dados Reais

**Domain Services:**
- `SpedFiscalGenerator.ts` — Blocos 0, C, D, E, H, 9
- `SpedEcdGenerator.ts` — Blocos 0, I, J, K, 9
- `SpedContributionsGenerator.ts` — Blocos 0, A, C, M, 9
- `SpedStructureValidator.ts` — Validação estrutural (formato pipe, contagens Block 9)

Melhorias realizadas:
- Contagem dinâmica de registros no Bloco 9
- Dados reais de empresa e contador via `ISpedDataRepository` expandido (IE, IM, CRC)
- Correção de ordem do Bloco 0 (0001 antes de 0000)
- Getter público `SpedBlock.registers` para contagem dinâmica

### F3.5 — Migração SPED Legacy → DDD

**Ação:** Cleanup completo do código legado

- Deletados: `GenerateSpedFiscalUseCaseLegacy.ts`, `GenerateSpedEcdUseCaseLegacy.ts`, `GenerateSpedContributionsUseCaseLegacy.ts`
- Removidas factory functions deprecated de `FiscalModule.ts`
- Removidos imports de `createSpedDataRepository` (não mais necessários)
- APIs SPED agora usam 100% DDD via `container.resolve(TOKENS.GenerateSpedFiscalUseCase)`

### F3.6 — Use Cases Accounting Adicionais

- `CloseAccountingPeriodUseCase` — Fecha período contábil com validações:
  - Período futuro: rejeita
  - Já fechado: rejeita
  - Lançamentos rascunho: rejeita
  - Equilíbrio do balancete: valida
- `GenerateTrialBalanceUseCase` — Balancete de verificação (obrigatório para SPED ECD)
- SQL Views para DRE e Balanço Patrimonial

---

## Fase 4: Integrações Cross-Module

### F4.1 — TMS → Financial

**Arquivo:** `src/modules/financial/application/commands/CreatePayableFromTripUseCase.ts` (~111 linhas)

- Trip `driverType=AGGREGATE` completa → cria AccountPayable
- Usa `AccountDeterminationService` (não hardcoded)
- Emite `TripPayableCreatedEvent`
- Registrado em `FinancialModule.ts`

### F4.2 — Billing → CTe Status

**Arquivo:** `src/modules/fiscal/application/commands/UpdateCteBillingStatusUseCase.ts` (~66 linhas)

- Atualiza `billingStatus` do CTe (UNBILLED → BILLED → INVOICED)
- Validação: CTe BILLED não pode ser re-faturado
- Registrado em `FiscalModule.ts`

### F4.3 — Payment → Receipt Automático

**Arquivo:** `src/modules/financial/application/commands/CreateDriverReceiptUseCase.ts` (~94 linhas)

- Quando `PayAccountPayable` completa para payable com `origin=TMS_TRIP`
- Gera Receipt tipo FRETE linkando ao `tripId`
- **Migration:** `drizzle/migrations/0073_create_driver_receipts.sql` (58 linhas)

---

## Fase 5: Frontend Financial e Fiscal

### F5.1 — Componentes Financial

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `PayablesKanban` | `src/components/financial/PayablesKanban.tsx` | Kanban drag-and-drop: OPEN → OVERDUE → PROCESSING → PAID → CANCELLED |
| `ReceivablesKanban` | `src/components/financial/ReceivablesKanban.tsx` | Kanban: OPEN → OVERDUE → PARTIAL → RECEIVED → CANCELLED |
| `CashFlowChart` | `src/components/financial/CashFlowChart.tsx` | Gráfico Recharts: Entradas vs Saídas vs Saldo |
| `PaymentTimeline` | `src/components/financial/PaymentTimeline.tsx` | Timeline cronológica de movimentações |
| `FinancialDashboard` | `src/app/(dashboard)/financeiro/dashboard/page.tsx` | Página: KPIs + CashFlow + Vencimentos + Aging |

Padrões seguidos (referência Strategic module):
- `@hello-pangea/dnd` para drag-and-drop
- `GlassmorphismCard` + `NumberCounter` para métricas
- `PageTransition` + `FadeIn` + `StaggerContainer` para animações
- Validação de transições (VALID_TRANSITIONS map)
- Optimistic updates com rollback em erro

### F5.2 — Componentes Fiscal

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `FiscalDocumentsKanban` | `src/components/fiscal/FiscalDocumentsKanban.tsx` | Kanban: DRAFT → PENDING → AUTHORIZED → CANCELLED. Badges por tipo (NFe/CTe/MDFe/NFSe) |
| `SPEDGeneratorWizard` | `src/components/fiscal/SPEDGeneratorWizard.tsx` | Wizard 5 steps: Tipo → Período → Configurações → Gerar → Download |
| `WithholdingTaxBreakdown` | `src/components/fiscal/WithholdingTaxBreakdown.tsx` | Detalhamento visual de retenções (IRRF, PIS, COFINS, CSLL, ISS, INSS) com base legal |

Páginas adicionais:
- `/fiscal/sped/wizard/page.tsx` — Integração do SPEDGeneratorWizard com API

### F5.3 — Rotas API V2 DDD

| Rota | Métodos | Use Case |
|------|---------|----------|
| `/api/v2/financial/payables` | GET, POST | `ListPayablesUseCase`, `CreatePayableUseCase` |
| `/api/v2/financial/payables/[id]` | GET | `GetPayableByIdUseCase` |
| `/api/v2/financial/payables/[id]/pay` | POST | `PayAccountPayableUseCase` |
| `/api/v2/financial/payables/[id]/cancel` | POST | `CancelPayableUseCase` |
| `/api/v2/financial/receivables` | GET, POST | `ListReceivablesUseCase`, `CreateReceivableUseCase` |
| `/api/v2/financial/reports/cash-flow` | GET | `GetCashFlowUseCase` |
| `/api/v2/financial/reports/dre` | GET | `GetDreUseCase` |
| `/api/v2/financial/billing` | GET, POST | `ListBillingInvoicesUseCase`, `CreateBillingInvoiceUseCase` |
| `/api/v2/financial/billing/[id]/finalize` | POST | `FinalizeBillingInvoiceUseCase` |
| `/api/v2/financial/bank-reconciliation/auto` | POST | `AutoReconcileUseCase` |
| `/api/v2/accounting/journal-entries` | GET, POST | `ListJournalEntriesUseCase`, `CreateJournalEntryUseCase` |
| `/api/v2/accounting/journal-entries/[id]` | GET | `GetJournalEntryByIdUseCase` |
| `/api/v2/accounting/trial-balance` | GET | `GenerateTrialBalanceUseCase` |
| `/api/v2/accounting/period-closing` | POST | `CloseAccountingPeriodUseCase` |
| `/api/v2/fiscal/cfop/determine` | POST | `DetermineCFOPUseCase` |
| `/api/v2/audit` | GET | `IAuditLogger` |

---

## Fase 6: Robustez

### F6.1 — withAuditedTransaction

**Arquivo:** `src/shared/infrastructure/persistence/withAuditedTransaction.ts`

- Combina transações Drizzle com audit logging atômico
- Captura `AuditEntry` dentro da transação (commit atômico)
- Sanitiza campos sensíveis (password, token, certificate, privateKey → `[REDACTED]`)
- Versão raw (`withAuditedTransactionRaw`) para uso direto

### F6.2 — Audit Trail

**Arquivo:** `src/app/api/v2/audit/route.ts`

- GET endpoint para consultar audit logs
- Suporte a: entidade específica (`entityType` + `entityId`), filtros por operação, userId, data, paginação
- Schema: `shared_audit_log` table (migration `0041_add_audit_log_table.sql`)

### F6.3 — Conciliação Bancária Automática

**Domain Service:** `src/modules/financial/domain/services/AutoReconciliationService.ts`

Estratégias de matching (por peso):
1. **Valor exato** (0.40): diferença ≤ R$ 0.01
2. **Data** (0.30): mesma data (0.30) ou ±3 dias (proporcional)
3. **Descrição** (0.20): nome do parceiro na descrição da transação
4. **Documento** (0.10): número do documento na descrição

Configuração: `amountTolerance`, `dateWindowDays`, `minAutoMatchConfidence` (default 0.80)

**Use Case:** `src/modules/financial/application/commands/AutoReconcileUseCase.ts`
- Busca transações não conciliadas e títulos em aberto
- Aplica matches com `confidence >= minAutoMatchConfidence`
- Suporta `dryRun` mode
- Tudo dentro de `withAuditedTransaction`

**API:** `POST /api/v2/financial/bank-reconciliation/auto`

### F6.4 — Padronização de Transações

- Criadas rotas V2 DDD para `billing` e `journal-entries` (substituem V1 com `withMssqlTransaction`)
- Helper `withMssqlTransaction` deprecated com documentação das alternativas V2
- V1 routes: 3 Financial + 2 WMS/Fleet identificadas como legacy

---

## Fase 7: Testes e Validação

### Testes Unitários (78 testes)

| Arquivo | Testes | Cobertura |
|---------|--------|-----------|
| `AutoReconciliationService.test.ts` | 12 | Matching exato, fuzzy, CREDIT→RECEIVABLE, priorização, reutilização, config |
| `WithholdingTaxCalculator.test.ts` | 20 | IRRF, PIS/COFINS/CSLL, ISS, INSS, teto, Simples Nacional, cenário completo |
| `CFOPDeterminationService.test.ts` | 21 | determine(), inferScope(), inferDirection(), convertDirection() |
| `SpedStructureValidator.test.ts` | 8 | Arquivo vazio, formato pipe, contagem registros, identificação de blocos |
| `AccountDeterminationService.test.ts` | 10 | Partida dobrada, unicidade, códigos por grupo (ativo/passivo/despesa/receita) |
| `withAuditedTransaction.test.ts` | 7 | Interface, sanitização, commit/rollback |

### Testes de Contrato (14 testes)

| Arquivo | Testes | Schemas |
|---------|--------|---------|
| `payables.contract.test.ts` | 14 | `CreatePayableSchema`, `PayPayableSchema` (inputs válidos/inválidos) |

### Testes de Integração (41 testes)

| Arquivo | Testes | Escopo |
|---------|--------|--------|
| `financial-api.integration.test.ts` | 16 | Existência de todas as rotas V2 (payables, receivables, reports, billing, reconciliation, journal-entries, trial-balance, period-closing, CFOP, audit) |
| `module-registration.integration.test.ts` | 25 | DI registration de Financial, Accounting e Fiscal modules (tokens, use cases, repositories, sem imports legacy) |

### Load Tests (k6)

**Arquivo:** `tests/performance/k6-financial-api.js`

Cenários:
- **Smoke:** 1 VU, 30s — verificar funcionamento
- **Load:** 10 VUs, 2min — carga normal
- **Stress:** 50 VUs, 3min — teste de limite

Thresholds:
- `p(95) < 2000ms` para requests gerais
- `p(95) < 3000ms` para reports (cash-flow, trial-balance)
- `< 5%` de falhas

---

## Registro DI (Dependency Injection)

### Financial Module (`FinancialModule.ts`)

```
Tokens: FINANCIAL_TOKENS
Repositories: PayableRepository, ReceivableRepository, BillingInvoiceRepository, ...
Use Cases: CreatePayable, PayAccountPayable, ListPayables, CreateReceivable,
           ListReceivables, CreateBillingInvoice, FinalizeBillingInvoice,
           CreatePayableFromTrip, CreateDriverReceipt, AutoReconcile, ...
```

### Accounting Module (`AccountingModule.ts`)

```
Tokens: ACCOUNTING_TOKENS
Repositories: JournalEntryRepository, FiscalAccountingRepository,
              AccountDeterminationRepository, ChartOfAccountsRepository
Use Cases: CreateJournalEntry, AddLineToEntry, PostJournalEntry,
           ReverseJournalEntry, ListJournalEntries, GetJournalEntryById,
           GenerateJournalEntry, ListChartOfAccounts, GetChartAccountById,
           SuggestChartAccountCode, CreateChartAccount, UpdateChartAccount,
           DeleteChartAccount, CloseAccountingPeriod, GenerateTrialBalance
Gateways: ManagementAccountingGateway, CostCenterAllocationGateway
```

### Fiscal Module (`FiscalModule.ts`)

```
Tokens: FISCAL_TOKENS + TOKENS (shared)
Repositories: FiscalDocumentRepository, SpedDataRepository, CFOPDeterminationRepository
Use Cases: CreateFiscalDocument, SubmitFiscalDocument, AuthorizeFiscalDocument,
           CancelFiscalDocument, CalculateTaxes, GenerateDanfe, TransmitToSefaz,
           ListFiscalDocuments, GetFiscalDocumentById, ValidateFiscalDocument,
           QuerySefazStatus, AuthorizeCte, CreateCte, UpdateCte, CancelCte,
           DownloadNfes, ImportNfeXml, ManifestNfe, ListCtes, GetCteById,
           GenerateSpedFiscalV2, GenerateSpedEcdV2, GenerateSpedContributionsV2,
           SeedCFOPDetermination, DetermineCFOP, UpdateCteBillingStatus
Adapters: SefazHttpClient, TaxCalculatorAdapter, FiscalClassificationAdapter,
          PcgNcmAdapter, CteParserAdapter, NfeParserAdapter, NcmCategorizationAdapter
```

---

## Arquitetura de Referência

### Estrutura de Módulo DDD

```
src/modules/{module}/
├── domain/
│   ├── entities/          # Aggregate Roots e Entities
│   ├── value-objects/     # Value Objects imutáveis
│   ├── services/          # Domain Services (stateless)
│   ├── events/            # Domain Events
│   ├── errors/            # Domain Errors
│   └── ports/
│       ├── input/         # Use Case interfaces (ARCH-010)
│       └── output/        # Repository interfaces (ARCH-011)
├── application/
│   ├── commands/          # Write operations (ARCH-012)
│   ├── queries/           # Read operations (ARCH-013)
│   └── dtos/              # Data Transfer Objects
└── infrastructure/
    ├── persistence/
    │   ├── repositories/  # Drizzle implementations
    │   ├── mappers/       # Domain ↔ Persistence (MAPPER-004: reconstitute)
    │   └── schemas/       # 1 arquivo por tabela
    ├── adapters/          # External service adapters
    └── di/                # Module DI registration
```

### Padrões Aplicados

| Padrão | Referência | Aplicação |
|--------|-----------|-----------|
| Result Pattern | Evans (2003) | `Result<T, string>` em toda operação falível |
| Factory Method | Evans (2003) | `create()` com validações + `reconstitute()` sem |
| Repository | Vernon (2013) | Interface no domain, Drizzle no infrastructure |
| Domain Events | Evans (2003) | `BaseDomainEvent`, `IEventPublisher` |
| Transactional Outbox | Richardson (2018) | `domain_event_outbox` table, background job |
| Unit of Work | Fowler (2002) | `withAuditedTransaction`, Drizzle `db.transaction()` |
| Strategy | GoF (1994) | `TaxEngineFactory` (atual vs reforma 2026) |
| Account Determination | SAP OBYS | Mapeamento dinâmico operação → contas contábeis |

---

## Legislação Fiscal Implementada

| Tributo | Base Legal | Implementação |
|---------|-----------|---------------|
| ICMS | LC 87/96 (Lei Kandir) | CFOP Determination + SPED Fiscal |
| PIS | Lei 10.637/02 | WithholdingTaxCalculator + SPED Contribuições |
| COFINS | Lei 10.833/03 | WithholdingTaxCalculator + SPED Contribuições |
| CSLL | Lei 10.833/03 Art. 30 | WithholdingTaxCalculator |
| IRRF | Art. 724 RIR/2018 | WithholdingTaxCalculator (min R$ 10) |
| ISS | LC 116/03 | WithholdingTaxCalculator (2-5%) |
| INSS | Art. 31 Lei 8.212/91 | WithholdingTaxCalculator (11% geral, 15% cooperativa, teto R$ 908.86) |
| IBS/CBS | EC 132/2023 | Tax Reform 2026 entities (preview) |
| SPED Fiscal | IN RFB 1.774/17 | SpedFiscalGenerator (Blocos 0, C, D, E, H, 9) |
| SPED ECD | IN RFB 1.774/17 | SpedEcdGenerator (Blocos 0, I, J, K, 9) |
| EFD-Contribuições | IN RFB 1.774/17 | SpedContributionsGenerator (Blocos 0, A, C, M, 9) |

---

## Pendências (F8 Go-Live)

| Item | Status | Responsável |
|------|--------|------------|
| F0.4: Setup ambiente homologação | PENDENTE | Infra/DevOps |
| F8.1: Seed data produção (validado por contador) | PENDENTE | Contabilidade |
| F8.2: Certificado SEFAZ produção | PENDENTE | Fiscal |
| F8.3: Runbook operacional | PENDENTE | DevOps |
| F8.4: Treinamento e documentação API | PENDENTE | Time |
| F8.5: Smoke tests produção + monitor 48h | PENDENTE | QA |

### Itens Pós-Produção (Roadmap Futuro)

- CNAB remessas/retornos
- DDA integration (BTG)
- Budget/Orçamento anual
- Multi-Book Accounting (Fiscal/IFRS/Gerencial)
- Provisões e Accruals (férias, 13o)
- Consolidação multi-empresa
- Module de custos (ABC, absorção)
- BI Integration (Power BI OData)
- Message Broker real (Redis Pub/Sub)

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Next.js 15 (App Router), TypeScript strict |
| ORM | Drizzle ORM + SQL Server 2022 |
| DI | tsyringe |
| Frontend | React 19, Refine, AG Grid Enterprise, Shadcn/UI |
| Animações | Framer Motion |
| Charts | Recharts, @nivo |
| Drag & Drop | @hello-pangea/dnd |
| Validação | Zod |
| Testes | Vitest (unit/integration), Playwright (e2e), k6 (load) |
| Deploy | Coolify |
| XML | xml-crypto (assinatura), node-forge (certificados) |

---

*Documento gerado em 08/02/2026. Referência completa do plano: `.cursor/plans/financial_fiscal_production_d9d66e9e.plan.md`*
