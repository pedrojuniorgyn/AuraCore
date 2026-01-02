/**
 * Date Parameter Parsing and Validation
 * E7.8 WMS Semana 3 - Etapa 2.6
 * 
 * Helper functions to safely parse and validate date query parameters
 */

/**
 * Parses an optional date parameter
 * Returns undefined if value is null/empty or if date is invalid
 * 
 * @param value - Query parameter value
 * @param paramName - Parameter name for error messages (unused in non-strict mode)
 * @returns Valid Date object or undefined
 */
export function parseDateParam(
  value: string | null,
  paramName: string
): Date | undefined {
  if (!value) return undefined;
  
  const date = new Date(value);
  
  // Check if date is valid using isNaN on getTime()
  if (isNaN(date.getTime())) {
    return undefined;
  }
  
  return date;
}

/**
 * Parses an optional date parameter with strict validation
 * Returns error object if date string is invalid
 * 
 * @param value - Query parameter value
 * @param paramName - Parameter name for error messages
 * @returns Result object with success flag, date, and optional error
 */
export function parseDateParamStrict(
  value: string | null,
  paramName: string
): { success: true; date: Date | undefined } | { success: false; error: string } {
  if (!value) {
    return { success: true, date: undefined };
  }
  
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return {
      success: false,
      error: `Invalid ${paramName} format: "${value}". Expected ISO 8601 date string (e.g., 2024-01-15 or 2024-01-15T10:30:00Z).`,
    };
  }
  
  return { success: true, date };
}

/**
 * Validates that startDate is before or equal to endDate
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns True if valid, false otherwise
 */
export function validateDateRange(
  startDate: Date | undefined,
  endDate: Date | undefined
): boolean {
  if (!startDate || !endDate) return true;
  
  return startDate <= endDate;
}

