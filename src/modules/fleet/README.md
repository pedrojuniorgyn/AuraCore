# Fleet Module

## Overview
Gateway module for fleet management operations. Provides vehicle service integration and maintenance alert scheduling.

## Architecture
```
fleet/
├── domain/
│   └── ports/
│       └── output/
│           └── IVehicleServiceGateway.ts
└── infrastructure/
    ├── adapters/
    │   └── VehicleServiceAdapter.ts
    ├── di/
    │   ├── FleetModule.ts
    │   ├── tokens.ts
    │   └── index.ts
    └── jobs/
        └── CheckMaintenanceAlertsJob.ts
```

## DDD Patterns
- **Output Port**: IVehicleServiceGateway
- **Adapter**: VehicleServiceAdapter (wraps legacy vehicle-service)
- **DI Token**: FLEET_TOKENS.VehicleServiceGateway
- **CRON Job**: CheckMaintenanceAlertsJob (maintenance alerts)

## Future Evolution
To evolve into a full DDD module, add:
- domain/entities/ (Vehicle, Driver, MaintenancePlan, WorkOrder)
- domain/value-objects/ (VehicleStatus, MaintenanceType, FuelType)
- application/commands/ (ScheduleMaintenance, RegisterFuelEntry)
- application/queries/ (ListVehicles, GetDriverSchedule)
- infrastructure/persistence/ (DrizzleVehicleRepository)

## Status: E9 Fase 2 (Gateway + Job)
