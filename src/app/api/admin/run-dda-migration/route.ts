import { NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("🏦 Iniciando Migração DDA BTG...");

    await ensureConnection();

    // Tabela: Financial DDA Inbox (Principal)
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'financial_dda_inbox')
      BEGIN
        DROP TABLE financial_dda_inbox;
        PRINT '🗑️ Tabela financial_dda_inbox removida para recriação';
      END
      
      CREATE TABLE financial_dda_inbox (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        bank_account_id INT NOT NULL,
        
        -- Dados do Boleto (vindo do banco)
        external_id NVARCHAR(255) NOT NULL,
        beneficiary_name NVARCHAR(255) NOT NULL,
        beneficiary_document NVARCHAR(20) NOT NULL,
        
        -- Valores e Datas
        amount DECIMAL(18,2) NOT NULL,
        due_date DATETIME2 NOT NULL,
        issue_date DATETIME2,
        
        -- Código de Barras
        barcode NVARCHAR(100) NOT NULL,
        digitable_line NVARCHAR(100),
        
        -- Vinculação e Status
        status NVARCHAR(20) DEFAULT 'PENDING',
        matched_payable_id INT,
        match_score INT DEFAULT 0,
        
        -- Observações
        notes NVARCHAR(MAX),
        dismissed_reason NVARCHAR(255),
        
        -- Enterprise Base
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2
      );
      PRINT '✅ Tabela financial_dda_inbox criada com TODAS as colunas';
    `);

    // Tabela: DDAs Autorizados
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'btg_dda_authorized')
      BEGIN
        CREATE TABLE btg_dda_authorized (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          btg_dda_id NVARCHAR(100) NOT NULL UNIQUE,
          btg_company_id NVARCHAR(50) NOT NULL,
          
          creditor_name NVARCHAR(255) NOT NULL,
          creditor_document NVARCHAR(18) NOT NULL,
          
          status NVARCHAR(20) DEFAULT 'ACTIVE',
          auto_payment BIT DEFAULT 0,
          
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela btg_dda_authorized criada';
      END
    `);

    // Tabela: Débitos DDA
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'btg_dda_debits')
      BEGIN
        CREATE TABLE btg_dda_debits (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          btg_debit_id NVARCHAR(100) NOT NULL UNIQUE,
          btg_dda_id NVARCHAR(100) NOT NULL,
          
          barcode NVARCHAR(100),
          digitable_line NVARCHAR(100),
          
          amount DECIMAL(18,2) NOT NULL,
          due_date DATETIME2 NOT NULL,
          
          creditor_name NVARCHAR(255),
          creditor_document NVARCHAR(18),
          
          description NVARCHAR(500),
          
          status NVARCHAR(20) DEFAULT 'PENDING',
          
          accounts_payable_id INT,
          
          imported_at DATETIME2 DEFAULT GETDATE(),
          paid_at DATETIME2,
          
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela btg_dda_debits criada';
      END
    `);

    console.log("✅ Migração DDA BTG concluída!");

    return NextResponse.json({
      success: true,
      message: "Migração DDA BTG executada com sucesso! 🎉",
      tables: ["financial_dda_inbox", "btg_dda_authorized", "btg_dda_debits"],
    });
  } catch (error: unknown) {
    console.error("❌ Erro na Migração DDA BTG:", error);
    const errorMessage = error instanceof Error ? errorMessage : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
