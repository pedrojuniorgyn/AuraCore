# C4 — Container

```mermaid
flowchart LR
  U[Usuário] -->|HTTPS| WEB[Next.js App Router]
  WEB -->|Route Handlers| API[API /app/api]
  API -->|Drizzle ORM (mssql dialect)| DB[(SQL Server 2022)]
  API -->|Integrações| BTG[BTG APIs]
  API -->|Integrações| SEFAZ[SEFAZ]
  WEB -->|Cookies NextAuth| API
```
