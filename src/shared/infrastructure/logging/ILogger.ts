/**
 * Logger Interface
 * 
 * Interface para abstração de logging na aplicação.
 * Permite diferentes implementações (Console, File, Cloud, etc).
 */
export interface ILogger {
  /**
   * Log informational message
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void;
}

