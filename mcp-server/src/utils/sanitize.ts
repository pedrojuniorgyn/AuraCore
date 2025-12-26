/**
 * Sanitização de IDs de recursos para prevenir path traversal
 */

export function sanitizeResourceId(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid resource ID: must be non-empty string');
  }

  // Detectar tentativas de path traversal ANTES de sanitizar
  if (id.includes('..') || id.includes('/') || id.includes('\\')) {
    throw new Error(`Invalid resource ID: path traversal attempt detected in "${id}"`);
  }

  const trimmed = id.trim();

  // Validar formato permitido (lowercase, números, hifens)
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    throw new Error(`Invalid resource ID format: ${id}. Only lowercase letters, numbers and hyphens allowed.`);
  }

  return trimmed;
}

