import { NextResponse } from "next/server";
import { sql as rawSql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🔧 HOTFIX: Compatibilizar colunas *_by do módulo contábil
 *
 * Problema: tabelas contábeis foram criadas com BIGINT em created_by/updated_by/posted_by etc,
 * mas o sistema usa userId UUID string (NVARCHAR) no NextAuth/users.id.
 *
 * Esta rota converte as colunas para NVARCHAR(255) quando necessário.
 *
 * Segurança: /api/admin/* já é protegido por middleware (ADMIN).
 */
export async function GET() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    await db.execute(rawSql`
      -- fiscal_documents
      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'fiscal_documents')
          AND c.name = 'created_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE fiscal_documents ALTER COLUMN created_by NVARCHAR(255) NOT NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'fiscal_documents')
          AND c.name = 'updated_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE fiscal_documents ALTER COLUMN updated_by NVARCHAR(255) NOT NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'fiscal_documents')
          AND c.name = 'posted_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE fiscal_documents ALTER COLUMN posted_by NVARCHAR(255) NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'fiscal_documents')
          AND c.name = 'reversed_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE fiscal_documents ALTER COLUMN reversed_by NVARCHAR(255) NULL;
      END

      -- journal_entries
      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'journal_entries')
          AND c.name = 'created_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE journal_entries ALTER COLUMN created_by NVARCHAR(255) NOT NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'journal_entries')
          AND c.name = 'updated_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE journal_entries ALTER COLUMN updated_by NVARCHAR(255) NOT NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'journal_entries')
          AND c.name = 'posted_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE journal_entries ALTER COLUMN posted_by NVARCHAR(255) NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'journal_entries')
          AND c.name = 'reversed_by_user'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE journal_entries ALTER COLUMN reversed_by_user NVARCHAR(255) NULL;
      END

      -- financial_transactions
      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'financial_transactions')
          AND c.name = 'created_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE financial_transactions ALTER COLUMN created_by NVARCHAR(255) NOT NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'financial_transactions')
          AND c.name = 'updated_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE financial_transactions ALTER COLUMN updated_by NVARCHAR(255) NOT NULL;
      END

      IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'financial_transactions')
          AND c.name = 'reconciled_by'
          AND t.name = 'bigint'
      )
      BEGIN
        ALTER TABLE financial_transactions ALTER COLUMN reconciled_by NVARCHAR(255) NULL;
      END
    `);

    return NextResponse.json({
      success: true,
      message: "Colunas *_by do módulo contábil compatibilizadas para NVARCHAR(255) (quando aplicável).",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

