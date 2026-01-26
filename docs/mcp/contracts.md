# Contratos do Servidor MCP

Este documento define o contrato de interoperabilidade do MCP `auracore-knowledge` (tools, resources e futuros prompts).

## Estrutura geral
- **Tools**: chamadas síncronas com `name`, `inputSchema` JSON Schema draft-07 e saída específica por tool.
- **Resources**: `uri` estável, `mimeType` e conteúdo textual/JSON. Atuais: contratos e ADRs internos.
- **Prompts**: não publicados hoje (Planned). Quando existirem, seguirão nomenclatura `prompt/<context>/<name>:vX`.

## Convenções de nomenclatura
- Tools: `snake_case` (`check_cursor_issues`, `generate_api_route`).
- Resources: `contract/<id>.md` ou `adr/<id>.md`.
- Versionamento de payload: incluir `version` no body quando a tool expõe evolução (ex.: geradores).

## Multi-tenant e filtros
- O servidor MCP não autentica; responsabilidade do chamador fornecer dados corretos.
- Para código/rotas geradas: sempre filtrar por `organizationId` e `branchId` (e `deletedAt IS NULL` quando houver soft delete).
- Quando tools exigirem tenant (ex.: generation/validation para rotas), informe em `input` os IDs necessários.

## Paginação e limites
- Tools de busca (`search_patterns`, `search_legislation`) aceitam filtros simples; limites padrão devem ser conservadores (Planned: paginação configurável).
- Respostas longas podem ser truncadas; use consultas mais específicas.

## Timeouts
- MCP segue timeout do cliente (Cursor). Para operações pesadas (ex.: `process_document`), preferir entradas menores.

## Erros padronizados
- Campo `error` com código curto em `snake_case` (ex.: `validation_error`, `not_found`, `internal_error`).
- Campo `message` amigável sem stack trace ou SQL.
- Campo opcional `details` (objeto) para indicar falhas de validação.

## Exemplos

### Listar tools
Request:
```json
{ "method": "tools/list" }
```
Response (resumo):
```json
{
  "tools": [
    { "name": "check_cursor_issues", "description": "Verifica issues", "inputSchema": { "type": "object", "properties": { "context": { "type": "string" } }, "required": ["context"] } }
  ]
}
```

### Chamar tool
Request:
```json
{
  "method": "tools/call",
  "params": { "name": "get_contract", "arguments": { "contract_id": "api-contract" } }
}
```
Response (exemplo):
```json
{
  "content": [
    {
      "type": "text",
      "text": "# API Contract\n- 401 when unauthenticated\n- 400 on invalid input\n..."
    }
  ]
}
```

### Ler resource
Request:
```json
{ "method": "resources/read", "params": { "uri": "contract/api-contract.md" } }
```
Response:
```json
{
  "contents": [
    { "uri": "contract/api-contract.md", "mimeType": "text/markdown", "text": "# API Contract\n..." }
  ]
}
```
