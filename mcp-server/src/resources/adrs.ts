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

    const resources: ADRResource[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        resources.push(result.value);
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
  } catch (error) {
    console.error('Failed to list ADRs:', error);
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

