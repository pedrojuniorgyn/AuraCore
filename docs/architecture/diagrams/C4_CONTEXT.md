# C4 — Context

```mermaid
flowchart TB
  User[Usuário ERP] -->|Web| Aura[AuraCore ERP]

  subgraph AuraCore[AuraCore]
    Web[Next.js UI (Dashboard)]
    Api[Route Handlers / API]
  end

  Aura --> SQL[(SQL Server 2022)]
  Aura --> BTG[BTG Pactual]
  Aura --> SEFAZ[SEFAZ]

  Web --> Api
  Api --> SQL
```

## Notas
- O contexto do usuário (tenant/filial/permissões) é derivado da sessão (NextAuth).
- Integrações (BTG/SEFAZ) devem ser idempotentes e auditáveis.
