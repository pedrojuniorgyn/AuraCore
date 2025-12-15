# Ownership (dono por domínio)

> Objetivo: evitar “área sem dono”, acelerar decisão e reduzir risco em manutenção.

## Domínios
- Financeiro: @auracore-core
- Contábil: @auracore-core
- Admin/Operações: @auracore-core
- TMS: @auracore-core
- WMS: @auracore-core
- Fiscal/SEFAZ: @auracore-core
- Integrações BTG: @auracore-core
- Infra/DB/Deploy (Coolify + SQL Server): @auracore-core

## Sistemas externos / integrações
- BTG: dono = @auracore-core | SLA interno: crítico
- SEFAZ: dono = @auracore-core | SLA interno: crítico

## Assets críticos
- `src/lib/db/schema.ts`: dono = @auracore-core
- `src/lib/db/schema/accounting.ts`: dono = @auracore-core (risco estrutural atual)
- `src/lib/auth/*`: dono = @auracore-core
- `src/app/api/admin/*`: dono = @auracore-core (governança operacional)

## Definição de “dono”
Dono é quem:
- aprova decisões de arquitetura no domínio
- mantém runbooks
- define SLAs e priorização de bugs
- garante que contratos são cumpridos
