/**
 * Sanitização de IDs de recursos para prevenir path traversal
 */

export function sanitizeResourceId(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid resource ID: must be non-empty string');
  }

  const sanitized = id
    .replace(/\.\./g, '')
    .replace(/\//g, '')
    .replace(/\\/g, '')
    .trim();

  if (!/^[a-z0-9-]+$/.test(sanitized)) {
    throw new Error(`Invalid resource ID format: ${id}. Only lowercase letters, numbers and hyphens allowed.`);
  }

  return sanitized;
}

