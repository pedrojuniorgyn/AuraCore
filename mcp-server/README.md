# AuraCore MCP Knowledge Server

MCP (Model Context Protocol) Server para o projeto AuraCore ERP Logístico Enterprise.

## Visão Geral

Este servidor MCP fornece ferramentas para:
- Geração de código seguindo padrões DDD/Hexagonal
- Validação de arquitetura e compliance
- Processamento de documentos fiscais e bancários
- Cálculos tributários brasileiros
- Análise de dependências e migração

## Instalação

```bash
cd mcp-server
npm install
npm run build
```

## Uso

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## Configuração no Cursor

Adicione ao seu `.cursor/mcp.json`:

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

---

## Tools Disponíveis

| Tool | Categoria | Descrição |
|------|-----------|-----------|
| `get_contract` | Conhecimento | Retorna contrato/regra de código |
| `search_patterns` | Conhecimento | Busca padrões de código aprovados |
| `check_cursor_issues` | Validação | Executa tsc + eslint |
| `validate_code` | Validação | Valida código contra contratos |
| `check_compliance` | Validação | Verifica compliance de arquivo |
| `validate_schema` | Validação | Valida schema Drizzle |
| `validate_fiscal_compliance` | Validação | Valida features fiscais |
| `generate_entity` | Geração | Gera Entity DDD completa |
| `generate_use_case` | Geração | Gera Use Case (Command/Query) |
| `generate_repository` | Geração | Gera Repository completo |
| `generate_api_route` | Geração | Gera API Route Next.js 15 |
| `create_feature` | Geração | Cria feature completa |
| `analyze_module_dependencies` | Análise | Analisa dependências e violações |
| `check_migration_status` | Análise | Status da migração DDD |
| `migrate_legacy_service` | Migração | Plano de migração DDD |
| `generate_module_docs` | Documentação | Gera documentação de módulo |
| `calculate_tax_scenario` | Cálculo | Calcula impostos brasileiros |
| `get_epic_status` | Projeto | Status de épico |
| `register_correction` | Projeto | Registra correção de issue |
| `propose_pattern` | Projeto | Propõe novo padrão |
| `process_document` | Processamento | Extrai dados de documentos |

---

## Documentação das Tools

### get_contract

Retorna um contrato/regra de código do knowledge base.

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `contract_id` | string | ✅ | ID do contrato |

**Contratos disponíveis:**
- `verify-before-code` - Protocolo de verificação
- `code-consistency` - Consistência de código
- `type-safety` - Segurança de tipos
- `entity-pattern` - Padrão de Entity
- `repository-pattern` - Padrão de Repository
- `use-case-pattern` - Padrão de Use Case
- `schema-pattern` - Padrão de Schema Drizzle
- `architecture-layers` - Camadas de arquitetura
- `known-bugs-registry` - Registro de bugs conhecidos
- `lesson-learned` - Lições aprendidas

---

### search_patterns

Busca padrões de código aprovados no knowledge base.

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `query` | string | ✅ | Termo de busca |
| `category` | string | ❌ | Categoria do padrão |

---

### generate_entity

Gera uma Entity DDD completa com create(), reconstitute(), getters e eventos.

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `name` | string | ✅ | Nome da entity (PascalCase) |
| `module` | string | ✅ | Módulo destino |
| `properties` | array | ✅ | Lista de propriedades |
| `events` | array | ❌ | Eventos de domínio |

**Exemplo:**
```json
{
  "name": "Trip",
  "module": "tms",
  "properties": [
    { "name": "driverId", "type": "string", "required": true },
    { "name": "vehicleId", "type": "string", "required": true },
    { "name": "status", "type": "TripStatus", "required": true }
  ],
  "events": ["TripCreated", "TripStarted", "TripCompleted"]
}
```

---

### generate_repository

Gera Repository completo (Interface + Drizzle + Mapper + Schema).

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `entity` | string | ✅ | Nome da entity |
| `module` | string | ✅ | Módulo destino |
| `tableName` | string | ❌ | Nome da tabela (snake_case) |

---

### generate_use_case

Gera Use Case (Command ou Query) com validação e Result pattern.

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `name` | string | ✅ | Nome do use case |
| `type` | string | ✅ | `command` ou `query` |
| `module` | string | ✅ | Módulo destino |
| `input` | object | ✅ | Schema de input |
| `output` | object | ✅ | Schema de output |

---

### calculate_tax_scenario

Calcula impostos brasileiros (ICMS, PIS, COFINS, ISS, IBS, CBS).

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `scenario` | object | ✅ | Cenário fiscal |
| `amount` | number | ✅ | Valor base |
| `origin_state` | string | ❌ | UF origem |
| `destination_state` | string | ❌ | UF destino |

---

### process_document

Processa documentos usando Docling para extração de dados estruturados.

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `document_type` | string | ✅ | Tipo: `danfe`, `dacte`, `freight_contract`, `bank_statement`, `generic` |
| `file_path` | string | ⚠️ | Caminho do arquivo (ou file_base64) |
| `file_base64` | string | ⚠️ | Conteúdo em base64 (ou file_path) |
| `file_name` | string | ✅ | Nome do arquivo com extensão |
| `options` | object | ❌ | Opções adicionais (language, ocr_enabled) |

#### Tipos de Documento Suportados

##### `danfe` - Nota Fiscal Eletrônica
Extrai chave de acesso (44 dígitos), CNPJs, produtos, valores.

**Dados extraídos:**
- Chave de acesso, número, série
- Emitente (CNPJ, razão social, IE, UF)
- Destinatário (CNPJ/CPF, razão social, UF)
- Produtos (código, descrição, NCM, quantidade, valor)
- Totais (produtos, frete, total)

##### `dacte` - Conhecimento de Transporte
Extrai chave CTe (modelo 57), CFOP, modal, documentos transportados.

**Dados extraídos:**
- Chave CTe, número, série
- CFOP, modal, tipo de serviço
- Emitente, remetente, destinatário
- Valores (serviço, carga)
- Documentos transportados (NFes vinculadas)

##### `freight_contract` - Contrato de Frete
Extrai partes, valores, cláusulas, prazo de pagamento.

**Dados extraídos:**
- Tipo de contrato (FRETE_SPOT, DEDICADO, AGREGAMENTO, SUBCONTRATACAO)
- Número do contrato
- Partes (contratante, contratado)
- Valores e tipo de precificação
- Prazo de pagamento

##### `bank_statement` - Extrato Bancário ⭐ NEW

Suporta arquivos OFX/QFX e CSV de bancos brasileiros.

**Formatos suportados:**
| Extensão | Formato | Bancos |
|----------|---------|--------|
| `.ofx` | Open Financial Exchange | Todos os bancos brasileiros |
| `.qfx` | Quicken OFX | Todos os bancos brasileiros |
| `.csv` | Valores separados | Itaú, Bradesco, BB, Santander, Caixa |
| `.txt` | Texto (auto-detect) | Detecta formato automaticamente |

**Dados extraídos:**
- **Conta:** código do banco, nome, agência, número, tipo, moeda
- **Período:** data inicial, data final
- **Saldo:** inicial, final, disponível
- **Transações:** lista completa com categorização

**Categorização automática:**
| Categoria | Padrões detectados |
|-----------|-------------------|
| `FUEL` | Posto, Shell, Ipiranga, BR, Petrobras |
| `TOLL` | Pedágio, Sem Parar, Conectcar, Veloe |
| `BANK_FEE` | Tarifa, Taxa, Anuidade, IOF |
| `TAX` | DARF, GPS, INSS, FGTS, ICMS, ISS |
| `SALARY` | Salário, Folha de Pagamento |
| `UTILITY` | Celesc, Copel, Cemig, Vivo, Tim, Claro |
| `TRANSFER` | TED, DOC, PIX, Transferência |
| `INSURANCE` | Seguro, Porto Seguro, Mapfre |
| `OTHER` | Outros não categorizados |

**Estatísticas calculadas:**
- Total de transações
- Quantidade e soma de créditos
- Quantidade e soma de débitos
- Movimento líquido
- Média por transação

**Exemplo de uso:**
```json
{
  "document_type": "bank_statement",
  "file_name": "extrato_janeiro.ofx",
  "file_base64": "T0ZYSEVBREVSOjEwMA..."
}
```

**Exemplo de resposta:**
```json
{
  "success": true,
  "document_type": "bank_statement",
  "processing_time_ms": 45,
  "data": {
    "bank_statement": {
      "account": {
        "bankCode": "341",
        "bankName": "Itau",
        "accountNumber": "12345-6",
        "accountType": "CHECKING",
        "currency": "BRL"
      },
      "period": {
        "start": "2026-01-01",
        "end": "2026-01-31"
      },
      "balance": {
        "opening": 5000.00,
        "closing": 6500.00
      },
      "statistics": {
        "transactionCount": 45,
        "creditCount": 12,
        "debitCount": 33,
        "totalCredits": 15000.00,
        "totalDebits": 8500.00,
        "netMovement": 6500.00,
        "averageAmount": 522.22
      },
      "transactions": [
        {
          "fitId": "20260105001",
          "date": "2026-01-05",
          "description": "TED RECEBIDA - CLIENTE ABC",
          "amount": 1500.00,
          "type": "CREDIT",
          "transactionType": "XFER",
          "category": "TRANSFER",
          "categoryConfidence": 0.85
        }
      ],
      "validation": {
        "isValid": true,
        "errors": [],
        "warnings": []
      },
      "parserUsed": "OFX",
      "format": "OFX"
    }
  }
}
```

##### `generic` - Documento Genérico
Retorna texto e tabelas raw extraídos pelo Docling.

---

### validate_schema

Valida schema Drizzle contra regras SCHEMA-001 a SCHEMA-010.

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `schemaPath` | string | ✅ | Caminho do arquivo de schema |

**Regras validadas:**
- SCHEMA-001: Um arquivo por tabela
- SCHEMA-003: Índice composto (organizationId, branchId)
- SCHEMA-005: Campos createdAt, updatedAt obrigatórios
- SCHEMA-006: Soft delete com deletedAt nullable
- SCHEMA-007: Money em 2 colunas (amount + currency)

---

### analyze_module_dependencies

Analisa dependências de um módulo e detecta violações de arquitetura.

**Input:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `modulePath` | string | ✅ | Caminho do módulo |

**Violações detectadas:**
- Domain importando de Application
- Domain importando de Infrastructure
- Domain importando bibliotecas externas
- Dependências circulares

---

## Testes

```bash
# Executar todos os testes
npm test

# Com watch mode
npm run test:watch

# Com UI
npm run test:ui

# Com coverage
npm run test:coverage
```

---

## Changelog

### v2.1.0 (2026-01-19)
- ✨ **process_document**: Adicionado suporte a `bank_statement`
  - Parse de arquivos OFX/QFX
  - Parse de arquivos CSV (múltiplos bancos brasileiros)
  - Categorização automática de 8 categorias
  - Estatísticas de créditos/débitos
- 🧪 Adicionados 19 testes para bank_statement

### v2.0.0 (2026-01-18)
- ✨ Adicionado tool `process_document` com suporte a DANFe, DACTe, FreightContract
- 🔧 Integração com Docling para OCR

### v1.0.0 (2026-01-01)
- 🎉 Release inicial
- ✨ 20 tools de geração, validação e análise
- 📚 Knowledge base com contratos e padrões

---

## Estrutura do Projeto

```
mcp-server/
├── src/
│   ├── contracts/          # Contratos JSON e TypeScript
│   ├── parsers/            # Parsers de documentos
│   │   └── bank-statement-parser.ts
│   ├── resources/          # Resources MCP (ADRs, Contracts)
│   ├── tools/              # Implementação das tools
│   │   ├── process-document.ts
│   │   ├── generate-entity.ts
│   │   └── ...
│   ├── utils/              # Utilitários
│   ├── server.ts           # Servidor MCP principal
│   └── index.ts            # Entry point
├── tests/
│   ├── fixtures/           # Fixtures de teste
│   ├── integration/        # Testes de integração
│   └── unit/               # Testes unitários
├── knowledge/              # Base de conhecimento JSON
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Licença

ISC © AuraCore Team
