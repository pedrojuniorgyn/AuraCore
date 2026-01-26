# AuraCore MCP Server

Documentação local do servidor MCP (Model Context Protocol) usado no projeto AuraCore.

## O que é
- Servidor MCP `auracore-knowledge` (Next/DDD helper) exposto via stdio.
- Fornece tools para geração/validação de código, contratos de arquitetura e processamento de documentos.
- Recursos (resources) publicados: contratos e ADRs do conhecimento interno.

## Como rodar localmente
```bash
cd mcp-server
npm install
npm run build   # opcional se for rodar em dev
npm run dev     # desenvolvimento (tsx src/index.ts)
npm start       # produção (node dist/index.js)
```

## Configuração no Cursor
`.cursor/mcp.json` (ajuste o caminho do repo local):
```json
{
  "mcpServers": {
    "auracore-knowledge": {
      "command": "node",
      "args": ["/path/to/aura_core/mcp-server/dist/index.js"]
    }
  }
}
```

## Autenticação e Tenant
- Tráfego MCP é local (stdio) e não usa tokens.
- Tools geradoras/validadoras assumem contexto multi-tenant do AuraCore (organizationId/branchId/userId) informado pelo usuário na chamada ou refletido no código que será validado.
- Para rotas/DB, siga `getTenantContext` em `src/lib/auth/context.ts` (organizationId/branchId obrigatórios).

## Padrões de erro
- Erros de tool retornam payload MCP com `error` e `message`; não retornar stack trace.
- Para APIs geradas/validadas, usar padrão:
  - 401: sem sessão/tenant
  - 400: input inválido (Zod/safeJson)
  - 404: recurso não encontrado (respeitando tenant + deletedAt)
  - 500: erro interno sem vazar stack/SQL

## Versão/Compatibilidade
- Servidor: 1.0.0
- SDK: `@modelcontextprotocol/sdk` ^1.25.1
- Node: usar versão compatível com o projeto (>=18 recomendado).
