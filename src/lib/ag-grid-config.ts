"use client";

import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";

// Registrar todos os módulos Community do AG Grid
// Isso deve ser feito UMA ÚNICA VEZ na aplicação
ModuleRegistry.registerModules([AllCommunityModule]);

// Export para garantir que o arquivo seja importado
export const agGridConfigured = true;

