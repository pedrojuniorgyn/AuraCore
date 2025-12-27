import { NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("🚀 Iniciando Migração Final - Ondas Pendentes...");
    
    await ensureConnection();

    // ==========================================
    // 💰 CONCILIAÇÃO BANCÁRIA (ONDA 2.3)
    // ==========================================
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bank_transactions')
      BEGIN
        CREATE TABLE bank_transactions (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          bank_account_id INT NOT NULL,
          
          transaction_date DATETIME2 NOT NULL,
          description NVARCHAR(500),
          amount DECIMAL(18,2) NOT NULL,
          balance DECIMAL(18,2),
          
          transaction_type NVARCHAR(20),
          
          reconciled NVARCHAR(1) DEFAULT 'N',
          reconciled_at DATETIME2,
          reconciled_by NVARCHAR(255),
          
          accounts_payable_id INT,
          accounts_receivable_id INT,
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela bank_transactions criada';
      END
      ELSE
        PRINT '⚠️ Tabela bank_transactions já existe';
    `);

    // ==========================================
    // 🔧 PLANO DE MANUTENÇÃO (ONDA 4.2)
    // ==========================================
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vehicle_maintenance_plans')
      BEGIN
        CREATE TABLE vehicle_maintenance_plans (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          vehicle_model NVARCHAR(100),
          
          service_name NVARCHAR(255) NOT NULL,
          service_description NVARCHAR(500),
          
          trigger_type NVARCHAR(20) NOT NULL,
          
          mileage_interval INT,
          time_interval_months INT,
          
          advance_warning_km INT,
          advance_warning_days INT,
          
          is_active NVARCHAR(1) DEFAULT 'S',
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela vehicle_maintenance_plans criada';
      END
      ELSE
        PRINT '⚠️ Tabela vehicle_maintenance_plans já existe';
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'maintenance_alerts')
      BEGIN
        CREATE TABLE maintenance_alerts (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          vehicle_id INT NOT NULL,
          maintenance_plan_id INT NOT NULL,
          
          alert_type NVARCHAR(20) NOT NULL,
          alert_message NVARCHAR(500) NOT NULL,
          
          current_odometer INT,
          next_service_odometer INT,
          
          current_check_date DATETIME2,
          next_service_date DATETIME2,
          
          status NVARCHAR(20) DEFAULT 'ACTIVE',
          
          dismissed_at DATETIME2,
          dismissed_by NVARCHAR(255),
          
          created_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela maintenance_alerts criada';
      END
      ELSE
        PRINT '⚠️ Tabela maintenance_alerts já existe';
    `);

    // ==========================================
    // 🛠️ ORDENS DE SERVIÇO (ONDA 4.4)
    // ==========================================
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mechanics')
      BEGIN
        CREATE TABLE mechanics (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          name NVARCHAR(255) NOT NULL,
          specialty NVARCHAR(100),
          
          hourly_rate DECIMAL(18,2),
          
          status NVARCHAR(20) DEFAULT 'ACTIVE',
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          deleted_at DATETIME2
        );
        PRINT '✅ Tabela mechanics criada';
      END
      ELSE
        PRINT '⚠️ Tabela mechanics já existe';
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'maintenance_providers')
      BEGIN
        CREATE TABLE maintenance_providers (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          name NVARCHAR(255) NOT NULL,
          cnpj NVARCHAR(18),
          contact_name NVARCHAR(255),
          phone NVARCHAR(20),
          
          specialty NVARCHAR(100),
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          deleted_at DATETIME2
        );
        PRINT '✅ Tabela maintenance_providers criada';
      END
      ELSE
        PRINT '⚠️ Tabela maintenance_providers já existe';
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'maintenance_work_orders')
      BEGIN
        CREATE TABLE maintenance_work_orders (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          wo_number NVARCHAR(20) NOT NULL,
          
          vehicle_id INT NOT NULL,
          
          wo_type NVARCHAR(20) NOT NULL,
          
          priority NVARCHAR(20) DEFAULT 'NORMAL',
          
          reported_by_driver_id INT,
          reported_issue NVARCHAR(500),
          
          odometer INT,
          
          status NVARCHAR(20) DEFAULT 'OPEN',
          
          provider_type NVARCHAR(20),
          provider_id INT,
          
          opened_at DATETIME2 DEFAULT GETDATE(),
          started_at DATETIME2,
          completed_at DATETIME2,
          
          total_labor_cost DECIMAL(18,2),
          total_parts_cost DECIMAL(18,2),
          total_cost DECIMAL(18,2),
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          deleted_at DATETIME2
        );
        PRINT '✅ Tabela maintenance_work_orders criada';
      END
      ELSE
        PRINT '⚠️ Tabela maintenance_work_orders já existe';
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'work_order_items')
      BEGIN
        CREATE TABLE work_order_items (
          id INT IDENTITY(1,1) PRIMARY KEY,
          work_order_id INT NOT NULL,
          
          item_type NVARCHAR(20) NOT NULL,
          
          product_id INT,
          service_description NVARCHAR(255),
          
          quantity DECIMAL(10,2) NOT NULL,
          unit_cost DECIMAL(18,2),
          total_cost DECIMAL(18,2),
          
          created_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela work_order_items criada';
      END
      ELSE
        PRINT '⚠️ Tabela work_order_items já existe';
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'work_order_mechanics')
      BEGIN
        CREATE TABLE work_order_mechanics (
          id INT IDENTITY(1,1) PRIMARY KEY,
          work_order_id INT NOT NULL,
          mechanic_id INT NOT NULL,
          
          assigned_at DATETIME2 DEFAULT GETDATE(),
          started_at DATETIME2,
          completed_at DATETIME2,
          
          hours_worked DECIMAL(5,2),
          labor_cost DECIMAL(18,2),
          
          notes NVARCHAR(500)
        );
        PRINT '✅ Tabela work_order_mechanics criada';
      END
      ELSE
        PRINT '⚠️ Tabela work_order_mechanics já existe';
    `);

    // ==========================================
    // 📜 MANIFESTAÇÃO NFE (ONDA 5.2)
    // ==========================================
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'nfe_manifestation_events')
      BEGIN
        CREATE TABLE nfe_manifestation_events (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          inbound_invoice_id INT NOT NULL,
          
          event_type NVARCHAR(10) NOT NULL,
          event_description NVARCHAR(100),
          justification NVARCHAR(500),
          
          protocol_number NVARCHAR(20),
          status NVARCHAR(20) DEFAULT 'PENDING',
          sefaz_return_code NVARCHAR(10),
          sefaz_return_message NVARCHAR(500),
          
          sent_at DATETIME2,
          confirmed_at DATETIME2,
          
          xml_event NVARCHAR(MAX),
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela nfe_manifestation_events criada';
      END
      ELSE
        PRINT '⚠️ Tabela nfe_manifestation_events já existe';
    `);

    // ==========================================
    // 📐 CONVERSÃO DE UNIDADE (ONDA 5.3)
    // ==========================================
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_unit_conversions')
      BEGIN
        CREATE TABLE product_unit_conversions (
          id INT IDENTITY(1,1) PRIMARY KEY,
          product_id INT NOT NULL,
          
          from_unit NVARCHAR(10) NOT NULL,
          to_unit NVARCHAR(10) NOT NULL,
          factor DECIMAL(10,4) NOT NULL,
          
          created_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela product_unit_conversions criada';
      END
      ELSE
        PRINT '⚠️ Tabela product_unit_conversions já existe';
    `);

    // Adicionar campos de conversão em products
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'products') AND name = 'unit_conversion_enabled')
      BEGIN
        ALTER TABLE products ADD
          unit_conversion_enabled NVARCHAR(1) DEFAULT 'N',
          unit_conversion_factor DECIMAL(10,4),
          primary_unit NVARCHAR(10),
          secondary_unit NVARCHAR(10);
        PRINT '✅ Campos de conversão adicionados em products';
      END
      ELSE
        PRINT '⚠️ Campos de conversão já existem em products';
    `);

    // ==========================================
    // 📦 INVENTÁRIO WMS (ONDA 6.3)
    // ==========================================
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'warehouse_inventory_counts')
      BEGIN
        CREATE TABLE warehouse_inventory_counts (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          warehouse_id INT NOT NULL,
          
          count_number NVARCHAR(20) NOT NULL,
          count_date DATETIME2 NOT NULL,
          
          count_type NVARCHAR(20) NOT NULL,
          
          status NVARCHAR(20) DEFAULT 'IN_PROGRESS',
          
          notes NVARCHAR(500),
          
          started_by NVARCHAR(255) NOT NULL,
          started_at DATETIME2 DEFAULT GETDATE(),
          completed_at DATETIME2,
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela warehouse_inventory_counts criada';
      END
      ELSE
        PRINT '⚠️ Tabela warehouse_inventory_counts já existe';
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'inventory_count_items')
      BEGIN
        CREATE TABLE inventory_count_items (
          id INT IDENTITY(1,1) PRIMARY KEY,
          count_id INT NOT NULL,
          
          location_id INT,
          product_id INT NOT NULL,
          
          system_quantity DECIMAL(18,4),
          counted_quantity DECIMAL(18,4),
          difference DECIMAL(18,4),
          
          lot_number NVARCHAR(50),
          expiry_date DATETIME2,
          
          counted_by NVARCHAR(255),
          counted_at DATETIME2,
          
          notes NVARCHAR(500),
          
          created_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela inventory_count_items criada';
      END
      ELSE
        PRINT '⚠️ Tabela inventory_count_items já existe';
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'inventory_adjustments')
      BEGIN
        CREATE TABLE inventory_adjustments (
          id INT IDENTITY(1,1) PRIMARY KEY,
          organization_id INT NOT NULL,
          
          count_id INT,
          
          adjustment_number NVARCHAR(20) NOT NULL,
          adjustment_date DATETIME2 NOT NULL,
          
          product_id INT NOT NULL,
          location_id INT,
          
          quantity_before DECIMAL(18,4),
          quantity_adjusted DECIMAL(18,4),
          quantity_after DECIMAL(18,4),
          
          reason NVARCHAR(20) NOT NULL,
          
          notes NVARCHAR(500),
          
          approved_by NVARCHAR(255),
          approved_at DATETIME2,
          
          created_by NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE()
        );
        PRINT '✅ Tabela inventory_adjustments criada';
      END
      ELSE
        PRINT '⚠️ Tabela inventory_adjustments já existe';
    `);

    console.log("✅ Migração Final concluída com sucesso!");

    return NextResponse.json({
      success: true,
      message: "Migração Final executada com sucesso! Todas as Ondas Pendentes implementadas! 🎉",
      tables: [
        "bank_transactions",
        "vehicle_maintenance_plans",
        "maintenance_alerts",
        "mechanics",
        "maintenance_providers",
        "maintenance_work_orders",
        "work_order_items",
        "work_order_mechanics",
        "nfe_manifestation_events",
        "product_unit_conversions",
        "warehouse_inventory_counts",
        "inventory_count_items",
        "inventory_adjustments",
      ],
    });
  } catch (error: unknown) {
    console.error("❌ Erro na Migração Final:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

