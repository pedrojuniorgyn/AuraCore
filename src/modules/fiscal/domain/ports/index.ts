/**
 * Domain Ports - Fiscal Module
 *
 * Exporta interfaces (Ports) do módulo Fiscal.
 *
 * Input Ports: Contratos de entrada para Use Cases
 * Output Ports: Contratos de saída para Repositories e Services externos
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 * @see E7.26: Reorganização de Output Ports
 */

// Input Ports (Use Cases)
export * from './input';

// Output Ports (Repositories & External Services)
export * from './output';
