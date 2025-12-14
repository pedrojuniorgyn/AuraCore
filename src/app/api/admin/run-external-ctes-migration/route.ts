import { NextResponse } from "next/server";

/**
 * 🔧 MIGRATION: Tabela external_ctes
 * 
 * Cria tabela para armazenar CTes externos (Multicte/bsoft)
 * importados via SEFAZ
 */
export async function POST() {
  try {
    const { ensureConnection, pool } = await import("@/lib/db");
    await ensureConnection();

    console.log("🚀 Executando migration: external_ctes...");

    // 1. Criar tabela external_ctes
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='external_ctes' AND xtype='U')
      BEGIN
        CREATE TABLE external_ctes (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL FOREIGN KEY REFERENCES organizations(id) ON DELETE CASCADE,
          branch_id INT NOT NULL FOREIGN KEY REFERENCES branches(id),
          
          -- Dados do CTe
          access_key NVARCHAR(44) NOT NULL,
          cte_number NVARCHAR(20),
          series NVARCHAR(10),
          model NVARCHAR(2) DEFAULT '57',
          issue_date DATETIME2 NOT NULL,
          
          -- Emitente (Transportadora externa)
          issuer_cnpj NVARCHAR(14) NOT NULL,
          issuer_name NVARCHAR(255) NOT NULL,
          issuer_ie NVARCHAR(20),
          
          -- Remetente
          sender_cnpj NVARCHAR(14),
          sender_name NVARCHAR(255),
          
          -- Destinatário
          recipient_cnpj NVARCHAR(14),
          recipient_name NVARCHAR(255),
          
          -- Expedidor
          shipper_cnpj NVARCHAR(14),
          shipper_name NVARCHAR(255),
          
          -- Recebedor
          receiver_cnpj NVARCHAR(14),
          receiver_name NVARCHAR(255),
          
          -- Origem e Destino
          origin_city NVARCHAR(100),
          origin_uf NVARCHAR(2),
          destination_city NVARCHAR(100),
          destination_uf NVARCHAR(2),
          
          -- Valores
          total_value DECIMAL(18, 2),
          cargo_value DECIMAL(18, 2),
          icms_value DECIMAL(18, 2),
          
          -- Carga
          weight DECIMAL(10, 3),
          volume DECIMAL(10, 3),
          
          -- NFe vinculada
          linked_nfe_key NVARCHAR(44),
          
          -- Vínculo com cargo_documents
          cargo_document_id INT FOREIGN KEY REFERENCES cargo_documents(id),
          
          -- XML
          xml_content NVARCHAR(MAX),
          xml_hash NVARCHAR(64),
          
          -- Status
          status NVARCHAR(20) DEFAULT 'IMPORTED',
          import_source NVARCHAR(50) DEFAULT 'SEFAZ_AUTO',
          
          -- Enterprise Base
          created_by NVARCHAR(255) NOT NULL,
          updated_by NVARCHAR(255),
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          deleted_at DATETIME2,
          version INT DEFAULT 1
        );
        
        PRINT '✅ Tabela external_ctes criada';
      END
      ELSE
      BEGIN
        PRINT '⚠️  Tabela external_ctes já existe';
      END
    `);

    // 2. Criar índices
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_external_ctes_access_key' AND object_id = OBJECT_ID('external_ctes'))
      BEGIN
        CREATE INDEX idx_external_ctes_access_key ON external_ctes(access_key);
        PRINT '✅ Índice idx_external_ctes_access_key criado';
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_external_ctes_linked_nfe_key' AND object_id = OBJECT_ID('external_ctes'))
      BEGIN
        CREATE INDEX idx_external_ctes_linked_nfe_key ON external_ctes(linked_nfe_key);
        PRINT '✅ Índice idx_external_ctes_linked_nfe_key criado';
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_external_ctes_cargo_document_id' AND object_id = OBJECT_ID('external_ctes'))
      BEGIN
        CREATE INDEX idx_external_ctes_cargo_document_id ON external_ctes(cargo_document_id);
        PRINT '✅ Índice idx_external_ctes_cargo_document_id criado';
      END
    `);

    console.log("✅ Migration external_ctes concluída!");

    return NextResponse.json({
      success: true,
      message: "Migration external_ctes executada com sucesso!",
    });

  } catch (error: any) {
    console.error("❌ Erro na migration:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}














