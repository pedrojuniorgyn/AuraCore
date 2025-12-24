## 📈 Execução — Ondas 5A+ (Log de PRs e validações)

Este documento é o **log vivo** da execução das ondas 5A em diante.  
Regra: **toda PR** relevante deve ser registrada aqui com: objetivo, risco, como validar e resultado.

---

## Status geral

| Onda | Status | PR | Deploy validado | Observações |
|------|--------|----|-----------------|------------|
| 5A + 5B | ✅ concluído | PR #20 + PR #22 | ✅ | Observabilidade + idempotência + Ops Panel + hotfix healthcheck |
| 6 (Document Pipeline) | 🔄 em andamento | (a abrir) | ⬜ | S3/MinIO + document_store/jobs + pilotos (PDF fiscal + OFX) |

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

