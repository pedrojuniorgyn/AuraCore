# Contract — Typecheck Gate Policy (TSG-001..TSG-004)

**Propósito:** Garantir que `npx tsc --noEmit` seja um gate consistente, permitindo exceção controlada quando o branch base já possui erros conhecidos, sem permitir regressão.

**Escopo:** Todo repositório AuraCore. Aplica-se a qualquer PR que altere código ou documentação.

## Regras

| ID | Tipo | Regra |
|----|------|-------|
| TSG-001 | MUST (HARD) | Se o branch base está com TypeScript limpo (0 erros), o PR DEVE rodar `npx tsc --noEmit` e só prosseguir se o resultado for 0 erros. |
| TSG-002 | MUST (SOFT) | Se o branch base já tem erros de typecheck, rodar `npx tsc --noEmit`, registrar evidência (log completo) e garantir que a contagem de erros NÃO aumentou. |
| TSG-003 | MUST | Qualquer novo erro introduzido pelo PR deve ser corrigido ou o PR deve ser bloqueado. Soft gate não permite regressão. |
| TSG-004 | SHOULD | Registrar no PR uma nota de typecheck informando se o gate foi HARD ou SOFT, se houve novos erros e onde está a evidência. |

## Como decidir entre HARD x SOFT

1) Rodar `npx tsc --noEmit` no branch base (ex.: `origin/main`).
2) Se o resultado for 0 erros → aplicar TSG-001 (HARD).
3) Se já houver erros → aplicar TSG-002 (SOFT), mantendo ou reduzindo a contagem.

## Evidência obrigatória para SOFT

- Log completo de `npx tsc --noEmit` salvo em `artifacts/typecheck-YYYYMMDD.log` ou equivalente.
- Informar commit/hash de referência do baseline (ex.: `baseline: faef16f6`).
- Registrar contagem de erros antes e depois (de preferência com grep simples `grep -c \"error TS\"` no log).

## Nota obrigatória no PR (TSG-004)

```
Typecheck gate: SOFT (erros pré-existentes, contagem mantida)
Baseline: faef16f6 (origin/main)
Evidência: artifacts/typecheck-20260127.log
Novos erros: não
```

Para HARD, substituir por `Typecheck gate: HARD (0 erros)` e dispensar log se não houver falhas.

## Fallbacks não permitidos

- Ignorar `tsc` porque “é só documentação”.
- Ocultar erros com `@ts-ignore`.
- Dividir PR para escapar do gate.

## Responsabilidades

- **Autor:** Executar gate conforme TSG-001/TSG-002, anexar evidência e nota.
- **Reviewer:** Validar que contagem não aumentou e que a nota está presente.
- **Automação:** Pode coletar log e anexar automaticamente quando SOFT.
