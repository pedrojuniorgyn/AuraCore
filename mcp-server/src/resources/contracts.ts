/**
 * MCP Resource: Contracts
 * 
 * Expõe contratos arquiteturais do AuraCore via MCP
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeResourceId } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTRACTS_DIR = path.join(__dirname, '../../knowledge/contracts');

export interface ContractResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Lista todos os contratos disponíveis
 */
export async function listContracts(): Promise<ContractResource[]> {
  try {
    const files = await fs.readdir(CONTRACTS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const results = await Promise.allSettled(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(CONTRACTS_DIR, file), 'utf-8');
        const contract = JSON.parse(content);
        
        return {
          uri: `contract://${contract.id}`,
          name: contract.title,
          description: `Contrato arquitetural: ${contract.title}`,
          mimeType: 'application/json',
        };
      })
    );

    const resources: ContractResource[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        resources.push(result.value);
      } else {
        const filename = jsonFiles[index];
        errors.push(`Failed to load ${filename}: ${result.reason}`);
        console.error(`Contract loading error: ${filename}`, result.reason);
      }
    });

    if (errors.length > 0) {
      console.warn(`Loaded ${resources.length} contracts with ${errors.length} errors`);
    }

    return resources;
  } catch (error) {
    console.error('Failed to list contracts:', error);
    return [];
  }
}

/**
 * Obtém um contrato específico pelo ID
 * ID deve estar em lowercase-com-hifen (ex: api-contract)
 */
export async function getContract(contractId: string): Promise<string> {
  const safeId = sanitizeResourceId(contractId);
  const fileName = `${safeId}.json`;
  const filePath = path.join(CONTRACTS_DIR, fileName);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Contrato não encontrado: ${contractId}`);
  }
}

/**
 * Busca contratos por termo
 */
export async function searchContracts(query: string): Promise<unknown[]> {
  try {
    const files = await fs.readdir(CONTRACTS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const results: unknown[] = [];
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(CONTRACTS_DIR, file), 'utf-8');
      const contract = JSON.parse(content);
      
      // Buscar no conteúdo e regras
      if (
        contract.content.toLowerCase().includes(query.toLowerCase()) ||
        contract.rules.some((rule: string) => rule.toLowerCase().includes(query.toLowerCase()))
      ) {
        results.push(contract);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return [];
  }
}

