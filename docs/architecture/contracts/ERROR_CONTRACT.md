# Contract — Erros (HTTP)

## 1) Objetivo
Padronizar respostas de erro para:
- evitar `500` em cenários esperados (ex.: falta de configuração, falta de contexto)
- permitir UX consistente no frontend (mensagens e retries)
- facilitar observabilidade (correlação via `requestId`)

---

## 2) Status codes padrão
- **400**: validação / regra de negócio / payload inválido
- **401**: não autenticado
- **403**: sem permissão / sem acesso à filial
- **404**: não encontrado (inclui “não pertence ao tenant”)
- **409**: conflito de versão (optimistic lock)
- **503**: módulo desabilitado / dependência não configurada (ex.: Auditoria v2 sem env)
- **500**: erro interno (sem stack em produção)

---

## 3) Payload padrão (recomendado)
Formato consistente (mínimo):

```json
{
  "error": "Mensagem humana curta",
  "code": "SOME_CODE",
  "details": "Detalhe opcional para debug",
  "requestId": "req_ou_uuid",
  "errors": [
    { "path": "campo", "message": "mensagem" }
  ]
}
```

Regras:
- `error`: obrigatório (mensagem curta).
- `code`: obrigatório para todos os erros “controlados”.
- `details`: opcional (não deve vazar segredos).
- `requestId`: recomendado (copiado do header `x-request-id` quando existir).
- `errors[]`: recomendado para validações (400).

---

## 4) Códigos recomendados (code)

### 4.1 Tenancy / branch scoping
- `UNAUTHORIZED`: 401
- `FORBIDDEN`: 403
- `BRANCH_REQUIRED`: 400 (sem `x-branch-id` e sem `defaultBranchId`)
- `BRANCH_INVALID`: 400
- `BRANCH_FORBIDDEN`: 403

### 4.2 Módulos opcionais / integrações
Usar **503** para evitar stacktrace/500 quando o sistema está “OK”, mas o módulo/dep não está disponível.
- `MODULE_DISABLED`: 503 (feature flag desligada)
- `MODULE_NOT_CONFIGURED`: 503 (feature flag ligada, mas env faltando/inválida)
- `DEPENDENCY_UNAVAILABLE`: 503 (timeout/rede para dependência externa; se for transitório)

### 4.3 Concorrência / idempotência
- `VERSION_CONFLICT`: 409
- `IDEMPOTENCY_IN_PROGRESS`: 409 (ou 202/409 conforme endpoint)

---

## 5) Exemplos

### 5.1 Validação (400)
```json
{
  "error": "Payload inválido",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "path": "periodStart", "message": "Data inválida" }
  ],
  "requestId": "2c2b1f..."
}
```

### 5.2 Auditoria v2 não configurada (503)
```json
{
  "error": "Módulo Auditoria não configurado",
  "code": "MODULE_NOT_CONFIGURED",
  "details": "AUDIT_STORE_DB_SERVER ausente | AUDIT_LEGACY_DB_USER ausente",
  "requestId": "2c2b1f..."
}
```

### 5.3 Conflito de versão (409)
```json
{
  "error": "Conflito de versão",
  "code": "VERSION_CONFLICT",
  "currentVersion": 7,
  "sentVersion": 6,
  "requestId": "2c2b1f..."
}
```
