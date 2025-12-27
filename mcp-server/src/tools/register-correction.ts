import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CorrectionInput {
  epic: string;
  error_description: string;
  correction_applied: string;
  files_affected: string[];
  pattern_name?: string;
}

interface CorrectionResult {
  success: boolean;
  correction_id: string;
  message: string;
  contract_updated: boolean;
}

/**
 * Registra uma correção no sistema de aprendizado contínuo
 * 
 * - Adiciona registro em corrections/{epic}-corrections.json
 * - Atualiza type-safety.json com learned_correction
 * - Incrementa versão do contrato
 */
export async function registerCorrection(input: CorrectionInput): Promise<CorrectionResult> {
  const knowledgeDir = path.join(__dirname, '../../knowledge');
  const correctionsDir = path.join(knowledgeDir, 'corrections');
  const contractPath = path.join(knowledgeDir, 'contracts/type-safety.json');
  
  // Gerar ID único
  const correctionId = `LC-${String(Date.now()).slice(-6)}`;
  const today = new Date().toISOString().split('T')[0];
  
  // Criar registro de correção
  const record = {
    id: correctionId,
    date: today,
    epic: input.epic,
    error: input.error_description,
    correction: input.correction_applied,
    files_affected: input.files_affected,
    pattern_created: input.pattern_name || null,
    status: 'APPROVED',
    must_not_repeat: true
  };
  
  // Garantir que diretório existe
  if (!fs.existsSync(correctionsDir)) {
    fs.mkdirSync(correctionsDir, { recursive: true });
  }
  
  // Salvar em arquivo do épico
  const epicSlug = input.epic.toLowerCase().replace('.', '-');
  const epicFile = path.join(correctionsDir, `${epicSlug}-corrections.json`);
  
  let epicData: { epic: string; corrections: unknown[] };
  
  try {
    if (fs.existsSync(epicFile)) {
      const content = fs.readFileSync(epicFile, 'utf-8');
      epicData = JSON.parse(content);
    } else {
      epicData = { epic: input.epic, corrections: [] };
    }
  } catch {
    epicData = { epic: input.epic, corrections: [] };
  }
  
  // Adicionar correção (se não existe array, criar)
  if (!Array.isArray(epicData.corrections)) {
    epicData.corrections = [];
  }
  
  epicData.corrections.push(record);
  fs.writeFileSync(epicFile, JSON.stringify(epicData, null, 2));
  
  // Atualizar contrato type-safety
  let contractUpdated = false;
  
  try {
    if (fs.existsSync(contractPath)) {
      const content = fs.readFileSync(contractPath, 'utf-8');
      const contract = JSON.parse(content);
      
      if (!contract.learned_corrections) {
        contract.learned_corrections = [];
      }
      
      contract.learned_corrections.push({
        id: correctionId,
        date: today,
        epic: input.epic,
        error: input.error_description,
        correction: input.correction_applied,
        files_affected: input.files_affected,
        pattern_created: input.pattern_name || null,
        status: 'APPROVED',
        must_not_repeat: true
      });
      
      // Incrementar versão
      if (contract.version) {
        const parts = contract.version.split('.');
        parts[2] = String(parseInt(parts[2] || '0') + 1);
        contract.version = parts.join('.');
      }
      
      fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
      contractUpdated = true;
    }
  } catch (error: unknown) {
    console.error('Erro ao atualizar contrato:', error);
  }
  
  return {
    success: true,
    correction_id: correctionId,
    message: `Correção ${correctionId} registrada com sucesso. Este erro não deve se repetir.`,
    contract_updated: contractUpdated
  };
}

