import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeResourceId } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Contract {
  id: string;
  title: string;  // CORRECAO: era 'name', JSON usa 'title'
  category?: string;
  description?: string;
  rules?: string[];
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
    if (!contract.id || !contract.title) {
      throw new Error(`Invalid contract schema in ${safeId}.json`);
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

