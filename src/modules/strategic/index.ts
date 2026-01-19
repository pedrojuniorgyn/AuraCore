/**
 * Módulo Strategic - Gestão Estratégica e Qualidade Total
 * 
 * Este módulo implementa:
 * - BSC (Balanced Scorecard) com 4 perspectivas
 * - Desdobramento de metas (CEO → DIRECTOR → MANAGER → TEAM)
 * - Planos de ação 5W2H com ciclo PDCA
 * - Follow-up 3G (GEMBA/GEMBUTSU/GENJITSU) - Metodologia Falconi
 * - War Room para reuniões executivas
 * - Banco de ideias para melhoria contínua
 * - Análise SWOT
 * 
 * @module strategic
 * @see ADR-0020, ADR-0021, ADR-0022, ADR-0023
 */

// Domain - Entities
export * from './domain/entities';

// Domain - Value Objects
export * from './domain/value-objects';

// Domain - Ports
export * from './domain/ports';

// Infrastructure - Schemas
export * from './infrastructure/persistence/schemas';

// Infrastructure - Mappers
export * from './infrastructure/persistence/mappers';

// Infrastructure - DI
export * from './infrastructure/di';
