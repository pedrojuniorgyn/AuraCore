/**
 * XmlEscaper: Utility para escape e unescape de caracteres especiais XML
 * 
 * E7.4.1 Semana 9 - XML Builders + Validação
 * 
 * Responsabilidades:
 * - Escapar caracteres especiais XML (&, <, >, ", ')
 * - Reverter escape (unescape)
 * - Prevenir injection attacks
 * 
 * Referência: XML 1.0 Specification - Section 2.4
 */
export class XmlEscaper {
  /**
   * Escapa caracteres especiais para uso em conteúdo XML
   * 
   * Converte:
   * & → &amp;
   * < → &lt;
   * > → &gt;
   * " → &quot;
   * ' → &apos;
   * 
   * @param value String a ser escapada
   * @returns String com caracteres especiais escapados
   * 
   * @example
   * ```typescript
   * XmlEscaper.escape('Empresa & Cia <LTDA>') // 'Empresa &amp; Cia &lt;LTDA&gt;'
   * XmlEscaper.escape('Produto "Premium"') // 'Produto &quot;Premium&quot;'
   * ```
   */
  static escape(value: string): string {
    if (!value) return value;
    
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Remove escape de caracteres especiais XML
   * 
   * Converte:
   * &amp; → &
   * &lt; → <
   * &gt; → >
   * &quot; → "
   * &apos; → '
   * 
   * @param value String escapada
   * @returns String com escape removido
   * 
   * @example
   * ```typescript
   * XmlEscaper.unescape('Empresa &amp; Cia &lt;LTDA&gt;') // 'Empresa & Cia <LTDA>'
   * ```
   */
  static unescape(value: string): string {
    if (!value) return value;
    
    return value
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&'); // & deve ser o último para evitar double-unescape
  }

  /**
   * Escapa valor para uso em atributo XML
   * 
   * Similar ao escape(), mas com proteção extra para aspas
   * 
   * @param value Valor do atributo
   * @returns Valor escapado
   * 
   * @example
   * ```typescript
   * XmlEscaper.escapeAttribute('Produto "Premium"') // 'Produto &quot;Premium&quot;'
   * ```
   */
  static escapeAttribute(value: string): string {
    return this.escape(value);
  }

  /**
   * Verifica se string contém caracteres especiais XML que precisam de escape
   * 
   * @param value String a verificar
   * @returns true se contém caracteres especiais
   */
  static needsEscape(value: string): boolean {
    if (!value) return false;
    return /[&<>"']/.test(value);
  }
}

