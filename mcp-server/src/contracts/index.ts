/**
 * MCP Contracts Index
 * 
 * Exporta todos os contratos de validação de arquitetura
 * ADR-0015: 100% DDD/Hexagonal
 */

// Process & Quality Contracts
import verifyBeforeCode from './verify-before-code.json' with { type: 'json' };
import codeConsistency from './code-consistency.json' with { type: 'json' };
import typeSafety from './type-safety.json' with { type: 'json' };
import mcpEnforcementRules from './mcp-enforcement-rules.json' with { type: 'json' };
import knownBugsRegistry from './known-bugs-registry.json' with { type: 'json' };
import smpMethodology from './smp-methodology.json' with { type: 'json' };
import lessonLearned from './lesson-learned.json' with { type: 'json' };
import enforcementProtocol from './enforcement-protocol.json' with { type: 'json' };

// Architecture Contracts
import architectureLayers from './architecture-layers.json' with { type: 'json' };
import infrastructureLayer from './infrastructure-layer.json' with { type: 'json' };

// Domain Pattern Contracts
import entityPattern from './entity-pattern.json' with { type: 'json' };
import valueObjectPattern from './value-object-pattern.json' with { type: 'json' };
import aggregatePattern from './aggregate-pattern.json' with { type: 'json' };
import domainServicePattern from './domain-service-pattern.json' with { type: 'json' };

// Application Pattern Contracts
import useCasePattern from './use-case-pattern.json' with { type: 'json' };
import dtoPattern from './dto-pattern.json' with { type: 'json' };

// Infrastructure Pattern Contracts
import repositoryPattern from './repository-pattern.json' with { type: 'json' };
import mapperPattern from './mapper-pattern.json' with { type: 'json' };
import validatorPattern from './validator-pattern.json' with { type: 'json' };
import schemaPattern from './schema-pattern.json' with { type: 'json' };

// Security & Quality Contracts (E9 - Prevenção de Bugs)
import tenantSecurity from './tenant-security.json' with { type: 'json' };
import csvExport from './csv-export.json' with { type: 'json' };
import callbackArrayConsistency from './callback-array-consistency.json' with { type: 'json' };

export const contracts = {
  // Process & Quality (consultar ANTES de codificar)
  'verify-before-code': verifyBeforeCode,
  'code-consistency': codeConsistency,
  'type-safety': typeSafety,
  'mcp-enforcement-rules': mcpEnforcementRules,
  'known-bugs-registry': knownBugsRegistry,
  'smp-methodology': smpMethodology,
  'lesson-learned': lessonLearned,
  'enforcement-protocol': enforcementProtocol,
  
  // Architecture
  'architecture-layers': architectureLayers,
  'infrastructure-layer': infrastructureLayer,
  
  // Domain Patterns
  'entity-pattern': entityPattern,
  'value-object-pattern': valueObjectPattern,
  'aggregate-pattern': aggregatePattern,
  'domain-service-pattern': domainServicePattern,
  
  // Application Patterns
  'use-case-pattern': useCasePattern,
  'dto-pattern': dtoPattern,
  
  // Infrastructure Patterns
  'repository-pattern': repositoryPattern,
  'mapper-pattern': mapperPattern,
  'validator-pattern': validatorPattern,
  'schema-pattern': schemaPattern,
  
  // Security & Quality (E9 - Bug Prevention)
  'tenant-security': tenantSecurity,
  'csv-export': csvExport,
  'callback-array-consistency': callbackArrayConsistency,
} as const;

export type ContractId = keyof typeof contracts;

export function getContract(id: ContractId) {
  return contracts[id];
}

export function getAllContracts() {
  return Object.values(contracts);
}

export function getContractsByCategory(category: string) {
  return Object.values(contracts).filter(c => 'category' in c && c.category === category);
}

