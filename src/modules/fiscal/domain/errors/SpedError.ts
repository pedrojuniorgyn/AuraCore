/**
 * 📄 SPED ERROR
 * 
 * Erro de domínio para operações com arquivos SPED
 * 
 * Épico: E7.13 - Migration to DDD
 */

export class SpedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpedError';
    Object.setPrototypeOf(this, SpedError.prototype);
  }

  static invalidPeriod(month: number, year: number): SpedError {
    return new SpedError(
      `Período inválido: mês=${month}, ano=${year}`
    );
  }

  static organizationNotFound(organizationId: bigint | number): SpedError {
    return new SpedError(
      `Organização #${organizationId} não encontrada`
    );
  }

  static noDataForPeriod(period: string): SpedError {
    return new SpedError(
      `Nenhum dado encontrado para o período ${period}`
    );
  }

  static invalidRegister(registerCode: string, reason: string): SpedError {
    return new SpedError(
      `Registro ${registerCode} inválido: ${reason}`
    );
  }

  static invalidBlock(blockId: string, reason: string): SpedError {
    return new SpedError(
      `Bloco ${blockId} inválido: ${reason}`
    );
  }
}

