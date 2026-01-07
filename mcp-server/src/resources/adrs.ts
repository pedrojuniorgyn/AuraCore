/**
 * MCP Resource: ADRs (Architecture Decision Records)
 * 
 * Expõe decisões arquiteturais do AuraCore via MCP
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeResourceId } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADRS_DIR = path.join(__dirname, '../../knowledge/adrs');

export interface ADRResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Lista todos os ADRs disponíveis
 */
export async function listADRs(): Promise<ADRResource[]> {
  try {
    const files = await fs.readdir(ADRS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
    
    const results = await Promise.allSettled(
      jsonFiles.map(async (file) => {
        const id = file.replace('.json', '');
        const content = await getADR(id);
        return JSON.parse(content);
      })
    );

    const resources: ADRResource[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const adr = result.value;
        
        // CORRECAO: Validar context existe e e string antes de substring
        const contextPreview = adr.context && typeof adr.context === 'string'
          ? adr.context.substring(0, 100)
          : 'No context available';
        
        resources.push({
          uri: `adr://${adr.id}`,
          name: `ADR ${adr.number}: ${adr.title}`,
          description: `Status: ${adr.status} | ${contextPreview}...`,
          mimeType: 'text/plain',
        });
      } else {
        const filename = jsonFiles[index];
        errors.push(`Failed to load ${filename}: ${result.reason}`);
        console.error(`ADR loading error: ${filename}`, result.reason);
      }
    });

    if (errors.length > 0) {
      console.warn(`Loaded ${resources.length} ADRs with ${errors.length} errors`);
    }

    return resources;
  } catch {
    // Retornar lista vazia em caso de erro
    return [];
  }
}

/**
 * Obtém um ADR específico pelo ID
 * ID deve estar em lowercase-com-hifen (ex: 0001-sqlserver-only)
 */
export async function getADR(adrId: string): Promise<string> {
  const safeId = sanitizeResourceId(adrId);
  const fileName = `${safeId}.json`;
  const filePath = path.join(ADRS_DIR, fileName);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`ADR não encontrado: ${adrId}`);
  }
}

/**
 * Busca ADRs por termo
 */
export async function searchADRs(query: string): Promise<unknown[]> {
  try {
    const files = await fs.readdir(ADRS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const results: unknown[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(ADRS_DIR, file), 'utf-8');
      const adr = JSON.parse(content);
      
      // CORRECAO: Validar campos existem antes de acessar
      const searchableText = [
        adr.id,
        adr.title,
        adr.status,
        adr.context,
        adr.decision,
        adr.consequences
      ].filter(field => field && typeof field === 'string')
       .join(' ')
       .toLowerCase();
      
      if (searchableText.includes(lowerQuery)) {
        results.push(adr);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erro ao buscar ADRs:', error);
    return [];
  }
}

