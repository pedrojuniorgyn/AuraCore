# Glossário — AuraCore (ERP Enterprise)

## Termos de arquitetura
- **Monorepo**: frontend + backend no mesmo repositório.
- **App Router (Next.js)**: modelo de rotas/páginas e Route Handlers em `src/app`.
- **Route Handler**: endpoint HTTP em `src/app/api/**/route.ts`.
- **Service/Engine**: camada de domínio em `src/services/**` (regras de negócio).
- **Contrato (Contract)**: regra invariável aplicada em toda rota (tenant/branch/RBAC/transação/etc.).
- **ADR (Architecture Decision Record)**: registro versionado de uma decisão arquitetural.

## Multi-tenant e escopo de dados
- **Tenant / Organização (organization)**: empresa cliente no SaaS; isolamento lógico por `organization_id`.
- **Multi-tenant (single database)**: múltiplas organizações no mesmo banco, separadas por `organization_id`.
- **Branch / Filial (branch)**: unidade operacional dentro de uma organização.
- **Data scoping por filial**: restrição de acesso por filial.
- **Tenant Context**: contexto derivado da sessão: `{ userId, organizationId, role, allowedBranches, defaultBranchId }`.
- **`allowedBranches`**: lista de IDs de filiais às quais o usuário tem acesso.
- **`x-branch-id`**: header enviado pelo frontend com a filial ativa (contexto sugerido; backend valida).

## Segurança
- **Auth (autenticação)**: provar identidade (sessão válida).
- **RBAC (Role-Based Access Control)**: autorização baseada em roles/permissões.
- **Role primária**: campo `users.role` (ex.: ADMIN/USER).
- **Permissão (permission slug)**: string do tipo `financial.payables.pay`.
- **Hard gate operacional**: proteção extra para operações perigosas (secret header + allowlist por ambiente).
- **Public-by-design**: endpoint público (webhook), mas com assinatura e idempotência.

## Integridade e consistência
- **Transação**: conjunto de operações no banco que deve ser atômico (commit/rollback).
- **Atomicidade**: ou tudo acontece, ou nada acontece.
- **Estado parcial**: parte do fluxo grava e outra parte falha (alto risco em financeiro/contábil).
- **Optimistic Lock / Versioning**: controle por `version` para evitar “perder atualização”; conflito retorna 409.
- **Soft delete**: exclusão lógica via `deleted_at`.
- **Auditoria**: trilha de quem fez (`created_by`, `updated_by`) e quando (`created_at`, `updated_at`).
- **UserId (UUID string)**: identificador do usuário no AuraCore (não numérico).

## Financeiro
- **Contas a Pagar (AP)**: títulos a pagar a fornecedores.
- **Contas a Receber (AR)**: títulos a receber de clientes.
- **Baixa**: liquidar título (pagamento/recebimento) com encargos.
- **Conciliação bancária**: casar transações bancárias com títulos/lançamentos.
- **OFX**: formato de extrato bancário importado.
- **CNAB**: padrão de remessa/retorno bancário.
- **Remessa**: arquivo enviado ao banco.
- **Retorno**: arquivo do banco com ocorrências.
- **DDA**: Débito Direto Autorizado (boletos no banco do pagador).

## Contábil
- **Plano de Contas**: estrutura de contas contábeis.
- **Conta sintética**: agregadora (não lançável).
- **Conta analítica**: lançável.
- **Lançamento contábil (Journal Entry)**: cabeçalho.
- **Linhas (Journal Entry Lines)**: partidas (débito/crédito).
- **Partidas dobradas**: débito = crédito.
- **Posting**: gerar/registrar lançamento a partir de origem.
- **Reversal**: estornar lançamento.

## Fiscal
- **NFe**: Nota Fiscal eletrônica.
- **CTe**: Conhecimento de Transporte eletrônico.
- **SEFAZ**: serviços de autorização/distribuição/manifestações.
- **NSU**: sequência de distribuição.
- **Manifestação**: ciência/confirm/desconhec/não realizada.
- **Chave de acesso**: 44 dígitos.

## Observabilidade e performance
- **p95/p99**: percentis de latência.
- **Query Store**: comparar planos/performance de queries.
- **Deadlock**: bloqueio circular.
- **Wait stats**: gargalos.
- **Pool de conexões**: conjunto de conexões ao SQL Server.

## Status triple (Fiscal → Contábil → Financeiro)
- **fiscalStatus**: estado fiscal (IMPORTED/CLASSIFIED/etc.).
- **accountingStatus**: estado contábil (PENDING/POSTED/REVERSED).
- **financialStatus**: estado financeiro (NO_TITLE/GENERATED/PAID).
