# Roadmap de Features Enterprise

**Data:** 2026-02-08
**Origem:** Diagnostico Arquitetural Enterprise - Fase 4
**Status:** PLANEJAMENTO

## Implementacoes Realizadas (Fase 4 Parcial)

### Event Publisher (InMemoryEventPublisher)
- **Status:** OPERACIONAL
- Interface `IEventPublisher` em `src/shared/domain/ports/IEventPublisher.ts`
- Implementacao `InMemoryEventPublisher` em `src/shared/infrastructure/events/`
- Registrado globalmente no DI container
- Helper `publishAggregateEvents()` para Use Cases publicarem eventos apos save
- Integrado no `PostJournalEntryUseCase` como exemplo
- **Proximo passo:** Integrar em todos os Use Cases que modificam Aggregates

### Logger Estruturado (PinoLogger)
- **Status:** OPERACIONAL
- Implementacao `PinoLogger` com output JSON em producao
- Registrado como implementacao padrao do `ILogger`
- Redacao automatica de campos sensiveis (password, token, apiKey)
- Substituido em Use Cases criticos (CreateCte, AuthorizeCte, EventPublisher)
- **Proximo passo:** Substituir console.log restantes gradualmente (157+ ocorrencias)

## Features Pendentes

### 1. Message Broker (Alta Prioridade)
**Objetivo:** Substituir InMemoryEventPublisher por broker real

**Opcoes avaliadas:**
| Broker | Prioridade | Custo | Complexidade |
|--------|-----------|-------|-------------|
| Redis Pub/Sub | ALTA | Baixo (ja tem Redis) | Baixa |
| RabbitMQ | MEDIA | Medio | Media |
| Kafka | BAIXA | Alto | Alta |

**Recomendacao:** Redis Pub/Sub como primeiro passo (ja usa Redis para cache)

**Tarefas:**
1. Criar `RedisEventPublisher implements IEventPublisher`
2. Adicionar configuracao de connection string
3. Implementar retry com exponential backoff
4. Implementar dead letter queue
5. Adicionar Transactional Outbox Pattern para confiabilidade

**Estimativa:** 1 sprint

### 2. Transactional Outbox Pattern (Alta Prioridade)
**Objetivo:** Garantir que eventos nao sejam perdidos entre save e publish

**Tarefas:**
1. Criar tabela `domain_event_outbox` (id, event_type, payload, status, created_at, published_at)
2. Salvar eventos na mesma transacao do aggregate
3. Background job para publicar eventos pendentes
4. Implementar idempotency check no handler

**Estimativa:** 1 sprint

### 3. Testes de Carga (Media Prioridade)
**Objetivo:** Validar performance sob carga real

**Ferramentas:**
- k6 (preferido - scriptavel em JS)
- Apache JMeter (alternativa)

**Cenarios criticos:**
1. Login + navegacao (50 usuarios simultaneos)
2. Emissao CTe/NFe em lote (100 docs/minuto)
3. Dashboard estrategico (20 refreshes/segundo)
4. Relatorios DRE consolidado (dados de 12 meses)
5. SPED generation (arquivo completo)

**SLAs alvo:**
| Operacao | P50 | P95 | P99 |
|----------|-----|-----|-----|
| API GET (list) | < 200ms | < 500ms | < 1s |
| API POST (create) | < 500ms | < 1s | < 2s |
| SPED generation | < 30s | < 60s | < 120s |
| Dashboard load | < 1s | < 3s | < 5s |

**Estimativa:** 1 sprint

### 4. 2FA / TOTP (Alta Prioridade para Producao)
**Objetivo:** Autenticacao multi-fator para usuarios admin

**Tarefas:**
1. Adicionar campo `totp_secret` na tabela `users` (encrypted)
2. Implementar TOTP com `otpauth` ou `speakeasy`
3. Criar API routes: POST /api/auth/2fa/setup, POST /api/auth/2fa/verify
4. Criar UI: QR code generation, código de backup
5. Middleware para enforcar 2FA em rotas admin
6. Backup codes (10 codigos de uso unico)

**Estimativa:** 1 sprint

### 5. Audit Trail Completo (Media Prioridade)
**Objetivo:** Rastreabilidade de todas as operacoes

**Estado atual:** DrizzleAuditLogger existe mas nao e usado universalmente

**Tarefas:**
1. Integrar AuditLogger em todos os Use Cases de escrita
2. Criar tabela de audit trail com campos padrao
3. Implementar query API para consulta de audit trail
4. Dashboard de auditoria

**Estimativa:** 1-2 sprints

### 6. Health Check e Observabilidade (Baixa Prioridade)
**Objetivo:** Monitoramento em producao

**Tarefas:**
1. Health check endpoint (/api/health)
2. Metricas Prometheus (request count, latency, errors)
3. Distributed tracing (OpenTelemetry)
4. Alertas (PagerDuty/Opsgenie)

**Estimativa:** 1 sprint

## Cronograma Sugerido

| Sprint | Feature | Prioridade |
|--------|---------|-----------|
| E10.1 | Message Broker (Redis) | Alta |
| E10.2 | Transactional Outbox | Alta |
| E10.3 | 2FA/TOTP | Alta |
| E11.1 | Testes de Carga | Media |
| E11.2 | Audit Trail Completo | Media |
| E12.1 | Health Check + Observabilidade | Baixa |
