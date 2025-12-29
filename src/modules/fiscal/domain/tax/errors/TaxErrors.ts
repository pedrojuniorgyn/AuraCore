import { DomainError } from '@/shared/domain';

/**
 * Erro: Cálculo de imposto inválido
 */
export class InvalidTaxCalculationError extends DomainError {
  readonly code = 'INVALID_TAX_CALCULATION';
  constructor(message: string) {
    super(`Invalid tax calculation: ${message}`);
  }
}

/**
 * Erro: Base de cálculo inválida
 */
export class InvalidBaseCalculoError extends DomainError {
  readonly code = 'INVALID_BASE_CALCULO';
  constructor(reason: string) {
    super(`Invalid base de cálculo: ${reason}`);
  }
}

/**
 * Erro: Alíquota inválida
 */
export class InvalidAliquotaError extends DomainError {
  readonly code = 'INVALID_ALIQUOTA';
  constructor(value: number, reason: string) {
    super(`Invalid aliquota ${value}%: ${reason}`);
  }
}

/**
 * Erro: CST inválido
 */
export class InvalidCSTError extends DomainError {
  readonly code = 'INVALID_CST';
  constructor(cst: string, reason: string) {
    super(`Invalid CST ${cst}: ${reason}`);
  }
}

/**
 * Erro: CSOSN inválido
 */
export class InvalidCSOSNError extends DomainError {
  readonly code = 'INVALID_CSOSN';
  constructor(csosn: string, reason: string) {
    super(`Invalid CSOSN ${csosn}: ${reason}`);
  }
}

/**
 * Erro: Substituição tributária inválida
 */
export class InvalidSubstituicaoTributariaError extends DomainError {
  readonly code = 'INVALID_ST';
  constructor(reason: string) {
    super(`Invalid substituição tributária: ${reason}`);
  }
}

/**
 * Erro: UF inválida
 */
export class InvalidUFError extends DomainError {
  readonly code = 'INVALID_UF';
  constructor(uf: string) {
    super(`Invalid UF: ${uf}. Must be a valid Brazilian state code.`);
  }
}

/**
 * Erro: Município inválido
 */
export class InvalidMunicipalityError extends DomainError {
  readonly code = 'INVALID_MUNICIPALITY';
  constructor(municipalityCode: string) {
    super(`Invalid municipality code: ${municipalityCode}`);
  }
}

/**
 * Erro: Código de serviço inválido
 */
export class InvalidServiceCodeError extends DomainError {
  readonly code = 'INVALID_SERVICE_CODE';
  constructor(serviceCode: string) {
    super(`Invalid service code: ${serviceCode}. Must follow LC 116/2003 format.`);
  }
}

/**
 * Erro: Parâmetros de cálculo faltando
 */
export class MissingTaxParametersError extends DomainError {
  readonly code = 'MISSING_TAX_PARAMETERS';
  constructor(missingParams: string[]) {
    super(`Missing required tax parameters: ${missingParams.join(', ')}`);
  }
}

