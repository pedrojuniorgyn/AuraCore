# 🏢 AuraCore - Sistema Multi-Filial

## 📋 Visão Geral

O **AuraCore** agora é um **ERP Multi-Filial** completo, preparado para gerenciar Matriz e Filiais desde o início, evitando refatorações futuras custosas.

---

## 🗂️ Estrutura Implementada

### **1. Tabelas do Banco de Dados**

#### A. `branches` (Matriz e Filiais)
Representa as **suas empresas** (emissores de documentos fiscais).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | INT | ✅ Auto | Primary Key |
| `name` | VARCHAR(255) | ✅ | Razão Social |
| `tradeName` | VARCHAR(255) | ✅ | Nome Fantasia |
| `document` | VARCHAR(20) | ✅ | CNPJ (único) |
| `email` | VARCHAR(255) | ✅ | Email da filial |
| `phone` | VARCHAR(20) | ✅ | Telefone |
| `ie` | VARCHAR(20) | ✅ | Inscrição Estadual |
| `im` | VARCHAR(20) | ❌ | Inscrição Municipal |
| `cClassTrib` | VARCHAR(10) | ❌ | Classificação Tributária |
| `crt` | VARCHAR(1) | ✅ | Código Regime Tributário (1=Simples, 3=Normal) |
| `zipCode` - `state` | - | ✅ | Endereço completo com código IBGE |
| `timeZone` | VARCHAR(50) | ✅ | Fuso horário (ex: America/Sao_Paulo) |
| `logoUrl` | VARCHAR(500) | ❌ | URL do logotipo |
| `status` | VARCHAR(20) | ✅ | ACTIVE, INACTIVE |

#### B. `business_partners` (Clientes/Fornecedores/Transportadoras)
Representa os **terceiros** (destinatários/remetentes de documentos fiscais).

| Campo | Descrição | Novo Campo |
|-------|-----------|-----------|
| `dataSource` | Origem: 'MANUAL' ou 'XML_IMPORT' | ✅ **NOVO** |
| `email`, `phone` | Agora **nullable** (suporta importação XML) | ⚠️ Atualizado |
| *(demais campos)* | Igual à versão anterior | - |

---

## 📡 API Endpoints Completos

### **Branches (Filiais)**

#### `GET /api/branches`
Lista todas as filiais.

**Query Params:**
- `search` (string): Busca por nome/fantasia/CNPJ
- `status` (enum): ACTIVE, INACTIVE

**Resposta:**
```json
{
  "success": true,
  "data": [...],
  "total": 5
}
```

#### `POST /api/branches`
Cria uma nova filial.

**Body:**
```json
{
  "name": "FILIAL INTERIOR LTDA",
  "tradeName": "AuraCore Interior",
  "document": "12345678000190",
  "email": "interior@auracore.com.br",
  "phone": "(19) 98888-8888",
  "ie": "123456789",
  "crt": "1",
  "zipCode": "13010-111",
  "street": "Rua Principal",
  "number": "500",
  "district": "Centro",
  "cityCode": "3509502",
  "cityName": "Campinas",
  "state": "SP",
  "timeZone": "America/Sao_Paulo"
}
```

#### `GET /api/branches/[id]`
Busca uma filial específica.

#### `PUT /api/branches/[id]`
Atualiza uma filial.

**Validação Especial:**
- ✅ Verifica duplicidade de CNPJ (ignorando o próprio ID)
- ✅ Campos parciais (partial update)

#### `DELETE /api/branches/[id]`
**Soft Delete** - Inativa uma filial.

**Regra de Negócio:**
- ❌ **NÃO permite excluir a Matriz (ID 1)**
- ✅ Apenas muda `status` para `INACTIVE`

---

### **Business Partners (Parceiros)**

#### `GET /api/business-partners`
Lista todos os parceiros.

**Query Params:**
- `search` (string)
- `type` (enum): CLIENT, PROVIDER, CARRIER, BOTH
- `status` (enum): ACTIVE, INACTIVE

#### `POST /api/business-partners`
Cria um novo parceiro.

**Body:**
```json
{
  "type": "CLIENT",
  "document": "12345678000190",
  "name": "Cliente ABC Ltda",
  "tradeName": "ABC",
  "email": "contato@abc.com.br",
  "phone": "(11) 99999-9999",
  "dataSource": "MANUAL",
  "taxRegime": "SIMPLE",
  "ie": "ISENTO",
  "indIeDest": "9",
  "zipCode": "01310-100",
  "street": "Avenida Paulista",
  "number": "1000",
  "district": "Bela Vista",
  "cityCode": "3550308",
  "cityName": "São Paulo",
  "state": "SP"
}
```

#### `GET /api/business-partners/[id]`
Busca um parceiro específico.

#### `PUT /api/business-partners/[id]`
Atualiza um parceiro.

**Validações:**
- ✅ Duplicidade de documento (ignorando próprio ID)
- ✅ Email obrigatório para tipo CLIENT ou BOTH

#### `DELETE /api/business-partners/[id]`
**Soft Delete** - Inativa um parceiro.

---

## 🌱 Seed Automático (Matriz + Admin)

O script de seed agora cria **automaticamente**:

### 1️⃣ **Branch Matriz (ID 1)**
```typescript
{
  id: 1,
  name: "AURACORE LOGÍSTICA LTDA",
  tradeName: "AuraCore",
  document: "00000000000191", // TROQUE pelo seu CNPJ
  // ... outros campos
}
```

### 2️⃣ **Usuário Admin**
```typescript
{
  email: "admin@auracore.com",
  password: "admin@2024", // TROQUE após primeiro login
  role: "ADMIN"
}
```

### Como Executar:

```bash
npx tsx -r dotenv/config scripts/seed.ts
```

**Output Esperado:**
```
🚀 Iniciando Seed do AuraCore...
📡 Conectando ao banco...
✅ Conectado!

🏢 Verificando Branch Matriz...
📦 Criando Branch Matriz...
✅ Matriz criada (Branch ID 1)

👤 Verificando Usuário Admin...
📦 Criando usuário Admin...
✅ Admin criado com sucesso

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SEED CONCLUÍDO COM SUCESSO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔐 Validações Implementadas

### **Validators Zod**

#### A. Branch Validator (`src/lib/validators/branch.ts`)
- ✅ CNPJ obrigatório (14 dígitos)
- ✅ IE obrigatória (aceita 'ISENTO')
- ✅ CRT (Código Regime Tributário): 1, 2 ou 3
- ✅ Código IBGE (7 dígitos)
- ✅ UF validada (apenas estados brasileiros)
- ✅ CEP formato brasileiro
- ✅ TimeZone validado

#### B. Business Partner Validator (`src/lib/validators/business-partner.ts`)
- ✅ CPF/CNPJ (11 ou 14 dígitos)
- ✅ Data Source: MANUAL ou XML_IMPORT
- ✅ Email/Phone **opcionais** (suporte a importação XML)
- ✅ Validação cruzada (email obrigatório para clientes)

---

## 🚀 Como Aplicar no Banco de Dados

### 1. Gerar Migration

```bash
npx drizzle-kit generate
```

**Importante:**
- Quando perguntar sobre `document`, selecione: `~ rename column`
- Quando perguntar sobre novos campos, selecione: `+ create column`

### 2. Aplicar Migration

```bash
npx drizzle-kit migrate
```

### 3. Executar Seed

```bash
npx tsx -r dotenv/config scripts/seed.ts
```

---

## 🧪 Testando as APIs

### Criar uma Filial

```bash
curl -X POST http://localhost:3000/api/branches \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FILIAL CAMPINAS LTDA",
    "tradeName": "AuraCore Campinas",
    "document": "98765432000199",
    "email": "campinas@auracore.com.br",
    "phone": "(19) 99999-9999",
    "ie": "987654321",
    "crt": "1",
    "zipCode": "13010-111",
    "street": "Avenida Brasil",
    "number": "1500",
    "district": "Centro",
    "cityCode": "3509502",
    "cityName": "Campinas",
    "state": "SP",
    "timeZone": "America/Sao_Paulo"
  }'
```

### Listar Filiais Ativas

```bash
curl http://localhost:3000/api/branches?status=ACTIVE
```

### Atualizar Matriz (ID 1)

```bash
curl -X PUT http://localhost:3000/api/branches/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MINHA EMPRESA MATRIZ LTDA",
    "document": "11222333000144"
  }'
```

### Criar Cliente

```bash
curl -X POST http://localhost:3000/api/business-partners \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CLIENT",
    "document": "12345678000190",
    "name": "Cliente Teste Ltda",
    "email": "cliente@teste.com",
    "dataSource": "MANUAL",
    "taxRegime": "SIMPLE",
    "ie": "ISENTO",
    "zipCode": "01310-100",
    "street": "Av Paulista",
    "number": "1000",
    "district": "Bela Vista",
    "cityCode": "3550308",
    "cityName": "São Paulo",
    "state": "SP"
  }'
```

---

## 🏗️ Arquitetura Multi-Filial

```
┌─────────────────────────────────────────────┐
│  Frontend (a implementar)                    │
│  ├─ Seletor de Filial no Header             │
│  ├─ Contexto Global (FilialAtual)           │
│  └─ Filtros por Filial em todas as telas    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  API Routes (Implementado)                   │
│  ├─ /api/branches (CRUD completo)           │
│  └─ /api/business-partners (CRUD completo)  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Validators (Implementado)                   │
│  ├─ branch.ts (CNPJ, IE, CRT, IBGE)         │
│  └─ business-partner.ts (CPF/CNPJ, IE)      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Drizzle ORM + SQL Server                    │
│  ├─ Tabela: branches                        │
│  └─ Tabela: business_partners               │
└──────────────────────────────────────────────┘
```

---

## 📝 Próximos Passos

### Backend
- [ ] Endpoint de upload de logo para filiais
- [ ] API de consulta de filiais por estado/cidade
- [ ] Relatório de filiais com estatísticas

### Frontend (Essencial para Multi-Filial)
- [ ] **Contexto de Filial Ativa** (BranchContext)
- [ ] **Seletor de Filial** no Header (dropdown)
- [ ] Filtro global por filial em todas as listagens
- [ ] Formulário de cadastro/edição de filiais
- [ ] Tabela de gerenciamento de filiais (AG Grid)

### Fiscal (Futuro)
- [ ] Certificado digital por filial
- [ ] Série de numeração de NFe/CTe por filial
- [ ] Parametrização fiscal por filial

---

## 🎯 Regras de Negócio Implementadas

1. ✅ **Matriz não pode ser excluída** (ID 1 é protegido)
2. ✅ **Soft Delete** (status INACTIVE, nunca exclui fisicamente)
3. ✅ **CNPJ único** por filial
4. ✅ **Documento único** por business partner
5. ✅ **Email obrigatório** para clientes (validação cruzada)
6. ✅ **Código IBGE obrigatório** (7 dígitos) para cálculo fiscal
7. ✅ **Data Source** suporta importação automática de XML

---

**🎉 Sistema Multi-Filial COMPLETO e FUNCIONAL!**

**Desenvolvido para AuraCore ERP**  
Versão: 2.0.0 (Multi-Filial)  
Data: Dezembro/2024















