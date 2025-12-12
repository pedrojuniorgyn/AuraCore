-- ==========================================
-- MIGRATION: MARATONA COMPLETA - TODAS AS TABELAS
-- Data: 08/12/2025
-- Versão: 1.0.0
-- ==========================================

-- ONDA 2: TMS
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'trip_checkpoints')
BEGIN
    CREATE TABLE trip_checkpoints (
        id INT IDENTITY(1,1) PRIMARY KEY,
        trip_id INT NOT NULL,
        checkpoint_type NVARCHAR(50) NOT NULL,
        description NVARCHAR(500),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        location_address NVARCHAR(500),
        recorded_at DATETIME2 NOT NULL,
        recorded_by NVARCHAR(255),
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ trip_checkpoints criada';
END
ELSE
    PRINT '⚠️  trip_checkpoints já existe';

-- ONDA 2: Conciliação
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
        created_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    PRINT '✅ bank_transactions criada';
END
ELSE
    PRINT '⚠️  bank_transactions já existe';

-- ONDA 3: CRM
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'crm_leads')
BEGIN
    CREATE TABLE crm_leads (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        company_name NVARCHAR(255) NOT NULL,
        cnpj NVARCHAR(18),
        contact_name NVARCHAR(255),
        contact_email NVARCHAR(255),
        contact_phone NVARCHAR(20),
        segment NVARCHAR(50),
        source NVARCHAR(50),
        stage NVARCHAR(50) NOT NULL DEFAULT 'PROSPECTING',
        score INT DEFAULT 0,
        estimated_value DECIMAL(18,2),
        estimated_monthly_shipments INT,
        expected_close_date DATETIME2,
        probability INT,
        owner_id NVARCHAR(255) NOT NULL,
        status NVARCHAR(20) DEFAULT 'ACTIVE',
        lost_reason NVARCHAR(500),
        won_date DATETIME2,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    PRINT '✅ crm_leads criada';
END
ELSE
    PRINT '⚠️  crm_leads já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'crm_activities')
BEGIN
    CREATE TABLE crm_activities (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        lead_id INT,
        partner_id INT,
        type NVARCHAR(50) NOT NULL,
        subject NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        scheduled_at DATETIME2,
        completed_at DATETIME2,
        status NVARCHAR(20) DEFAULT 'PENDING',
        assigned_to NVARCHAR(255),
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ crm_activities criada';
END
ELSE
    PRINT '⚠️  crm_activities já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'commercial_proposals')
BEGIN
    CREATE TABLE commercial_proposals (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        proposal_number NVARCHAR(20) NOT NULL,
        lead_id INT,
        partner_id INT,
        status NVARCHAR(20) DEFAULT 'DRAFT',
        routes NVARCHAR(MAX),
        prices NVARCHAR(MAX),
        conditions NVARCHAR(MAX),
        validity_days INT DEFAULT 15,
        pdf_url NVARCHAR(500),
        sent_at DATETIME2,
        sent_to_email NVARCHAR(255),
        accepted_at DATETIME2,
        rejected_at DATETIME2,
        rejection_reason NVARCHAR(500),
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ commercial_proposals criada';
END
ELSE
    PRINT '⚠️  commercial_proposals já existe';

-- ONDA 4: Pneus
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tires')
BEGIN
    CREATE TABLE tires (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        serial_number NVARCHAR(50) NOT NULL,
        brand_id INT,
        model NVARCHAR(100),
        size NVARCHAR(20),
        purchase_date DATETIME2,
        purchase_price DECIMAL(18,2),
        status NVARCHAR(20) DEFAULT 'STOCK',
        current_vehicle_id INT,
        position NVARCHAR(20),
        initial_mileage INT,
        current_mileage INT,
        total_km_used INT,
        recapping_count INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2
    );
    PRINT '✅ tires criada';
END
ELSE
    PRINT '⚠️  tires já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tire_movements')
BEGIN
    CREATE TABLE tire_movements (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tire_id INT NOT NULL,
        movement_type NVARCHAR(20) NOT NULL,
        from_vehicle_id INT,
        from_position NVARCHAR(20),
        to_vehicle_id INT,
        to_position NVARCHAR(20),
        mileage_at_movement INT,
        notes NVARCHAR(500),
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ tire_movements criada';
END
ELSE
    PRINT '⚠️  tire_movements já existe';

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
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ vehicle_maintenance_plans criada';
END
ELSE
    PRINT '⚠️  vehicle_maintenance_plans já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fuel_transactions')
BEGIN
    CREATE TABLE fuel_transactions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        driver_id INT,
        transaction_date DATETIME2 NOT NULL,
        fuel_type NVARCHAR(20),
        liters DECIMAL(10,2) NOT NULL,
        price_per_liter DECIMAL(10,2),
        total_value DECIMAL(18,2) NOT NULL,
        odometer INT,
        station_name NVARCHAR(255),
        station_cnpj NVARCHAR(18),
        source NVARCHAR(20),
        nfe_key NVARCHAR(44),
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ fuel_transactions criada';
END
ELSE
    PRINT '⚠️  fuel_transactions já existe';

-- ONDA 5: Jornada
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'driver_work_shifts')
BEGIN
    CREATE TABLE driver_work_shifts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        driver_id INT NOT NULL,
        trip_id INT,
        shift_date DATETIME2 NOT NULL,
        started_at DATETIME2,
        ended_at DATETIME2,
        total_driving_hours DECIMAL(5,2),
        total_rest_hours DECIMAL(5,2),
        total_waiting_hours DECIMAL(5,2),
        status NVARCHAR(20) DEFAULT 'IN_PROGRESS',
        violations NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ driver_work_shifts criada';
END
ELSE
    PRINT '⚠️  driver_work_shifts já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'driver_shift_events')
BEGIN
    CREATE TABLE driver_shift_events (
        id INT IDENTITY(1,1) PRIMARY KEY,
        work_shift_id INT NOT NULL,
        event_type NVARCHAR(20) NOT NULL,
        event_time DATETIME2 NOT NULL,
        source NVARCHAR(20) DEFAULT 'MANUAL',
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ driver_shift_events criada';
END
ELSE
    PRINT '⚠️  driver_shift_events já existe';

-- ONDA 6: WMS
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'warehouse_zones')
BEGIN
    CREATE TABLE warehouse_zones (
        id INT IDENTITY(1,1) PRIMARY KEY,
        warehouse_id INT NOT NULL,
        zone_name NVARCHAR(100) NOT NULL,
        zone_type NVARCHAR(20),
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ warehouse_zones criada';
END
ELSE
    PRINT '⚠️  warehouse_zones já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'warehouse_locations')
BEGIN
    CREATE TABLE warehouse_locations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        zone_id INT NOT NULL,
        code NVARCHAR(20) NOT NULL UNIQUE,
        location_type NVARCHAR(20),
        max_weight_kg DECIMAL(10,2),
        status NVARCHAR(20) DEFAULT 'AVAILABLE',
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ warehouse_locations criada';
END
ELSE
    PRINT '⚠️  warehouse_locations já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stock_locations')
BEGIN
    CREATE TABLE stock_locations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        location_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        lot_number NVARCHAR(50),
        expiry_date DATETIME2,
        received_at DATETIME2
    );
    PRINT '✅ stock_locations criada';
END
ELSE
    PRINT '⚠️  stock_locations já existe';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'warehouse_movements')
BEGIN
    CREATE TABLE warehouse_movements (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        movement_type NVARCHAR(20) NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        from_location_id INT,
        to_location_id INT,
        reference_type NVARCHAR(50),
        reference_id INT,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT '✅ warehouse_movements criada';
END
ELSE
    PRINT '⚠️  warehouse_movements já existe';

PRINT '';
PRINT '==========================================';
PRINT '✅ MIGRATION COMPLETA!';
PRINT '==========================================';
PRINT 'Total: 14 tabelas verificadas/criadas';
PRINT '';














