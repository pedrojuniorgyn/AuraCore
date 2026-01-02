/**
 * Boolean Parameter Parsing and Validation
 * E7.8 WMS Semana 3
 * 
 * Helper functions to safely parse and validate boolean query parameters
 */

/**
 * Result type for boolean parsing
 */
type ParseBooleanResult = 
  | { success: true; value: boolean | undefined }
  | { success: false; error: string };

/**
 * Parses a boolean query parameter with validation
 * Returns undefined if not provided, true/false if valid, or error if invalid
 * 
 * Valid values:
 * - true: 'true', '1', 'yes' (case-insensitive)
 * - false: 'false', '0', 'no' (case-insensitive)
 * - undefined: null (parameter not provided)
 * 
 * @param value - Query parameter value
 * @param paramName - Parameter name for error messages
 * @returns Validation result with boolean value or error
 */
export function parseBooleanParam(
  value: string | null,
  paramName: string
): ParseBooleanResult {
  // Não fornecido = undefined (não filtrar)
  if (value === null) {
    return { success: true, value: undefined };
  }

  // Normalizar para lowercase e remover espaços
  const normalized = value.toLowerCase().trim();

  // Valores válidos para true
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return { success: true, value: true };
  }

  // Valores válidos para false
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return { success: true, value: false };
  }

  // Valor inválido = erro
  return {
    success: false,
    error: `Invalid ${paramName} parameter: "${value}". Expected: true, false, 1, 0, yes, or no.`,
  };
}

/**
 * Parses multiple boolean parameters at once
 * Returns error on first invalid parameter
 * 
 * @param params - Object with parameter names and values
 * @returns Validation result with all boolean values or error
 */
export function parseBooleanParams(
  params: Record<string, string | null>
): { success: true; values: Record<string, boolean | undefined> } | { success: false; error: string } {
  const values: Record<string, boolean | undefined> = {};

  for (const [paramName, paramValue] of Object.entries(params)) {
    const result = parseBooleanParam(paramValue, paramName);
    
    if (!result.success) {
      return result;
    }
    
    values[paramName] = result.value;
  }

  return { success: true, values };
}

