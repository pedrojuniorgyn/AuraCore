# Runbook — Migrations & Seeds (AuraCore + SQL Server 2022)

## Objetivo
Executar migrações e seeds com segurança em Linux/Coolify/SQL Server 2022, evitando execução acidental via HTTP e preservando integridade.

## Princípios
- Produção: seeds/migrations destrutivas NÃO devem rodar via endpoint HTTP.
- Toda operação em schema/dados exige backup/snapshot e janela de manutenção.
- Sempre salvar logs da execução.

## Pré-check (obrigatório)
- [ ] Confirmar ambiente (DEV/HML/PROD) e DB alvo (`DB_HOST`, `DB_NAME`)
- [ ] Confirmar credenciais e TLS (`DB_ENCRYPT`, `DB_TRUST_CERT`, `DB_SERVERNAME` se necessário)
- [ ] Confirmar que o SQL Server está healthy (`sqlcmd SELECT 1`)
- [ ] Backup/snapshot realizado (PROD)
- [ ] Janela de manutenção aprovada (PROD)
- [ ] Log será preservado (Coolify logs / arquivo)

## Estratégias de execução (ordem recomendada)
### 1) Migrações versionadas (preferencial)
- Rodar pelo processo de migração versionada (Drizzle/migrations).
- Objetivo: manter histórico e repetibilidade.

### 2) Migrações ad-hoc / DDL
- Somente se for inevitável.
- Executar via terminal, com script idempotente (IF EXISTS/IF NOT EXISTS).
- Registrar “o que foi executado” + ticket/ADR.

### 3) Seeds
- DEV/HML: permitido
- PROD: somente com runbook e motivo formal (ex.: criar tenant inicial em ambiente novo).
- Seeds devem ser idempotentes sempre que possível.

## Pós-check (obrigatório)
- [ ] `GET /api/health` ok
- [ ] Smoke test do módulo afetado (Financeiro/Contábil/Fiscal)
- [ ] Verificar regressão de performance (Query Store / endpoints p95)
- [ ] Verificar erros (Sentry/Logs)

## Rollback
- Schema: rollback pode não existir → rollback real é restore do backup/snapshot.
- Dados: idem.

## Proibido em produção (por padrão)
- Rotas HTTP de:
  - seed
  - clean/reset
  - migrations/DDL
  - fix de índice/FK sem runbook
