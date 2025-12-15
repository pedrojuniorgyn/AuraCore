# Domínio — TMS

## 1) Escopo
- Viagens, ocorrências, torre de controle, cockpit
- Repositório de cargas / pickup orders
- Jornadas (Lei 13.103/2015) — integra RH/Compliance

## 2) Invariantes
- Multi-tenant + branch scoping
- Consistência transacional em fluxos:
  - jornada: criar/selecionar shift + registrar evento + recalcular + atualizar shift
- Regras legais codificadas e auditáveis

## 3) Entidades principais (alto nível)
- trips
- occurrences
- cargo_repository
- pickup_orders
- driver_work_shifts / driver_shift_events

## 4) Fluxos críticos
- Registrar evento de jornada (drive/rest start/end)
- Cálculo de violações
- Atualização de status e trilha de auditoria

## 5) Endpoints críticos
- /api/tms/trips
- /api/tms/occurrences
- /api/tms/cargo-repository
- /api/tms/drivers/:id/shift-events

## 6) Segurança & RBAC mínimo
- tms.trips.read/write
- tms.occurrences.read/write
- tms.cargo.read/write
- tms.journey.write

## 7) Performance
- Índices por (organization_id, branch_id, created_at/status)
- Evitar reconstruir totais por scan completo a cada evento (quando escalar)

## 8) Observabilidade
- nº de eventos por motorista/dia
- tempo médio para registrar evento
- taxa de violações por tipo

## 9) Riscos atuais & mitigação
- SQL interpolado e sem tenant scoping em shift-events → Onda 1/2
- Sem transação no fluxo de jornada → Onda 2
