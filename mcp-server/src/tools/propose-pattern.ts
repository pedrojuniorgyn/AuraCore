import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeResourceId } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProposePatternInput {
  id: string;
  name: string;
  category: string;
  description: string;
  example?: string;
  rules?: string[];
  tags?: string[];
}

interface ProposedPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'proposed';
  proposedDate: string;
  example?: { typescript: string };
  rules?: string[];
  tags?: string[];
}

export async function proposePattern(input: ProposePatternInput): Promise<ProposedPattern> {
  // Validacao de campos obrigatorios
  if (!input.id || typeof input.id !== 'string') {
    throw new Error('id is required and must be a string');
  }
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('name is required and must be a string');
  }
  if (!input.category || typeof input.category !== 'string') {
    throw new Error('category is required and must be a string');
  }
  if (!input.description || typeof input.description !== 'string') {
    throw new Error('description is required and must be a string');
  }
  
  // Sanitizar ID (LESSON LEARNED #1: Path traversal protection)
  const safeId = sanitizeResourceId(input.id);
  
  // Criar pattern object
  const pattern: ProposedPattern = {
    id: safeId,
    name: input.name,
    category: input.category,
    description: input.description,
    status: 'proposed',
    proposedDate: new Date().toISOString()
  };
  
  // Adicionar campos opcionais
  if (input.example && typeof input.example === 'string') {
    pattern.example = { typescript: input.example };
  }
  
  if (Array.isArray(input.rules)) {
    pattern.rules = input.rules.filter(r => typeof r === 'string');
  }
  
  if (Array.isArray(input.tags)) {
    pattern.tags = input.tags.filter(t => typeof t === 'string');
  }
  
  // Salvar em proposed/
  const proposedDir = path.join(__dirname, '../../knowledge/patterns/proposed');
  
  // Garantir que diretorio existe
  await fs.mkdir(proposedDir, { recursive: true });
  
  const filepath = path.join(proposedDir, `${safeId}.json`);
  
  // Verificar se ja existe
  try {
    await fs.access(filepath);
    // Se chegou aqui, arquivo EXISTE
    throw new Error(`Pattern ${safeId} already exists in proposed`);
  } catch (error: unknown) {
    // Type guard robusto
    if (!error || typeof error !== 'object') {
      // Erro inesperado sem estrutura
      throw new Error('Unexpected error checking pattern existence');
    }
    
    // Verificar se e erro de "already exists" (nosso throw)
    if ('message' in error) {
      const message = String((error as { message: unknown }).message);
      if (message.includes('already exists')) {
        throw error; // Re-throw nosso erro
      }
    }
    
    // Verificar se e ENOENT (arquivo nao existe - OK para criar)
    if ('code' in error) {
      const fsError = error as { code: string };
      if (fsError.code === 'ENOENT') {
        // OK - arquivo nao existe, pode criar
        // Continue para writeFile abaixo
      } else {
        // Outro erro de filesystem (permissao, etc)
        throw error;
      }
    } else {
      // Erro sem code e sem message "already exists"
      // Re-throw em vez de silenciar
      throw new Error(`Unexpected error checking pattern: ${String(error)}`);
    }
  }
  
  // Salvar arquivo (so chega aqui se ENOENT)
  await fs.writeFile(filepath, JSON.stringify(pattern, null, 2), 'utf-8');
  
  return pattern;
}

