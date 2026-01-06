/**
 * MCP Contracts Index
 * 
 * Exporta todos os contratos de validação de arquitetura
 * ADR-0015: 100% DDD/Hexagonal
 */

import architectureLayers from './architecture-layers.json';
import entityPattern from './entity-pattern.json';
import valueObjectPattern from './value-object-pattern.json';
import aggregatePattern from './aggregate-pattern.json';
import domainServicePattern from './domain-service-pattern.json';
import useCasePattern from './use-case-pattern.json';
import repositoryPattern from './repository-pattern.json';
import mapperPattern from './mapper-pattern.json';
import validatorPattern from './validator-pattern.json';
import dtoPattern from './dto-pattern.json';
import schemaPattern from './schema-pattern.json';

export const contracts = {
  'architecture-layers': architectureLayers,
  'entity-pattern': entityPattern,
  'value-object-pattern': valueObjectPattern,
  'aggregate-pattern': aggregatePattern,
  'domain-service-pattern': domainServicePattern,
  'use-case-pattern': useCasePattern,
  'repository-pattern': repositoryPattern,
  'mapper-pattern': mapperPattern,
  'validator-pattern': validatorPattern,
  'dto-pattern': dtoPattern,
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

