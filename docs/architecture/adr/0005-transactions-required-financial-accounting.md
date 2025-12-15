# ADR 0005 — Transações obrigatórias em Financeiro/Contábil

## Status
Aceito

## Contexto
Fluxos multi-step (baixa, posting, remessa, webhooks) podem deixar estado parcial se falharem no meio.

## Decisão
- Qualquer fluxo com 2+ writes que precisam ser consistentes deve ser transacional (commit/rollback).
- Webhooks e sync jobs devem ser idempotentes.

## Consequências
- Elimina estado parcial.
- Aumenta previsibilidade e auditabilidade do ERP.
