/**
 * Port: UUID Generator
 * Abstração para geração de UUIDs - Domain não conhece implementação.
 */
export interface IUuidGenerator {
  generate(): string;
}

