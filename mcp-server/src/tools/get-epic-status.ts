import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EpicStatus {
  id: string;
  name: string;
  status: string;
  progress: number;
  deliverables: string[];
  dependencies?: string[];
  startDate?: string;
  endDate?: string;
}

export async function getEpicStatus(epicId: string): Promise<EpicStatus> {
  // Validar epic_id
  if (!epicId || typeof epicId !== 'string') {
    throw new Error('epic_id must be a non-empty string');
  }
  
  // Validar formato (E0-E9)
  if (!/^E[0-9]$/.test(epicId)) {
    throw new Error(`Invalid epic_id format: ${epicId}. Expected E0-E9`);
  }
  
  const epicsDir = path.join(__dirname, '../../knowledge/epics');
  const filepath = path.join(epicsDir, `${epicId}.json`);
  
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const epic = JSON.parse(content) as EpicStatus;
    
    // Validar schema basico
    if (!epic.id || !epic.name) {
      throw new Error(`Invalid epic schema in ${epicId}.json`);
    }
    
    return epic;
    
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const fsError = error as { code: string };
      if (fsError.code === 'ENOENT') {
        throw new Error(`Epic not found: ${epicId}`);
      }
    }
    
    // Re-throw outros erros
    throw error;
  }
}

