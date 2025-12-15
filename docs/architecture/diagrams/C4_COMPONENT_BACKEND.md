# C4 — Component (Backend)

```mermaid
flowchart TB
  subgraph Next[Next.js App Router]
    API[Route Handlers: src/app/api/**]
    MW[Middleware/Auth Gate]
  end

  subgraph Domain[Domínio & Regras]
    SVC[Services/Engines: src/services/**]
    VAL[Validators (Zod): src/lib/validators/**]
    AUTHCTX[Tenant Context/RBAC: src/lib/auth/**]
  end

  subgraph Data[Persistência]
    DBL[DB Adapter + Pool: src/lib/db/index.ts]
    DRZ[Drizzle ORM (mssql dialect)]
    SCH[Schema: src/lib/db/schema.ts + schema/accounting.ts]
    SQL[(SQL Server 2022)]
  end

  API --> AUTHCTX
  API --> VAL
  API --> SVC
  API --> DRZ
  DRZ --> DBL
  DBL --> SQL
  DRZ --> SCH

  MW --> API

  classDef risk fill:#fff1f2,stroke:#be123c,stroke-width:1px;
  class SCH risk;
```

## Observações (onde está o risco hoje)
- `SCH` (schema duplicado/heterogêneo) é o ponto de maior risco estrutural.
- Alguns handlers bypassam `AUTHCTX` e operam com `auth()` direto + branch por header.
