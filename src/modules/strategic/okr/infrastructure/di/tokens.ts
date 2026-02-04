/**
 * DI Tokens - OKR Module
 * @module strategic/okr/infrastructure/di
 */

export const OKR_TOKENS = {
  // Repositories
  OkrRepository: Symbol.for('IOkrRepository'),
} as const;
