import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'approved' | 'proposed';
  tags?: string[];
  example?: unknown;
  rules?: string[];
  relatedContracts?: string[];
}

interface SearchPatternsResult {
  patterns: Pattern[];
  total: number;
  query: string;
  status: string;
}

export async function searchPatterns(
  query: string,
  status: 'approved' | 'proposed' | 'all' = 'approved'
): Promise<SearchPatternsResult> {
  // Validacao
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error('query must be a non-empty string');
  }
  
  if (!['approved', 'proposed', 'all'].includes(status)) {
    throw new Error('status must be approved, proposed, or all');
  }
  
  const patternsDir = path.join(__dirname, '../../knowledge/patterns');
  const dirsToSearch: string[] = [];
  
  // Determinar diretorios para buscar
  if (status === 'approved' || status === 'all') {
    dirsToSearch.push(path.join(patternsDir, 'approved'));
  }
  if (status === 'proposed' || status === 'all') {
    dirsToSearch.push(path.join(patternsDir, 'proposed'));
  }
  
  const allPatterns: Pattern[] = [];
  
  // Buscar em cada diretorio
  for (const dir of dirsToSearch) {
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      // Ler todos patterns (Promise.allSettled para graceful degradation)
      const results = await Promise.allSettled(
        jsonFiles.map(async (file) => {
          const filepath = path.join(dir, file);
          const content = await fs.readFile(filepath, 'utf-8');
          return JSON.parse(content) as Pattern;
        })
      );
      
      // Extrair patterns validos
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          allPatterns.push(result.value);
        }
      });
      
    } catch (error: unknown) {
      // Se diretorio nao existe, ignorar (pode nao ter patterns ainda)
      if (error && typeof error === 'object' && 'code' in error) {
        const fsError = error as { code: string };
        if (fsError.code !== 'ENOENT') {
          console.error(`Error reading patterns directory ${dir}:`, error);
        }
      }
    }
  }
  
  // Filtrar patterns por query
  const lowerQuery = query.toLowerCase();
  const matchingPatterns = allPatterns.filter(pattern => {
    // Buscar em campos principais
    const searchableText = [
      pattern.id,
      pattern.name,
      pattern.category,
      pattern.description
    ].filter(Boolean).join(' ').toLowerCase();
    
    if (searchableText.includes(lowerQuery)) {
      return true;
    }
    
    // Buscar em tags (LESSON LEARNED #4: Array safety)
    if (Array.isArray(pattern.tags)) {
      const tagsMatch = pattern.tags.some(tag => 
        typeof tag === 'string' && tag.toLowerCase().includes(lowerQuery)
      );
      if (tagsMatch) return true;
    }
    
    // Buscar em rules
    if (Array.isArray(pattern.rules)) {
      const rulesMatch = pattern.rules.some(rule =>
        typeof rule === 'string' && rule.toLowerCase().includes(lowerQuery)
      );
      if (rulesMatch) return true;
    }
    
    return false;
  });
  
  return {
    patterns: matchingPatterns,
    total: matchingPatterns.length,
    query,
    status
  };
}

