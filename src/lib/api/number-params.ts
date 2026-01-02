/**
 * Number Parameter Parsing and Validation
 * E7.8 WMS Semana 3
 * 
 * Helper functions to safely parse and validate number query parameters
 */

/**
 * Parses an optional number parameter
 * Returns undefined if value is null/empty or if number is invalid (NaN or Infinity)
 * 
 * @param value - Query parameter value
 * @param paramName - Parameter name for error messages
 * @returns Valid number or undefined
 */
export function parseNumberParam(
  value: string | null,
  paramName: string
): number | undefined {
  if (!value) return undefined;
  
  const num = parseFloat(value);
  
  // Check if number is valid using Number.isFinite()
  // This rejects NaN, Infinity, and -Infinity
  if (!Number.isFinite(num)) {
    return undefined;
  }
  
  return num;
}

/**
 * Parses an optional positive number parameter
 * Returns undefined if value is invalid or negative
 * 
 * @param value - Query parameter value
 * @param paramName - Parameter name for error messages
 * @returns Valid positive number or undefined
 */
export function parsePositiveNumberParam(
  value: string | null,
  paramName: string
): number | undefined {
  const num = parseNumberParam(value, paramName);
  
  if (num === undefined) return undefined;
  
  // Reject negative numbers
  if (num < 0) return undefined;
  
  return num;
}

/**
 * Parses an optional integer parameter
 * Returns undefined if value is invalid or not an integer
 * 
 * @param value - Query parameter value
 * @param paramName - Parameter name for error messages
 * @returns Valid integer or undefined
 */
export function parseIntParam(
  value: string | null,
  paramName: string
): number | undefined {
  if (!value) return undefined;
  
  const num = parseInt(value, 10);
  
  if (!Number.isFinite(num)) {
    return undefined;
  }
  
  return num;
}

