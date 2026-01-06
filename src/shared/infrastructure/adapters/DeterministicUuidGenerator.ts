import type { IUuidGenerator } from '../../domain/ports/IUuidGenerator';

/**
 * Adapter para testes: UUIDs determinísticos e previsíveis
 * 
 * Gera UUIDs no formato válido v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * O contador é inserido nos primeiros 8 caracteres (hex).
 * 
 * Exemplo:
 *   counter=1  → "00000001-0000-4000-8000-000000000000"
 *   counter=255 → "000000ff-0000-4000-8000-000000000000"
 * 
 * NÃO usar em produção!
 */
export class DeterministicUuidGenerator implements IUuidGenerator {
  private counter = 0;

  generate(): string {
    this.counter++;
    // Converter counter para hex com padding de 8 caracteres
    const hexCounter = this.counter.toString(16).padStart(8, '0');
    // Formato UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // 4 = versão 4, 8 = variante (8, 9, a, b são válidos)
    return `${hexCounter}-0000-4000-8000-000000000000`;
  }

  /**
   * Reinicia o contador para zero.
   * Útil entre testes para garantir IDs consistentes.
   */
  reset(): void {
    this.counter = 0;
  }

  /**
   * Retorna o próximo ID que será gerado (sem incrementar).
   * Útil para assertions em testes.
   */
  peekNext(): string {
    const next = this.counter + 1;
    const hexCounter = next.toString(16).padStart(8, '0');
    return `${hexCounter}-0000-4000-8000-000000000000`;
  }
}
