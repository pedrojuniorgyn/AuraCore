# Domínio — Contábil

## 1) Escopo
- Lançamentos contábeis (journal_entries / journal_entry_lines)
- Postagem (posting) a partir de documentos fiscais
- Estorno (reversal)
- Dimensões (centro de custo, categoria, parceiro)
- Integração Fiscal → Contábil → Financeiro

## 2) Invariantes
- Partidas dobradas: total débito = total crédito.
- Não lançar em conta sintética (somente analíticas).
- Multi-tenant + branch scoping.
- Auditoria com userId UUID string.
- Transação obrigatória:
  - gerar lançamento + linhas + atualizar documento fiscal
  - estornar lançamento + atualizar documento fiscal

## 3) Entidades principais
- journal_entries
- journal_entry_lines
- chart_of_accounts
- (origens) fiscal_documents / payments / receipts

## 4) Origens de lançamento (sourceType)
- FISCAL_DOC, PAYMENT, RECEIPT, MANUAL, ADJUSTMENT, etc.

## 5) Fluxos críticos
- Postar documento fiscal (gerar journal entry + linhas; marcar fiscal_documents.accounting_status=POSTED)
- Estornar lançamento (criar reversão; atualizar status/links)

## 6) Endpoints críticos
- /api/accounting/journal-entries
- /api/accounting/journal-entries/:id/post
- /api/accounting/journal-entries/:id/reverse

## 7) Segurança & RBAC mínimo
- accounting.journal.read
- accounting.journal.create
- accounting.journal.post
- accounting.journal.reverse

## 8) Performance
- Índices por (organization_id, branch_id, entry_date, status, deleted_at)
- Evitar N+1 em geração de linhas (agrupar quando possível)
- Query Store para regressão de plano

## 9) Observabilidade
- contagem de lançamentos/dia por org/filial
- taxa de falha de posting (por erro)
- tempo médio de posting

## 10) Riscos atuais & mitigação
- Engine sem tenant scoping em selects por id → Onda 1
- Sem transação no posting/reversal → Onda 2
- Inconsistência de tipos entre schemas → ADR + convergência gradual
