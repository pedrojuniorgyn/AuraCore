/**
 * API TEMPORÁRIA: Executar Migration DDA
 * DELETE APÓS EXECUTAR!
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql as drizzleSql } from "drizzle-orm";

export async function POST() {
  try {
    console.log("📄 Executando migration DDA inbox...");

    // Criar tabela financial_dda_inbox
    await db.execute(drizzleSql.raw(`
      CREATE TABLE financial_dda_inbox (
        id int IDENTITY(1,1) PRIMARY KEY,
        organization_id int NOT NULL,
        bank_account_id int NOT NULL,
        
        external_id nvarchar(255) NOT NULL,
        beneficiary_name nvarchar(255) NOT NULL,
        beneficiary_document nvarchar(20) NOT NULL,
        
        amount decimal(18, 2) NOT NULL,
        due_date datetime2 NOT NULL,
        issue_date datetime2,
        
        barcode nvarchar(100) NOT NULL,
        digitable_line nvarchar(100),
        
        status nvarchar(20) DEFAULT 'PENDING',
        matched_payable_id int,
        match_score int DEFAULT 0,
        
        notes nvarchar(max),
        dismissed_reason nvarchar(255),
        
        created_at datetime2 DEFAULT GETDATE(),
        updated_at datetime2 DEFAULT GETDATE(),
        deleted_at datetime2,
        
        CONSTRAINT FK_financial_dda_inbox_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        CONSTRAINT FK_financial_dda_inbox_bank_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
        CONSTRAINT FK_financial_dda_inbox_payable FOREIGN KEY (matched_payable_id) REFERENCES accounts_payable(id)
      );
    `));

    // Criar índices
    await db.execute(drizzleSql.raw(`
      CREATE UNIQUE INDEX idx_dda_external_id ON financial_dda_inbox(external_id, bank_account_id) WHERE deleted_at IS NULL;
    `));
    await db.execute(drizzleSql.raw(`
      CREATE INDEX idx_dda_status ON financial_dda_inbox(status);
    `));
    await db.execute(drizzleSql.raw(`
      CREATE INDEX idx_dda_due_date ON financial_dda_inbox(due_date);
    `));
    await db.execute(drizzleSql.raw(`
      CREATE INDEX idx_dda_org_bank ON financial_dda_inbox(organization_id, bank_account_id);
    `));
    await db.execute(drizzleSql.raw(`
      CREATE INDEX idx_dda_beneficiary_doc ON financial_dda_inbox(beneficiary_document);
    `));

    // Adicionar campo barcode à accounts_payable (se não existir)
    try {
      await db.execute(drizzleSql.raw(`
        ALTER TABLE accounts_payable ADD barcode nvarchar(100);
      `));
    } catch (e) {
      console.log("Campo barcode já existe, pulando...");
    }

    console.log("✅ Migration DDA executada com sucesso!");

    return NextResponse.json({
      success: true,
      message: "Migration DDA executada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro na migration:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}


