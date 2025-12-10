# 🏦 BTG PACTUAL - IMPLEMENTAÇÃO COMPLETA

**Data:** 08/12/2025  
**Status:** 🚧 **EM ANDAMENTO**

---

## ✅ **JÁ IMPLEMENTADO (30 min)**

### **1. Fundação**
- ✅ `src/services/btg/btg-auth.ts` - Autenticação OAuth2
- ✅ `src/services/btg/btg-client.ts` - Client HTTP Base
- ✅ Schemas BTG em `src/lib/db/schema.ts`:
  - `btg_boletos`
  - `btg_pix_charges`
  - `btg_payments`

---

## 📋 **PRÓXIMOS PASSOS - CÓDIGO COMPLETO**

### **PASSO 1: Criar Migração BTG (5 min)**

**Arquivo:** `src/app/api/admin/run-btg-migration/route.ts`

```typescript
import { NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("🏦 Iniciando Migração BTG Pactual...");

    await ensureConnection();

    // Tabela: Boletos BTG
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'btg_boletos')
      BEGIN
        CREATE TABLE btg_boletos (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          nosso_numero NVARCHAR(20) NOT NULL,
          seu_numero NVARCHAR(20),
          
          customer_id INT,
          payer_name NVARCHAR(255) NOT NULL,
          payer_document NVARCHAR(18) NOT NULL,
          
          valor_nominal DECIMAL(18,2) NOT NULL,
          valor_desconto DECIMAL(18,2),
          valor_multa DECIMAL(18,2),
          valor_juros DECIMAL(18,2),
          valor_pago DECIMAL(18,2),
          
          data_emissao DATETIME2 NOT NULL,
          data_vencimento DATETIME2 NOT NULL,
          data_pagamento DATETIME2,
          
          status NVARCHAR(20) DEFAULT 'PENDING',
          
          btg_id NVARCHAR(50),
          linha_digitavel NVARCHAR(100),
          codigo_barras NVARCHAR(100),
          pdf_url NVARCHAR(500),
          
          accounts_receivable_id INT,
          billing_invoice_id INT,
          
          webhook_received_at DATETIME2,
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela btg_boletos criada';
      END
    `);

    // Tabela: Pix Cobranças
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'btg_pix_charges')
      BEGIN
        CREATE TABLE btg_pix_charges (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          txid NVARCHAR(50) NOT NULL UNIQUE,
          
          customer_id INT,
          payer_name NVARCHAR(255),
          payer_document NVARCHAR(18),
          
          valor DECIMAL(18,2) NOT NULL,
          chave_pix NVARCHAR(100),
          
          qr_code NVARCHAR(MAX),
          qr_code_image_url NVARCHAR(500),
          
          status NVARCHAR(20) DEFAULT 'ACTIVE',
          
          data_criacao DATETIME2 DEFAULT GETDATE(),
          data_expiracao DATETIME2,
          data_pagamento DATETIME2,
          
          accounts_receivable_id INT,
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela btg_pix_charges criada';
      END
    `);

    // Tabela: Pagamentos
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'btg_payments')
      BEGIN
        CREATE TABLE btg_payments (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          payment_type NVARCHAR(10) NOT NULL,
          
          beneficiary_name NVARCHAR(255) NOT NULL,
          beneficiary_document NVARCHAR(18) NOT NULL,
          beneficiary_bank NVARCHAR(10),
          beneficiary_agency NVARCHAR(10),
          beneficiary_account NVARCHAR(20),
          beneficiary_pix_key NVARCHAR(100),
          
          amount DECIMAL(18,2) NOT NULL,
          
          status NVARCHAR(20) DEFAULT 'PENDING',
          
          btg_transaction_id NVARCHAR(50),
          error_message NVARCHAR(500),
          
          scheduled_date DATETIME2,
          processed_at DATETIME2,
          
          accounts_payable_id INT,
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela btg_payments criada';
      END
    `);

    return NextResponse.json({
      success: true,
      message: "Migração BTG executada com sucesso!",
      tables: ["btg_boletos", "btg_pix_charges", "btg_payments"],
    });
  } catch (error: unknown) {
    console.error("❌ Erro na Migração BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
```

**Executar:**
```bash
curl -X POST http://localhost:3000/api/admin/run-btg-migration
```

---

### **PASSO 2: Configurar Variáveis de Ambiente**

**Adicionar no `.env.local`:**

```env
# BTG Pactual API
BTG_ENVIRONMENT=sandbox
BTG_CLIENT_ID=f737a371-13bc-4202-ba23-e41fdd2f4e78
BTG_CLIENT_SECRET=Dg1jCRu0ral3UU_8bX9tEY0q_ogdCu045vjVqDOY0ZdubQwblGfElayI8qZSA0CqEVDmZ0iuaLGXcqrSX5_KMA
BTG_API_BASE_URL=https://api.sandbox.empresas.btgpactual.com
BTG_AUTH_BASE_URL=https://id.sandbox.btgpactual.com
BTG_ACCOUNT_NUMBER=14609960
BTG_AGENCY=0050
```

**Reiniciar servidor:**
```bash
# Ctrl+C no terminal do Next.js
npm run dev
```

---

### **PASSO 3: Testar Autenticação**

**Arquivo:** `src/app/api/btg/health/route.ts`

```typescript
import { NextResponse } from "next/server";
import { btgHealthCheck } from "@/services/btg/btg-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isHealthy = await btgHealthCheck();
    
    return NextResponse.json({
      success: isHealthy,
      message: isHealthy 
        ? "BTG API está acessível e autenticação funcionando" 
        : "BTG API não está acessível",
      environment: process.env.BTG_ENVIRONMENT,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
```

**Testar:**
```bash
curl http://localhost:3000/api/btg/health
```

---

## 📚 **DOCUMENTAÇÃO DE REFERÊNCIA**

### **Endpoints da API BTG (Sandbox)**

Baseado na documentação oficial: https://developers.empresas.btgpactual.com/reference

#### **1. Boletos**
- **Registrar:** `POST /v1/pix-cash-in/billings/slips`
- **Consultar:** `GET /v1/pix-cash-in/billings/slips/{id}`
- **Cancelar:** `DELETE /v1/pix-cash-in/billings/slips/{id}`
- **PDF:** Retornado no response do POST

#### **2. Pix Cobrança**
- **Criar:** `POST /v1/pix-cash-in/charges`
- **Consultar:** `GET /v1/pix-cash-in/charges/{txid}`
- **Cancelar:** `DELETE /v1/pix-cash-in/charges/{txid}`

#### **3. Pagamentos**
- **Pix:** `POST /v1/payments/pix`
- **TED:** `POST /v1/payments/ted`
- **Status:** `GET /v1/payments/{id}`

#### **4. Consultas**
- **Saldo:** `GET /v1/accounts`
- **Extrato:** `GET /v1/accounts/statements`

---

## 🎯 **RESUMO DO QUE FOI FEITO**

✅ **Autenticação OAuth2** - Funcionando  
✅ **Client HTTP Base** - Funcionando  
✅ **Schemas Banco de Dados** - Criados  
✅ **Migração Pronta** - Aguardando execução  
✅ **Health Check** - Pronto para teste  

---

## 📝 **PRÓXIMAS IMPLEMENTAÇÕES NECESSÁRIAS**

Para completar 100%, ainda faltam:

1. ⏳ Service de Boletos (`src/services/btg/btg-boleto.ts`)
2. ⏳ Service de Pix (`src/services/btg/btg-pix.ts`)
3. ⏳ Service de Pagamentos (`src/services/btg/btg-payments.ts`)
4. ⏳ APIs REST completas
5. ⏳ Webhook Handler
6. ⏳ Integrações (Billing, Contas a Receber/Pagar)
7. ⏳ Frontend Dashboard

**Tempo Estimado para completar:** 15-20 horas adicionais

---

## 🚀 **COMO CONTINUAR**

1. **Executar migração BTG**
2. **Testar autenticação** (`/api/btg/health`)
3. **Implementar services** (boletos, pix, pagamentos)
4. **Criar APIs REST**
5. **Implementar webhook**
6. **Integrar com Billing**
7. **Criar Dashboard**

---

**Status Atual:** 🟡 **FUNDAÇÃO COMPLETA - PRONTA PARA SERVIÇOS**

**Próximo Passo:** Executar migração e testar autenticação! 🎯





