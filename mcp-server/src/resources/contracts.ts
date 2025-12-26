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
          // CORRECAO: Consistente com ReadResourceRequestSchema
          mimeType: 'text/plain',
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
    const lowerQuery = query.toLowerCase();
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(CONTRACTS_DIR, file), 'utf-8');
      const contract = JSON.parse(content);
      
      // Busca em campos principais
      const searchableText = [
        contract.id,
        contract.title,
        contract.category,
        contract.description,
        contract.content
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (searchableText.includes(lowerQuery)) {
        results.push(contract);
        continue;
      }
      
      // CORRECAO: Rules sao STRINGS, nao objetos
      if (Array.isArray(contract.rules)) {
        const hasMatchingRule = contract.rules.some((rule: string) => {
          // Rule e string diretamente, nao objeto
          if (typeof rule === 'string') {
            return rule.toLowerCase().includes(lowerQuery);
          }
          return false;
        });
        
        if (hasMatchingRule) {
          results.push(contract);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return [];
  }
}

