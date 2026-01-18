# 🔧 MCP Tools Reference

## Tools Existentes

### Verificação

| Tool | Descrição | Input | Output |
|------|-----------|-------|--------|
| `check_cursor_issues` | Executa tsc + eslint | `{}` | `{ errors: number, warnings: number, details: string[] }` |
| `validate_code` | Valida código contra contratos | `{ file_path: string }` | `{ valid: boolean, violations: string[] }` |
| `check_compliance` | Verifica compliance de arquivo | `{ file_path: string, rules: string[] }` | `{ compliant: boolean, issues: string[] }` |

### Consulta

| Tool | Descrição | Input | Output |
|------|-----------|-------|--------|
| `get_contract` | Retorna contrato completo | `{ contract_id: string }` | `{ content: string, version: string }` |
| `search_patterns` | Busca padrões aprovados | `{ query: string }` | `{ patterns: Pattern[] }` |
| `get_epic_status` | Status de épico | `{ epic_id: string }` | `{ status: string, progress: number, tasks: Task[] }` |

### Registro

| Tool | Descrição | Input | Output |
|------|-----------|-------|--------|
| `register_correction` | Registra correção permanente | `{ epic: string, error_description: string, correction_applied: string, files_affected: string[] }` | `{ correction_id: string }` |
| `propose_pattern` | Propõe novo padrão | `{ name: string, description: string, example: string }` | `{ pattern_id: string, status: 'pending' }` |

### Utilitário

| Tool | Descrição | Input | Output |
|------|-----------|-------|--------|
| `ping` | Teste de conexão | `{}` | `{ status: 'ok', timestamp: string }` |

---

## Novos Tools (A Implementar)

### Validação Fiscal

#### validate_fiscal_compliance

Valida se uma feature atende requisitos fiscais brasileiros.

**Input:**
```typescript
interface ValidateFiscalComplianceInput {
  feature_type: 'nfe' | 'cte' | 'mdfe' | 'sped' | 'nfse';
  code_path: string;
  legislation: ('icms' | 'pis_cofins' | 'reforma_2026' | 'iss')[];
}
```

**Output:**
```typescript
interface ValidateFiscalComplianceOutput {
  compliant: boolean;
  checklist: {
    item: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
  }[];
  aliquotas_corretas: boolean;
  campos_obrigatorios: boolean;
  layout_xml_compativel: boolean;
  warnings_reforma_2026: string[];
}
```

**Exemplo:**
```json
// Input
{
  "feature_type": "nfe",
  "code_path": "src/modules/fiscal/domain/entities/NFe.ts",
  "legislation": ["icms", "pis_cofins"]
}

// Output
{
  "compliant": true,
  "checklist": [
    { "item": "CFOP válido", "status": "pass", "details": "5102 - Venda de mercadoria" },
    { "item": "CST ICMS", "status": "pass", "details": "00 - Tributada integralmente" },
    { "item": "Alíquota ICMS", "status": "warning", "details": "Verificar alíquota interestadual" }
  ],
  "aliquotas_corretas": true,
  "campos_obrigatorios": true,
  "layout_xml_compativel": true,
  "warnings_reforma_2026": ["Preparar campos para IBS/CBS"]
}
```

---

#### calculate_tax_scenario

Calcula impostos para cenário específico.

**Input:**
```typescript
interface CalculateTaxScenarioInput {
  operation_type: 'venda' | 'compra' | 'transferencia' | 'devolucao' | 'servico';
  origin_uf: string;
  dest_uf: string;
  product_ncm?: string;
  service_code?: string;
  value: number;
  is_simples_nacional: boolean;
  include_2026_preview?: boolean;
}
```

**Output:**
```typescript
interface CalculateTaxScenarioOutput {
  taxes: {
    icms: { base: number; aliquota: number; valor: number; cst: string };
    pis: { base: number; aliquota: number; valor: number; cst: string };
    cofins: { base: number; aliquota: number; valor: number; cst: string };
    iss?: { base: number; aliquota: number; valor: number };
  };
  cfop_sugerido: string;
  natureza_operacao: string;
  observacoes: string[];
  reforma_2026_preview?: {
    ibs: number;
    cbs: number;
    total: number;
  };
}
```

**Exemplo:**
```json
// Input
{
  "operation_type": "venda",
  "origin_uf": "SP",
  "dest_uf": "RJ",
  "product_ncm": "84713012",
  "value": 10000,
  "is_simples_nacional": false,
  "include_2026_preview": true
}

// Output
{
  "taxes": {
    "icms": { "base": 10000, "aliquota": 12, "valor": 1200, "cst": "00" },
    "pis": { "base": 10000, "aliquota": 1.65, "valor": 165, "cst": "01" },
    "cofins": { "base": 10000, "aliquota": 7.6, "valor": 760, "cst": "01" }
  },
  "cfop_sugerido": "6102",
  "natureza_operacao": "Venda de mercadoria",
  "observacoes": ["Operação interestadual SP→RJ", "Alíquota ICMS 12%"],
  "reforma_2026_preview": {
    "ibs": 850,
    "cbs": 900,
    "total": 1750
  }
}
```

---

### Geração de Código

#### generate_entity

Gera Entity DDD com factory methods.

**Input:**
```typescript
interface GenerateEntityInput {
  module: string;
  entity_name: string;
  properties: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
  include_multi_tenancy: boolean;
  include_audit_fields: boolean;
}
```

**Output:**
```typescript
interface GenerateEntityOutput {
  success: boolean;
  file_path: string;
  content: string;
  test_file_path?: string;
}
```

---

#### generate_use_case

Gera Use Case seguindo padrões do AuraCore.

**Input:**
```typescript
interface GenerateUseCaseInput {
  module: string;
  use_case_name: string;
  type: 'command' | 'query';
  input_properties: {
    name: string;
    type: string;
    required: boolean;
  }[];
  output_properties: {
    name: string;
    type: string;
  }[];
}
```

**Output:**
```typescript
interface GenerateUseCaseOutput {
  success: boolean;
  use_case_file: string;
  input_port_file: string;
  test_file: string;
}
```

---

#### generate_module_spec

Gera especificação completa de novo módulo DDD.

**Input:**
```typescript
interface GenerateModuleSpecInput {
  module_name: string;
  domain_description: string;
  entities: string[];
  use_cases: string[];
}
```

**Output:**
```typescript
interface GenerateModuleSpecOutput {
  success: boolean;
  spec_file: string;
  folder_structure: string[];
  estimated_files: number;
}
```

---

## Contratos Relacionados

- `verify-before-code` - Verificação obrigatória antes de codificar
- `code-consistency` - Padrões de consistência de código
- `type-safety` - Regras de type safety
- `infrastructure-layer` - Padrões da camada de infraestrutura
