/**
 * MCP Contracts Index
 * 
 * Exporta todos os contratos de validação de arquitetura
 * ADR-0015: 100% DDD/Hexagonal
 */

// Process & Quality Contracts
import verifyBeforeCode from './verify-before-code.json';
import codeConsistency from './code-consistency.json';
import typeSafety from './type-safety.json';
import mcpEnforcementRules from './mcp-enforcement-rules.json';
import knownBugsRegistry from './known-bugs-registry.json';
import smpMethodology from './smp-methodology.json';
import lessonLearned from './lesson-learned.json';
import enforcementProtocol from './enforcement-protocol.json';

// Architecture Contracts
import architectureLayers from './architecture-layers.json';
import infrastructureLayer from './infrastructure-layer.json';

// Domain Pattern Contracts
import entityPattern from './entity-pattern.json';
import valueObjectPattern from './value-object-pattern.json';
import aggregatePattern from './aggregate-pattern.json';
import domainServicePattern from './domain-service-pattern.json';

// Application Pattern Contracts
import useCasePattern from './use-case-pattern.json';
import dtoPattern from './dto-pattern.json';

// Infrastructure Pattern Contracts
import repositoryPattern from './repository-pattern.json';
import mapperPattern from './mapper-pattern.json';
import validatorPattern from './validator-pattern.json';
import schemaPattern from './schema-pattern.json';

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
} as const;

export type ContractId = keyof typeof contracts;

export function getContract(id: ContractId) {
  return contracts[id];
}

export function getAllContracts() {
  return Object.values(contracts);
}

export function getContractsByCategory(category: string) {
  return Object.values(contracts).filter(c => c.category === category);
}

