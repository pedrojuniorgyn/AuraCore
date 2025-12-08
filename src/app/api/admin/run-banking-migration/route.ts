/**
 * API TEMPORÁRIA: Executar Migration Banking CNAB
 * DELETE APÓS EXECUTAR!
 */

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { db } from "@/lib/db";
import { sql as drizzleSql } from "drizzle-orm";

export async function POST() {
  try {
    console.log("📄 Executando migration banking_cnab...");

    // Adicionar campos CNAB à tabela bank_accounts
    await db.execute(drizzleSql.raw(`
      ALTER TABLE bank_accounts ADD account_digit nvarchar(2);
    `));
    await db.execute(drizzleSql.raw(`
      ALTER TABLE bank_accounts ADD wallet nvarchar(20);
    `));
    await db.execute(drizzleSql.raw(`
      ALTER TABLE bank_accounts ADD agreement_number nvarchar(50);
    `));
    await db.execute(drizzleSql.raw(`
      ALTER TABLE bank_accounts ADD cnab_layout nvarchar(20) DEFAULT 'CNAB240';
    `));
    await db.execute(drizzleSql.raw(`
      ALTER TABLE bank_accounts ADD next_remittance_number int DEFAULT 1;
    `));

    // Criar tabela bank_remittances
    await db.execute(drizzleSql.raw(`
      CREATE TABLE bank_remittances (
        id int IDENTITY(1,1) PRIMARY KEY,
        organization_id int NOT NULL,
        bank_account_id int NOT NULL,
        
        file_name nvarchar(255) NOT NULL,
        content nvarchar(max) NOT NULL,
        remittance_number int NOT NULL,
        
        type nvarchar(20) NOT NULL,
        status nvarchar(50) DEFAULT 'GENERATED',
        
        total_records int DEFAULT 0,
        total_amount decimal(18, 2) DEFAULT 0.00,
        
        notes nvarchar(max),
        processed_at datetime2,
        
        created_by nvarchar(255) NOT NULL,
        created_at datetime2 DEFAULT GETDATE(),
        deleted_at datetime2,
        
        CONSTRAINT FK_bank_remittances_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        CONSTRAINT FK_bank_remittances_bank_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
      );
    `));

    // Criar índices
    await db.execute(drizzleSql.raw(`
      CREATE INDEX idx_bank_remittances_org_bank ON bank_remittances(organization_id, bank_account_id);
    `));
    await db.execute(drizzleSql.raw(`
      CREATE INDEX idx_bank_remittances_status ON bank_remittances(status);
    `));
    await db.execute(drizzleSql.raw(`
      CREATE INDEX idx_bank_remittances_created_at ON bank_remittances(created_at DESC);
    `));

    console.log("✅ Migration banking_cnab executada com sucesso!");

    return NextResponse.json({
      success: true,
      message: "Migration banking_cnab executada com sucesso!",
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


