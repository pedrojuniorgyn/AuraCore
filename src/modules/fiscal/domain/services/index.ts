/**
 * Fiscal Domain Services - Public Exports
 * 
 * E7.4.1 Reforma Tributária 2026
 */

// Tax Engines (from engines directory)
export * from '../tax/engines/CurrentTaxEngine';
export * from '../tax/engines/TransitionTaxEngine';
export * from '../tax/engines/NewTaxEngine';
export * from '../tax/engines/TaxEngineFactory';

// Domain Services - TODO: Implementar quando necessário
// export * from '../tax/services/IbsCbsCalculationService';
// export * from '../tax/services/TaxComparisonService';
// export * from '../tax/services/CompensationCalculationService';

