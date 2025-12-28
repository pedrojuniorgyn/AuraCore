/**
 * Declaração de tipos para o módulo ofx-js
 * 
 * ofx-js é uma biblioteca para parsing de arquivos OFX (Open Financial Exchange)
 * que não fornece tipos TypeScript oficiais.
 * 
 * Esta declaração fornece tipagem básica para as funções utilizadas no AuraCore.
 */
declare module "ofx-js" {
  /**
   * Faz o parsing de uma string contendo dados OFX
   * @param data - String contendo o conteúdo do arquivo OFX
   * @returns Promise que resolve para um objeto com a estrutura OFX parseada
   */
  export function parse(data: string): Promise<unknown>;
}

