/**
 * Declarações globais de tipos para módulos sem tipos oficiais
 */

/**
 * ofx-js: Biblioteca para parsing de arquivos OFX (Open Financial Exchange)
 * Não possui tipos TypeScript oficiais
 */
declare module "ofx-js" {
  export function parse(data: string): Promise<unknown>;
}

