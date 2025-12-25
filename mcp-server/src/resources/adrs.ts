/**
 * MCP Resource: ADRs (Architecture Decision Records)
 * 
 * Expõe decisões arquiteturais do AuraCore via MCP
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
    
    const resources: ADRResource[] = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(ADRS_DIR, file), 'utf-8');
        const adr = JSON.parse(content);
        
        return {
          uri: `adr://${adr.id}`,
          name: `ADR ${adr.number}: ${adr.title}`,
          description: `Status: ${adr.status} | ${adr.context.substring(0, 100)}...`,
          mimeType: 'application/json',
        };
      })
    );
    
    return resources;
  } catch (error) {
    console.error('Erro ao listar ADRs:', error);
    return [];
  }
}

/**
 * Obtém um ADR específico pelo ID
 */
export async function getADR(adrId: string): Promise<string> {
  const filePath = path.join(ADRS_DIR, `${adrId}.json`);
  
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
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(ADRS_DIR, file), 'utf-8');
      const adr = JSON.parse(content);
      
      // Buscar no título, contexto, decisão e consequências
      if (
        adr.title.toLowerCase().includes(query.toLowerCase()) ||
        adr.context.toLowerCase().includes(query.toLowerCase()) ||
        adr.decision.toLowerCase().includes(query.toLowerCase()) ||
        adr.consequences.toLowerCase().includes(query.toLowerCase())
      ) {
        results.push(adr);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erro ao buscar ADRs:', error);
    return [];
  }
}

