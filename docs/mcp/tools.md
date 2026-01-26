# Catálogo de Tools MCP (`auracore-knowledge`)

Estado atual: tools abaixo estão implementadas no servidor MCP (`mcp-server/src/server.ts`). Tools futuras devem ser documentadas como Planned.

## Governança e validação
- `ping`: teste básico, sem input, retorna pong.
- `check_cursor_issues`: verifica issues após operações críticas. Input: `context` (string), `scope` (string, default `.`). Erros: `validation_error`.
- `check_compliance`: valida arquivo contra contratos/padrões. Input: `file_path` (string). Erros: `not_found`, `validation_error`.
- `validate_code`: valida snippet contra contratos. Input: `code` (string), `contract_ids` (string[]), `language` (typescript|javascript|sql). Erros: `validation_error`.
- `validate_schema`: valida schema Drizzle. Input: schema code. Erros: `validation_error`.
- `validate_fiscal_compliance`: valida requisitos fiscais. Input específico do módulo fiscal. Erros: `validation_error`.
- `analyze_contract`: analisa contratos/CLs. Input: documento/metadata. Erros: `validation_error`.

## Catálogo de conhecimento
- `get_contract`: retorna contrato por ID. Input: `contract_id` (string). Saída: markdown/texto.
- `list_contracts` (exposto como resource): consultar via `resources/list` e `resources/read`.
- `search_patterns`: busca padrões aprovados. Input: `query` (string), `status` (approved|proposed|all, default approved).
- `propose_pattern`: cria proposta de padrão. Input: `id`, `name`, `category`, `description` (+ opcional `example`, `rules`, `tags`). Erros: `conflict`, `validation_error`.
- `search_legislation`: busca legislação no knowledge. Input: termos e filtros.
- `get_epic_status`: status de épico `E0..E9`. Input: `epic_id` (regex `^E[0-9]$`).
- `register_correction`: registra correção de issue (para evitar reincidência). Campos: `epic`, `error_description`, `correction_applied`, `files_affected[]`, opcional `pattern_name`.

## Geração/boilerplate (DDD/Next/Drizzle)
- `generate_entity`: gera Entity DDD. Input: `name`, `module`, `properties[]`, opcional `events[]`.
- `generate_repository`: gera repository (interface + Drizzle + mapper). Input: `entity`, `module`, opcional `tableName`.
- `generate_use_case`: gera Use Case command/query. Input: `name`, `type`, `module`, `input`, `output`.
- `generate_api_route`: gera rota Next.js (Route Handler). Input inclui método, schema, validação. **Obrigatório**: mencionar filtros de tenant (organizationId, branchId) e soft delete quando aplicável.
- `create_feature`: cria feature completa (DDD). Input: metadados do módulo/feature.
- `generate_module_docs`: gera docs de módulo.
- `migrate_legacy_service`: plano de migração para DDD.
- `check_migration_status`: status de migração DDD.
- `analyze_module_dependencies`: analisa dependências e violações entre módulos.
- `create_feature` e `migrate_legacy_service` podem envolver múltiplos arquivos; validar paths antes de aplicar.

## Domínio fiscal/bancário
- `calculate_tax_scenario`: calcula ICMS/PIS/COFINS/ISS/IBS/CBS. Input: `scenario`, `amount`, uf origem/destino. Erros: `validation_error`.
- `process_document`: processamento Docling (danfe, dacte, freight_contract, bank_statement, generic). Input: `document_type`, `file_name`, `file_path` **ou** `file_base64`, opções extras. Erros: `validation_error`, `unsupported_type`.
- `search_legislation`: consulta base de legislação (filtros opcionais).

## Entrada/Saída padrão
- Inputs seguem JSON Schema definido no `inputSchema` de cada tool.
- Saída típica: `content: [{ type: "text" | "markdown" | "json", text|data }]`.
- Erros: payload MCP com `error` + `message` + opcional `details`.

## Convenções e limites
- Contexto multi-tenant deve ser respeitado pelo código gerado: **nenhum update/delete sem `organizationId` + `branchId` + `deletedAt IS NULL` quando soft delete**.
- Validar todos os params (UUID/int positivo) com Zod; devolver 400 em caso de falha.
- Evitar respostas grandes; preferir filtros (Planned: paginação para buscas).
