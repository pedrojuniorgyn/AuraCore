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

    console.log("✅ Migração BTG concluída!");

    return NextResponse.json({
      success: true,
      message: "Migração BTG executada com sucesso! 🎉",
      tables: ["btg_boletos", "btg_pix_charges", "btg_payments"],
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro na Migração BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
































