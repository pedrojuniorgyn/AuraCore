# ADR 0003 — userId é UUID string (não numérico)

## Status
Aceito

## Contexto
O schema core define `users.id` como UUID string (`nvarchar`). Há rotas que convertem `session.user.id` com `parseInt`, causando inconsistência.

## Decisão
- `userId` é **sempre string UUID**.
- Campos de auditoria (`createdBy`, `updatedBy`, etc.) usam string.
- É proibido `parseInt(session.user.id)` em rotas de negócio.

## Consequências
- Auditoria consistente.
- Facilita integração com NextAuth e evita bugs silenciosos.
