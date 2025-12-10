import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    console.log("🔧 Criando tabela notifications...");

    // Verificar se tabela já existe
    const tableCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'notifications'
    `);

    const tableExists = (tableCheck as any)[0]?.count > 0;

    if (tableExists) {
      console.log("⚠️  Tabela notifications já existe, pulando...");
      return NextResponse.json({
        success: true,
        message: "Tabela notifications já existe",
      });
    }

    // Criar tabela sem foreign keys primeiro
    await db.execute(sql`
      CREATE TABLE notifications (
        id INT PRIMARY KEY IDENTITY(1,1),
        organization_id INT NOT NULL,
        branch_id INT,
        user_id NVARCHAR(255),
        
        type NVARCHAR(20) NOT NULL CHECK (type IN ('SUCCESS', 'ERROR', 'WARNING', 'INFO')),
        event NVARCHAR(100) NOT NULL,
        
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(MAX),
        data NVARCHAR(MAX),
        action_url NVARCHAR(500),
        
        is_read INT DEFAULT 0,
        read_at DATETIME2,
        created_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    console.log("✅ Tabela notifications criada!");

    // Criar índices
    try {
      await db.execute(sql`
        CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC)
      `);
      console.log("✅ Índice user criado!");
    } catch (e) {
      console.log("⚠️  Índice user já existe");
    }

    try {
      await db.execute(sql`
        CREATE INDEX idx_notifications_org ON notifications(organization_id, created_at DESC)
      `);
      console.log("✅ Índice org criado!");
    } catch (e) {
      console.log("⚠️  Índice org já existe");
    }

    try {
      await db.execute(sql`
        CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC)
      `);
      console.log("✅ Índice type criado!");
    } catch (e) {
      console.log("⚠️  Índice type já existe");
    }

    console.log("✅ Tabela notifications criada com sucesso!");

    return NextResponse.json({
      success: true,
      message: "Tabela notifications criada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar tabela:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

