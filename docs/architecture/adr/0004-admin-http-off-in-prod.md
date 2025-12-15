# ADR 0004 — Admin HTTP OFF em produção para operações perigosas

## Status
Aceito

## Contexto
Existem endpoints admin que executam seed/migrations/DDL/clean/fixes. Isso é operacionalmente perigoso em produção.

## Decisão
- Em produção:
  - endpoints de operação perigosa via HTTP ficam desabilitados por padrão.
  - operações passam a ser executadas via runbook (terminal), com logs e backup.
- Exceção: gestão de usuários/roles e diagnósticos read-only, sempre com RBAC.

## Consequências
- Reduz superfície de ataque e execução acidental.
- Exige runbooks e disciplina operacional.
