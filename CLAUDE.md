# CLAUDE.md - Instruções para Claude Code

## Projeto: AuraCore ERP Logístico Enterprise

### Arquitetura
- **Backend:** Next.js 15 (App Router), TypeScript, Drizzle ORM, SQL Server 2022
- **Frontend:** React 19, Refine, AG Grid, Shadcn/UI
- **DI:** tsyringe
- **Testes:** Vitest
- **Deploy:** Coolify

### Regras MCP Obrigatórias
**SEMPRE** consultar contratos antes de codificar:
- `get_contract("verify-before-code")`
- `get_contract("code-consistency")`
- `get_contract("type-safety")`

### Padrões DDD/Hexagonal

**Dependências (INVIOLÁVEL):**
- Domain NÃO importa de Application
- Domain NÃO importa de Infrastructure
- Domain NÃO importa bibliotecas externas

**Estrutura de Módulos:**
```
src/modules/{module}/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   └── ports/
│       ├── input/
│       └── output/
├── application/
│   ├── commands/
│   └── queries/
└── infrastructure/
    ├── persistence/
    │   ├── repositories/
    │   ├── mappers/
    │   └── schemas/
    └── di/
```

### Entity Pattern
```typescript
// SEMPRE ter create() COM validações e reconstitute() SEM validações
class Entity extends AggregateRoot<string> {
  static create(props): Result<Entity, string> { /* validações */ }
  static reconstitute(props): Result<Entity, string> { /* sem validações */ }
}
```

### Verificações Pré-Commit
```bash
npx tsc --noEmit
npm test -- --run
grep -r 'as any' src/
```

### Contexto Brasil (Legislação Fiscal)
- ICMS: Lei Complementar 87/96
- PIS/COFINS: Leis 10.637/02 e 10.833/03
- SPED: Fiscal, Contribuições, ECD
- Reforma Tributária 2026: IBS, CBS, IS

### Módulo Agent (NOVO)
Localização: `src/agent/`
- Usa Google Cloud (Gemini, Document AI, Speech)
- Usa Google Workspace (Gmail, Drive, Calendar, Sheets)
- Segue padrão LangChain para Tools
- Documentação: `docs/agent/`
