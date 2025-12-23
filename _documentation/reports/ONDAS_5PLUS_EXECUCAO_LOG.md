## 📈 Execução — Ondas 5A+ (Log de PRs e validações)

Este documento é o **log vivo** da execução das ondas 5A em diante.  
Regra: **toda PR** relevante deve ser registrada aqui com: objetivo, risco, como validar e resultado.

---

## Status geral

| Onda | Status | PR | Deploy validado | Observações |
|------|--------|----|-----------------|------------|
| 5A (baseline) | 🔄 em andamento | PR #15 | ⬜ | Logs estruturados + diagnóstico de requests lentos |
| 5A (hardening) | ⏳ pendente | - | - | `x-request-id` + `Server-Timing` + slow threshold |
| 5B (lote 1) | ⏳ pendente | - | - | Idempotência persistida (SQL) + rotas críticas |

---

## Onda 5A — Observabilidade mínima (baseline)

### PR #15
- **Objetivo**: logs JSON (requestId + duração + tenant) + buffer de requests lentos + endpoint admin de diagnóstico.
- **Principais pontos**:
  - Instrumentação em `withPermission` e `withAuth`
  - Endpoint: `GET /api/admin/diagnostics/requests`
- **Risco**: baixo (observabilidade).  
- **Como validar (Coolify)**:
  - Ver logs JSON no container (buscar por `api.request`, `api.error`)
  - Chamar: `/api/admin/diagnostics/requests?minMs=200&sinceMinutes=30&limit=50`
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

