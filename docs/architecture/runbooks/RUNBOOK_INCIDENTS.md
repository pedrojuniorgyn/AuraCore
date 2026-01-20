# Runbook — Incidentes (Produção)

**Versão:** 2.0.0  
**Data:** 2026-01-20  
**Épico:** E9 - Segurança Avançada & Governança

---

## Índice

1. [Triagem Rápida](#1-triagem-rápida-5-min)
2. [Classificação do Incidente](#2-classificação-do-incidente)
3. [RUNBOOK-001: Incidente de Segurança](#runbook-001-incidente-de-segurança)
4. [RUNBOOK-002: Inconsistência Contábil](#runbook-002-inconsistência-contábil)
5. [RUNBOOK-003: Falha em Documento Fiscal](#runbook-003-falha-em-documento-fiscal)
6. [RUNBOOK-004: Performance Degradada](#runbook-004-performance-degradada)
7. [Pós-Mortem](#5-pós-mortem)

---

## 1) Triagem Rápida (5 min)

### Checklist Inicial

```bash
# 1. Verificar saúde da aplicação
curl -s https://app.auracore.com.br/api/health | jq

# 2. Verificar SQL Server
sqlcmd -S servidor -d AuraCore -Q "SELECT 1 AS health"

# 3. Verificar últimos erros (Coolify logs)
docker logs auracore-app --since 5m | grep -E "ERROR|WARN"

# 4. Verificar taxa de erros 401/403/500
# Via endpoint de diagnóstico:
curl -s https://app.auracore.com.br/api/admin/diagnostics/errors | jq
```

### Métricas Críticas

| Métrica | Normal | Alerta | Crítico |
|---------|--------|--------|---------|
| Taxa 5xx | < 0.1% | 0.1-1% | > 1% |
| p95 Latência | < 500ms | 500-2000ms | > 2000ms |
| CPU SQL Server | < 70% | 70-90% | > 90% |
| Conexões DB | < 80% pool | 80-95% | > 95% |

---

## 2) Classificação do Incidente

| Tipo | Sintomas | Prioridade |
|------|----------|------------|
| **Segurança** | 401/403 anômalos, tentativas de acesso, tokens vazados | 🔴 CRÍTICO |
| **Integridade** | Débitos ≠ Créditos, dados inconsistentes, transação parcial | 🔴 CRÍTICO |
| **Fiscal** | Rejeição SEFAZ, chave inválida, XML corrompido | 🟠 ALTO |
| **Performance** | p95 > 2s, timeouts, deadlocks | 🟡 MÉDIO |
| **Disponibilidade** | App/DB down, 503 | 🔴 CRÍTICO |

---

## RUNBOOK-001: Incidente de Segurança

### Detecção

- Picos de 401/403 no dashboard
- Logs de tentativas de acesso não autorizado
- Alertas de IP suspeito
- Relatório de usuário sobre acesso indevido

### Contenção Imediata (< 15 min)

```bash
# 1. Identificar IP/usuário
grep "401\|403" logs/app.log | tail -100

# 2. Bloquear IP no WAF/Cloudflare (se necessário)
# Via dashboard Cloudflare ou:
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/firewall/rules" \
  -H "Authorization: Bearer {token}" \
  -d '{"filter": {"expression": "ip.src eq {ip}"}, "action": "block"}'

# 3. Revogar tokens do usuário suspeito
UPDATE sessions SET expires_at = GETDATE() WHERE user_id = '{userId}';
UPDATE users SET is_active = 0 WHERE id = '{userId}';

# 4. Forçar logout de todas as sessões
DELETE FROM sessions WHERE user_id = '{userId}';
```

### Investigação (< 2h)

```sql
-- Consultar audit trail do usuário
SELECT *
FROM users_audit
WHERE entity_id = '{userId}'
ORDER BY changed_at DESC;

-- Verificar acessos recentes
SELECT *
FROM request_logs
WHERE user_id = '{userId}'
  AND created_at > DATEADD(DAY, -7, GETDATE())
ORDER BY created_at DESC;
```

### Recuperação

1. Reset de credenciais do usuário afetado
2. Rotação de secrets/tokens expostos
3. Notificação ao DPO (se dados pessoais envolvidos)
4. Atualização de políticas de acesso

### Prevenção

- Habilitar MFA para todos os admins
- Configurar rate limiting por IP
- Revisar permissões RBAC

---

## RUNBOOK-002: Inconsistência Contábil

### Detecção

- Relatório de fechamento com diferença
- Débitos ≠ Créditos em período
- Alerta do sistema de reconciliação

### Diagnóstico

```sql
-- Verificar saldo por conta
SELECT 
    account_code,
    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) AS total_debit,
    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) AS total_credit,
    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END) AS balance
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.posting_date BETWEEN '{startDate}' AND '{endDate}'
  AND je.organization_id = {orgId}
  AND je.branch_id = {branchId}
GROUP BY account_code
HAVING SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END) <> 0;

-- Identificar lançamentos suspeitos
SELECT *
FROM journal_entries
WHERE ABS(total_debit - total_credit) > 0.01
  AND posting_date BETWEEN '{startDate}' AND '{endDate}'
  AND organization_id = {orgId};
```

### Contenção

```bash
# 1. Pausar processamento automático
# Definir variável de ambiente:
ENABLE_AUTO_ACCOUNTING=false

# 2. Bloquear período contábil (se aplicável)
UPDATE accounting_periods 
SET is_locked = 1 
WHERE period_date = '{period}' 
  AND organization_id = {orgId};
```

### Investigação via Audit Trail

```sql
-- Consultar histórico do lançamento
SELECT *
FROM journal_entries_audit
WHERE entity_id = '{journalEntryId}'
ORDER BY changed_at DESC;
```

### Recuperação

1. Criar lançamento de ajuste (estorno + novo)
2. Documentar razão no campo `reason`
3. Validar balanceamento
4. Liberar período se bloqueado

---

## RUNBOOK-003: Falha em Documento Fiscal

### Detecção

- Status `REJECTED` no documento
- Código de rejeição SEFAZ
- Alerta de falha de autorização

### Códigos de Rejeição Comuns

| Código | Descrição | Ação |
|--------|-----------|------|
| 204 | Duplicidade de NF-e | Verificar se já autorizada |
| 215 | Rejeição: Data-hora diverge do padrão | Corrigir timezone |
| 225 | Falha no Schema XML | Verificar XML gerado |
| 301 | Uso Denegado | Regularizar situação cadastral |
| 999 | Erro não catalogado | Consultar SEFAZ |

### Diagnóstico

```sql
-- Verificar documento rejeitado
SELECT 
    id,
    document_type,
    fiscal_key,
    status,
    rejection_code,
    rejection_reason,
    created_at
FROM fiscal_documents
WHERE id = '{documentId}';

-- Consultar audit trail
SELECT *
FROM fiscal_documents_audit
WHERE entity_id = '{documentId}'
ORDER BY changed_at DESC;
```

### Contenção

```bash
# 1. Pausar envio automático (se em lote)
ENABLE_AUTO_FISCAL_SEND=false

# 2. Isolar documento para correção manual
UPDATE fiscal_documents
SET status = 'PENDING_REVIEW'
WHERE id = '{documentId}';
```

### Recuperação

1. Identificar causa raiz pelo código
2. Corrigir dados do documento
3. Regenerar XML
4. Reenviar para SEFAZ
5. Documentar no audit trail

### Prevenção

- Validação prévia de XML antes do envio
- Monitoramento de certificado digital
- Alertas de expiração de credenciais

---

## RUNBOOK-004: Performance Degradada

### Detecção

- p95 > 500ms (threshold)
- Timeouts em requisições
- Alertas de slow query

### Diagnóstico Inicial

```bash
# 1. Verificar endpoint de diagnóstico
curl -s https://app.auracore.com.br/api/admin/diagnostics/query-store | jq

# 2. Verificar requisições lentas recentes
curl -s https://app.auracore.com.br/api/admin/diagnostics/requests?slow=true | jq
```

### Análise Query Store

```sql
-- Top 10 queries mais lentas
SELECT TOP 10
    q.query_id,
    LEFT(qt.query_sql_text, 200) AS query_preview,
    rs.avg_duration / 1000.0 AS avg_duration_ms,
    rs.max_duration / 1000.0 AS max_duration_ms,
    rs.count_executions,
    rs.avg_cpu_time / 1000.0 AS avg_cpu_ms,
    rs.avg_logical_io_reads
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
ORDER BY rs.avg_duration DESC;

-- Índices recomendados
SELECT 
    ROUND(migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans), 2) AS improvement_measure,
    mid.statement AS table_name,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns
FROM sys.dm_db_missing_index_groups mig
JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID('AuraCore')
ORDER BY improvement_measure DESC;
```

### Contenção

```bash
# 1. Se problema específico de endpoint, habilitar cache
# Via variável de ambiente ou feature flag

# 2. Se sobrecarga geral, escalar horizontalmente (Coolify)
# Aumentar réplicas da aplicação

# 3. Se deadlock, identificar e matar sessão
KILL {session_id};
```

### Recuperação

1. Identificar query problemática
2. Analisar plano de execução
3. Criar índice se necessário (com script de rollback)
4. Aplicar em janela de manutenção
5. Monitorar melhoria

### Prevenção

- Query Store habilitado e monitorado
- Alertas de p95/p99
- Revisão de índices mensal
- Testes de carga antes de releases

---

## 5) Pós-Mortem

### Template Mínimo

```markdown
## Incidente: [TÍTULO]
**Data:** YYYY-MM-DD HH:mm
**Duração:** X horas
**Severidade:** CRÍTICO/ALTO/MÉDIO

### Impacto
- Usuários afetados: N
- Funcionalidades impactadas: ...

### Linha do Tempo
- HH:mm - Detecção
- HH:mm - Triagem
- HH:mm - Contenção
- HH:mm - Resolução

### Causa Raiz
[Descrição técnica]

### Correção Aplicada
[O que foi feito]

### Prevenção
- [ ] ADR criado
- [ ] Teste adicionado
- [ ] Alerta configurado
- [ ] Documentação atualizada
```

### Onde Registrar

1. **Notion/Confluence:** Post-mortem completo
2. **GitHub Issues:** Link para tracking
3. **Audit Trail:** Correções aplicadas (via API)

---

## Contatos de Emergência

| Papel | Nome | Contato |
|-------|------|---------|
| DBA | [Nome] | [Telefone] |
| DevOps | [Nome] | [Telefone] |
| Tech Lead | [Nome] | [Telefone] |
| DPO | [Nome] | [Telefone] |

---

## Referências

- [Query Store Setup](/scripts/sql/query-store-setup.sql)
- [Audit Tables Setup](/scripts/sql/audit-tables-setup.sql)
- [Architecture Decision Records](/docs/architecture/adr/)
- [Contrato RBAC](/docs/architecture/contracts/RBAC_CONTRACT.md)
