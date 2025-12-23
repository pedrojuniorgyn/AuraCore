## 📈 Execução — Ondas 5A+ (Log de PRs e validações)

Este documento é o **log vivo** da execução das ondas 5A em diante.  
Regra: **toda PR** relevante deve ser registrada aqui com: objetivo, risco, como validar e resultado.

---

## Status geral

| Onda | Status | PR | Deploy validado | Observações |
|------|--------|----|-----------------|------------|
| 5A (baseline + hardening) | 🔄 em andamento | PR #15 | ⬜ | Logs JSON + diagnóstico + `x-request-id` + `Server-Timing` + `OBS_SLOW_MS` |
| 5B (lote 1) | 🔄 em andamento | PR #17 | ⬜ | Idempotência persistida (SQL) nas rotas críticas (PR empilhada) |

---

## Onda 5A — Observabilidade mínima (baseline)

### PR #15
- **Objetivo**: logs JSON (requestId + duração + tenant) + buffer de requests lentos + endpoint admin de diagnóstico.
- **Principais pontos**:
  - Instrumentação em `withPermission` e `withAuth`
  - Endpoint: `GET /api/admin/diagnostics/requests`
  - Hardening: `x-request-id` em respostas + `Server-Timing` + evento `api.slow` (`OBS_SLOW_MS`)
- **Risco**: baixo (observabilidade).  
- **Como validar (Coolify)**:
  - Ver logs JSON no container (buscar por `api.request`, `api.error`)
  - Confirmar headers nas respostas: `x-request-id` e `server-timing`
  - Chamar: `/api/admin/diagnostics/requests?minMs=200&sinceMinutes=30&limit=50`
- **Resultado**: ⬜ (aguardando merge/deploy)

---

## Onda 5B — Idempotência (lote 1)

### PR #17 (empilhada na PR #15)
- **Objetivo**: garantir **efeito único** (anti-duplicação) em integrações e ações financeiras críticas.
- **Mudança**:
  - Migration `0033_idempotency_keys.sql` (tabela `dbo.idempotency_keys`)
  - Util `acquire/finalize` com lock **SERIALIZABLE**
  - Aplicado em:
    - `POST /api/btg/webhook`
    - `POST /api/financial/dda/sync`
    - `POST /api/financial/remittances/generate`
- **Risco**: médio (toca fluxos financeiros).  
- **Como validar**:
  - Rodar migration 0033 no SQL Server
  - Repetir chamada 2x com mesmos parâmetros e confirmar `hit`/`in_progress`
- **Resultado**: ⬜ (aguardando merge/deploy)

---

## Template para próximas PRs (copiar e preencher)

### PR #X
- **Onda**:
- **Objetivo**:
- **Mudança**:
- **Risco**:
- **Como validar**:
- **Rollback**:
- **Resultado**:

