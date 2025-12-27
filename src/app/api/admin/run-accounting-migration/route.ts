import { NextResponse } from "next/server";
import { sql as rawSql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🚀 MIGRATION: Estrutura Contábil Completa
 * 
 * Cria as tabelas:
 * - fiscal_documents (unificada)
 * - fiscal_document_items  
 * - journal_entries
 * - journal_entry_lines
 * - financial_transactions
 * 
 * Implementa padrão Fiscal → Contábil → Financeiro
 */
export async function GET() {
  try {
    console.log("\n🚀 Iniciando Migration de Estrutura Contábil...\n");

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // 1️⃣ FISCAL DOCUMENTS (Unificada)
    console.log("1️⃣ Criando tabela fiscal_documents...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fiscal_documents')
      BEGIN
        CREATE TABLE fiscal_documents (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          organization_id BIGINT NOT NULL,
          branch_id BIGINT NOT NULL,
          
          -- Tipo e Identificação
          document_type VARCHAR(20) NOT NULL,
          document_number VARCHAR(50) NOT NULL,
          document_series VARCHAR(10),
          access_key VARCHAR(44),
          
          -- Parceiro
          partner_id BIGINT,
          partner_document VARCHAR(18),
          partner_name VARCHAR(200),
          
          -- Datas
          issue_date DATETIME NOT NULL,
          entry_date DATETIME,
          due_date DATETIME,
          
          -- Valores
          gross_amount DECIMAL(18,2) NOT NULL,
          tax_amount DECIMAL(18,2) DEFAULT 0.00,
          net_amount DECIMAL(18,2) NOT NULL,
          
          -- Classificação Fiscal
          fiscal_classification VARCHAR(50),
          cfop VARCHAR(4),
          operation_type VARCHAR(20),
          
          -- Status Triple
          fiscal_status VARCHAR(30) NOT NULL DEFAULT 'IMPORTED',
          accounting_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          financial_status VARCHAR(30) NOT NULL DEFAULT 'NO_TITLE',
          
          -- Rastreabilidade
          journal_entry_id BIGINT,
          
          -- XML/PDF
          xml_content NVARCHAR(MAX),
          xml_hash VARCHAR(64),
          pdf_url VARCHAR(500),
          
          -- Observações
          notes NVARCHAR(MAX),
          internal_notes NVARCHAR(MAX),
          
          -- Controle
          editable BIT NOT NULL DEFAULT 1,
          imported_from VARCHAR(50),
          
          -- Auditoria
          posted_at DATETIME,
          posted_by NVARCHAR(255),
          reversed_at DATETIME,
          reversed_by NVARCHAR(255),
          
          created_at DATETIME NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME NOT NULL DEFAULT GETDATE(),
          deleted_at DATETIME,
          created_by NVARCHAR(255) NOT NULL,
          updated_by NVARCHAR(255) NOT NULL,
          version INT NOT NULL DEFAULT 1
        );
        
        CREATE INDEX idx_fiscal_documents_org_branch ON fiscal_documents(organization_id, branch_id);
        CREATE INDEX idx_fiscal_documents_access_key ON fiscal_documents(access_key);
        CREATE INDEX idx_fiscal_documents_partner ON fiscal_documents(partner_id);
        CREATE INDEX idx_fiscal_documents_status ON fiscal_documents(accounting_status, financial_status);
        CREATE INDEX idx_fiscal_documents_issue_date ON fiscal_documents(issue_date);
        CREATE UNIQUE INDEX idx_fiscal_documents_access_key_unique ON fiscal_documents(access_key) WHERE access_key IS NOT NULL AND deleted_at IS NULL;
      END
    `);
    console.log("✅ fiscal_documents criada");

    // 2️⃣ FISCAL DOCUMENT ITEMS
    console.log("\n2️⃣ Criando tabela fiscal_document_items...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fiscal_document_items')
      BEGIN
        CREATE TABLE fiscal_document_items (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          fiscal_document_id BIGINT NOT NULL,
          organization_id BIGINT NOT NULL,
          
          -- Identificação
          item_number INT NOT NULL,
          product_id BIGINT,
          ncm_code VARCHAR(10),
          
          -- Descrição
          description VARCHAR(500) NOT NULL,
          additional_info NVARCHAR(MAX),
          
          -- Quantidades
          quantity DECIMAL(18,4) NOT NULL,
          unit VARCHAR(10) NOT NULL,
          unit_price DECIMAL(18,6) NOT NULL,
          
          -- Valores
          gross_amount DECIMAL(18,2) NOT NULL,
          discount_amount DECIMAL(18,2) DEFAULT 0.00,
          net_amount DECIMAL(18,2) NOT NULL,
          
          -- Impostos
          icms_amount DECIMAL(18,2) DEFAULT 0.00,
          icms_rate DECIMAL(5,2) DEFAULT 0.00,
          ipi_amount DECIMAL(18,2) DEFAULT 0.00,
          ipi_rate DECIMAL(5,2) DEFAULT 0.00,
          pis_amount DECIMAL(18,2) DEFAULT 0.00,
          pis_rate DECIMAL(5,2) DEFAULT 0.00,
          cofins_amount DECIMAL(18,2) DEFAULT 0.00,
          cofins_rate DECIMAL(5,2) DEFAULT 0.00,
          
          -- Classificação Fiscal
          cfop VARCHAR(4),
          cst_icms VARCHAR(3),
          cst_pis VARCHAR(2),
          cst_cofins VARCHAR(2),
          
          -- Classificação Contábil
          chart_account_id BIGINT,
          category_id BIGINT,
          cost_center_id BIGINT,
          
          -- Auditoria
          created_at DATETIME NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME NOT NULL DEFAULT GETDATE(),
          deleted_at DATETIME,
          version INT NOT NULL DEFAULT 1,
          
          FOREIGN KEY (fiscal_document_id) REFERENCES fiscal_documents(id)
        );
        
        CREATE INDEX idx_fiscal_document_items_doc ON fiscal_document_items(fiscal_document_id);
        CREATE INDEX idx_fiscal_document_items_ncm ON fiscal_document_items(ncm_code);
        CREATE INDEX idx_fiscal_document_items_product ON fiscal_document_items(product_id);
      END
    `);
    console.log("✅ fiscal_document_items criada");

    // 3️⃣ JOURNAL ENTRIES
    console.log("\n3️⃣ Criando tabela journal_entries...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'journal_entries')
      BEGIN
        CREATE TABLE journal_entries (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          organization_id BIGINT NOT NULL,
          branch_id BIGINT NOT NULL,
          
          -- Identificação
          entry_number VARCHAR(20) NOT NULL,
          entry_date DATETIME NOT NULL,
          
          -- Origem
          source_type VARCHAR(30) NOT NULL,
          source_id BIGINT,
          
          -- Descrição
          description VARCHAR(500) NOT NULL,
          notes NVARCHAR(MAX),
          
          -- Valores
          total_debit DECIMAL(18,2) NOT NULL,
          total_credit DECIMAL(18,2) NOT NULL,
          
          -- Status
          status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
          book_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
          
          -- Reversão
          reversed_by_entry_id BIGINT,
          reversal_of_entry_id BIGINT,
          
          -- Auditoria
          posted_at DATETIME,
          posted_by NVARCHAR(255),
          reversed_at DATETIME,
          reversed_by_user NVARCHAR(255),
          
          created_at DATETIME NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME NOT NULL DEFAULT GETDATE(),
          deleted_at DATETIME,
          created_by NVARCHAR(255) NOT NULL,
          updated_by NVARCHAR(255) NOT NULL,
          version INT NOT NULL DEFAULT 1
        );
        
        CREATE INDEX idx_journal_entries_org_branch ON journal_entries(organization_id, branch_id);
        CREATE INDEX idx_journal_entries_entry_number ON journal_entries(entry_number);
        CREATE INDEX idx_journal_entries_source ON journal_entries(source_type, source_id);
        CREATE INDEX idx_journal_entries_status ON journal_entries(status);
        CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
        CREATE UNIQUE INDEX idx_journal_entries_entry_number_unique ON journal_entries(organization_id, entry_number) WHERE deleted_at IS NULL;
      END
    `);
    console.log("✅ journal_entries criada");

    // 4️⃣ JOURNAL ENTRY LINES
    console.log("\n4️⃣ Criando tabela journal_entry_lines...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'journal_entry_lines')
      BEGIN
        CREATE TABLE journal_entry_lines (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          journal_entry_id BIGINT NOT NULL,
          organization_id BIGINT NOT NULL,
          
          -- Linha
          line_number INT NOT NULL,
          
          -- Conta Contábil
          chart_account_id BIGINT NOT NULL,
          
          -- Valores
          debit_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          
          -- Dimensões
          cost_center_id BIGINT,
          category_id BIGINT,
          partner_id BIGINT,
          project_id BIGINT,
          
          -- Descrição
          description VARCHAR(500),
          notes NVARCHAR(MAX),
          
          -- Auditoria
          created_at DATETIME NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME NOT NULL DEFAULT GETDATE(),
          version INT NOT NULL DEFAULT 1,
          
          FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
        );
        
        CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
        CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(chart_account_id);
        CREATE INDEX idx_journal_entry_lines_cost_center ON journal_entry_lines(cost_center_id);
      END
    `);
    console.log("✅ journal_entry_lines criada");

    // 5️⃣ FINANCIAL TRANSACTIONS
    console.log("\n5️⃣ Criando tabela financial_transactions...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'financial_transactions')
      BEGIN
        CREATE TABLE financial_transactions (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          organization_id BIGINT NOT NULL,
          branch_id BIGINT NOT NULL,
          
          -- Relacionamento
          transaction_type VARCHAR(20) NOT NULL,
          payable_id BIGINT,
          receivable_id BIGINT,
          
          -- Data e Método
          transaction_date DATETIME NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          bank_account_id BIGINT,
          
          -- Valores Detalhados
          original_amount DECIMAL(18,2) NOT NULL,
          interest_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          fine_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          iof_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          bank_fee_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          other_fees_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
          net_amount DECIMAL(18,2) NOT NULL,
          
          -- Lançamento Contábil
          journal_entry_id BIGINT,
          
          -- Conciliação
          reconciled_at DATETIME,
          reconciled_by NVARCHAR(255),
          bank_statement_id BIGINT,
          
          -- Observações
          notes NVARCHAR(MAX),
          document_number VARCHAR(50),
          
          -- Auditoria
          created_at DATETIME NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME NOT NULL DEFAULT GETDATE(),
          deleted_at DATETIME,
          created_by NVARCHAR(255) NOT NULL,
          updated_by NVARCHAR(255) NOT NULL,
          version INT NOT NULL DEFAULT 1
        );
        
        CREATE INDEX idx_financial_transactions_org_branch ON financial_transactions(organization_id, branch_id);
        CREATE INDEX idx_financial_transactions_payable ON financial_transactions(payable_id);
        CREATE INDEX idx_financial_transactions_receivable ON financial_transactions(receivable_id);
        CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
      END
    `);
    console.log("✅ financial_transactions criada");

    // 6️⃣ ADICIONAR FKs NAS TABELAS EXISTENTES
    console.log("\n6️⃣ Adicionando FK fiscal_document_id em accounts_payable...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts_payable') AND name = 'fiscal_document_id')
      BEGIN
        ALTER TABLE accounts_payable ADD fiscal_document_id BIGINT NULL;
        CREATE INDEX idx_accounts_payable_fiscal_doc ON accounts_payable(fiscal_document_id);
      END
    `);

    console.log("7️⃣ Adicionando FK fiscal_document_id em accounts_receivable...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts_receivable') AND name = 'fiscal_document_id')
      BEGIN
        ALTER TABLE accounts_receivable ADD fiscal_document_id BIGINT NULL;
        CREATE INDEX idx_accounts_receivable_fiscal_doc ON accounts_receivable(fiscal_document_id);
      END
    `);

    console.log("8️⃣ Adicionando FK journal_entry_id em accounts_payable...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts_payable') AND name = 'journal_entry_id')
      BEGIN
        ALTER TABLE accounts_payable ADD journal_entry_id BIGINT NULL;
        CREATE INDEX idx_accounts_payable_journal ON accounts_payable(journal_entry_id);
      END
    `);

    console.log("9️⃣ Adicionando FK journal_entry_id em accounts_receivable...");
    await db.execute(rawSql`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts_receivable') AND name = 'journal_entry_id')
      BEGIN
        ALTER TABLE accounts_receivable ADD journal_entry_id BIGINT NULL;
        CREATE INDEX idx_accounts_receivable_journal ON accounts_receivable(journal_entry_id);
      END
    `);

    console.log("\n✅ Migration concluída com sucesso!");
    console.log("\n📊 Resumo:");
    console.log("  ✅ fiscal_documents");
    console.log("  ✅ fiscal_document_items");
    console.log("  ✅ journal_entries");
    console.log("  ✅ journal_entry_lines");
    console.log("  ✅ financial_transactions");
    console.log("  ✅ FKs adicionadas em accounts_payable");
    console.log("  ✅ FKs adicionadas em accounts_receivable\n");

    return NextResponse.json({
      success: true,
      message: "Migration de estrutura contábil executada com sucesso",
      tables: [
        "fiscal_documents",
        "fiscal_document_items",
        "journal_entries",
        "journal_entry_lines",
        "financial_transactions",
      ],
      alterations: [
        "accounts_payable.fiscal_document_id",
        "accounts_payable.journal_entry_id",
        "accounts_receivable.fiscal_document_id",
        "accounts_receivable.journal_entry_id",
      ],
    });
  } catch (error: unknown) {
    console.error("❌ Erro na migration:", error);
    return NextResponse.json(
      { error: errorMessage, stack: (error instanceof Error ? error.stack : undefined) },
      { status: 500 }
    );
  }
}
