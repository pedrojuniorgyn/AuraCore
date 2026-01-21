import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeResourceId } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Contract {
  id: string;
  name: string;  // JSONs usam 'name', não 'title'
  title?: string; // Alias opcional para compatibilidade
  category?: string;
  description?: string;
  rules?: unknown[];  // Pode ser array de strings ou objetos
  examples?: unknown[];
}

export async function getContractTool(contractId: string): Promise<Contract> {
  // Validar contract_id
  if (!contractId || typeof contractId !== 'string') {
    throw new Error('contract_id must be a non-empty string');
  }
  
  // Sanitizar (LESSON LEARNED #1)
  const safeId = sanitizeResourceId(contractId);
  
  const contractsDir = path.join(__dirname, '../../knowledge/contracts');
  const filepath = path.join(contractsDir, `${safeId}.json`);
  
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const contract = JSON.parse(content) as Contract;
    
    // Validar schema (LESSON LEARNED #6)
    // JSONs usam 'name', mas alguns podem usar 'title' como alias
    if (!contract.id || (!contract.name && !contract.title)) {
      throw new Error(`Invalid contract schema in ${safeId}.json: missing 'id' or 'name'`);
    }
    
    return contract;
    
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const fsError = error as { code: string };
      if (fsError.code === 'ENOENT') {
        throw new Error(`Contract not found: ${contractId}`);
      }
    }
    
    throw error;
  }
}

