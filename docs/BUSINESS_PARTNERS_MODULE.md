# Módulo de Cadastros Gerais - Business Partners

## 📋 Visão Geral

Módulo de backend para gerenciamento de **Parceiros de Negócio** (Clientes, Fornecedores, Transportadoras) com **total compliance fiscal brasileiro** para NFe/CTe 4.0 e Reforma Tributária.

---

## 🗂️ Estrutura de Arquivos

```
src/
├── lib/
│   ├── db/
│   │   └── schema.ts                    # Tabela business_partners com campos fiscais
│   └── validators/
│       └── business-partner.ts          # Schema Zod de validação
└── app/
    └── api/
        └── business-partners/
            └── route.ts                 # Endpoints GET e POST
```

---

## 🏗️ Aplicar Migration no Banco de Dados

### 1. Gerar a Migration

```bash
npx drizzle-kit generate
```

**Importante:** Quando o Drizzle perguntar sobre a coluna `document`:
- Selecione: `~ dbo.doc_federal › dbo.document` (rename column)
- Isso evita perda de dados existentes

### 2. Aplicar a Migration

```bash
npx drizzle-kit migrate
```

---

## 📡 Endpoints da API

### **GET** `/api/business-partners`

Lista todos os parceiros com filtros opcionais.

**Query Parameters:**
- `search` (string): Busca por nome/fantasia/documento
- `type` (enum): `CLIENT`, `PROVIDER`, `CARRIER`, `BOTH`
- `status` (enum): `ACTIVE`, `INACTIVE`

**Exemplo:**
```bash
GET /api/business-partners?search=Transportadora&type=CARRIER
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "CARRIER",
      "document": "12345678000190",
      "name": "Transportadora XYZ Ltda",
      "tradeName": "XYZ Express",
      "taxRegime": "NORMAL",
      "ie": "123456789",
      "cityCode": "3550308",
      "state": "SP",
      ...
    }
  ],
  "total": 1
}
```

---

### **POST** `/api/business-partners`

Cria um novo parceiro de negócio.

**Body (application/json):**
```json
{
  "type": "CLIENT",
  "document": "12345678000190",
  "name": "Empresa ABC Ltda",
  "tradeName": "ABC Comércio",
  "email": "contato@abc.com.br",
  "phone": "(11) 98765-4321",
  
  "taxRegime": "SIMPLE",
  "ie": "ISENTO",
  "im": "123456",
  "indIeDest": "9",
  
  "zipCode": "01310-100",
  "street": "Avenida Paulista",
  "number": "1000",
  "complement": "Sala 100",
  "district": "Bela Vista",
  "cityCode": "3550308",
  "cityName": "São Paulo",
  "state": "SP"
}
```

**Resposta (201 - Sucesso):**
```json
{
  "success": true,
  "message": "Parceiro de negócio criado com sucesso",
  "data": { ... }
}
```

**Resposta (400 - Dados Inválidos):**
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": [
    {
      "path": ["document"],
      "message": "CPF deve ter 11 dígitos ou CNPJ 14 dígitos"
    }
  ]
}
```

**Resposta (409 - Documento Duplicado):**
```json
{
  "success": false,
  "error": "Documento já cadastrado",
  "details": "Já existe um parceiro com o documento 12345678000190"
}
```

---

## 🔐 Validações Implementadas

### Campos Obrigatórios
- ✅ **Documento (CPF/CNPJ)**: Formato validado, removido formatação
- ✅ **Código IBGE da Cidade**: Exatamente 7 dígitos (crucial para cálculo de impostos)
- ✅ **UF (Estado)**: Apenas UFs válidas do Brasil
- ✅ **CEP**: Formato brasileiro (00000-000 ou 00000000)
- ✅ **Email**: Obrigatório para tipo `CLIENT` ou `BOTH`

### Validações Fiscais Especiais
- ✅ **IE (Inscrição Estadual)**: Obrigatória para Regime Normal (aceita 'ISENTO')
- ✅ **Regime Tributário**: Enums validados (`SIMPLE`, `NORMAL`, `PRESUMED`)
- ✅ **Indicador IE Destino**: Valores válidos (1, 2, 9)

### Validações de Negócio
- ✅ **Unicidade de Documento**: Não permite CPF/CNPJ duplicados
- ✅ **Validação Cruzada**: Email obrigatório para clientes

---

## 🧪 Testar a API

### 1. Criar um Cliente

```bash
curl -X POST http://localhost:3000/api/business-partners \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CLIENT",
    "document": "12345678000190",
    "name": "Empresa Teste Ltda",
    "tradeName": "Teste",
    "email": "teste@empresa.com",
    "phone": "(11) 99999-9999",
    "taxRegime": "SIMPLE",
    "ie": "ISENTO",
    "zipCode": "01310-100",
    "street": "Avenida Paulista",
    "number": "1000",
    "district": "Bela Vista",
    "cityCode": "3550308",
    "cityName": "São Paulo",
    "state": "SP"
  }'
```

### 2. Listar Todos os Parceiros

```bash
curl http://localhost:3000/api/business-partners
```

### 3. Buscar por Tipo

```bash
curl http://localhost:3000/api/business-partners?type=CLIENT&status=ACTIVE
```

---

## 📊 Campos da Tabela

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | INT | Auto | Primary Key |
| `type` | VARCHAR(20) | ✅ | CLIENT, PROVIDER, CARRIER, BOTH |
| `document` | VARCHAR(20) | ✅ | CPF/CNPJ (único) |
| `name` | VARCHAR(255) | ✅ | Razão Social |
| `tradeName` | VARCHAR(255) | ❌ | Nome Fantasia |
| `email` | VARCHAR(255) | ❌* | Email (*obrigatório para clientes) |
| `phone` | VARCHAR(20) | ❌ | Telefone |
| `taxRegime` | VARCHAR(20) | ✅ | SIMPLE, NORMAL, PRESUMED |
| `ie` | VARCHAR(20) | ❌* | Inscrição Estadual (*obrigatória se Regime Normal) |
| `im` | VARCHAR(20) | ❌ | Inscrição Municipal |
| `cClassTrib` | VARCHAR(10) | ❌ | Classificação Tributária (Reforma) |
| `indIeDest` | VARCHAR(1) | ✅ | 1=Contribuinte, 2=Isento, 9=Não Contribuinte |
| `zipCode` | VARCHAR(10) | ✅ | CEP |
| `street` | VARCHAR(255) | ✅ | Logradouro |
| `number` | VARCHAR(20) | ✅ | Número |
| `complement` | VARCHAR(100) | ❌ | Complemento |
| `district` | VARCHAR(100) | ✅ | Bairro |
| `cityCode` | VARCHAR(7) | ✅ | Código IBGE (7 dígitos) |
| `cityName` | VARCHAR(100) | ✅ | Nome da Cidade |
| `state` | VARCHAR(2) | ✅ | UF |
| `status` | VARCHAR(20) | ✅ | ACTIVE, INACTIVE |
| `createdAt` | DATETIME2 | Auto | Data de Criação |
| `updatedAt` | DATETIME2 | Auto | Data de Atualização |

---

## 🚀 Próximos Passos

### Backend (a implementar)
- [ ] Endpoint **PUT** `/api/business-partners/[id]` (Atualização)
- [ ] Endpoint **DELETE** `/api/business-partners/[id]` (Soft Delete)
- [ ] Endpoint **GET** `/api/business-partners/[id]` (Busca Individual)
- [ ] Integração com API ViaCEP para autocompletar endereço
- [ ] Validação de dígitos verificadores de CPF/CNPJ
- [ ] Consulta de CNPJ na Receita Federal (opcional)

### Frontend (a implementar)
- [ ] Formulário de Cadastro com validação React Hook Form + Zod
- [ ] Tabela de Listagem com AG Grid
- [ ] Filtros avançados e paginação
- [ ] Modal de Edição

---

## 📝 Notas de Compliance Fiscal

Este módulo foi desenvolvido seguindo as especificações:
- **NFe 4.0** (Nota Fiscal Eletrônica)
- **CTe 4.0** (Conhecimento de Transporte Eletrônico)
- **Reforma Tributária Brasileira** (período de transição)
- **eSocial** (Classificação Tributária)

**Campos críticos para emissão de documentos fiscais:**
- `cityCode`: Usado para cálculo de ICMS no destino
- `indIeDest`: Define tratamento tributário do destinatário
- `ie`: Validada para operações interestaduais
- `taxRegime`: Define regime de apuração de impostos

---

**Desenvolvido para OmniLogistics ERP**  
Versão: 1.0.0  
Data: Dezembro/2024














