/**
 * @module agent/tools
 * @description Ferramentas (Tools) do Agente AuraCore
 * 
 * Tools são as ações que o agente pode executar para ajudar o usuário.
 * Cada tool segue o padrão LangChain e é validado com Zod.
 */

// Base
export { BaseTool, type ToolResult, type ToolConfig } from './base';

// Fiscal
export { ImportNFeTool } from './fiscal';

// Workspace
export { SearchEmailTool } from './workspace';

// Registry de todas as tools
import { ImportNFeTool } from './fiscal';
import { SearchEmailTool } from './workspace';
import type { BaseTool } from './base';

/**
 * Lista de todas as tools disponíveis
 */
export const allTools: BaseTool[] = [
  new ImportNFeTool(),
  new SearchEmailTool(),
];

/**
 * Obtém tool pelo nome
 */
export function getToolByName(name: string): BaseTool | undefined {
  return allTools.find(tool => tool.name === name);
}

/**
 * Obtém tools por categoria
 */
export function getToolsByCategory(category: string): BaseTool[] {
  return allTools.filter(tool => tool.category === category);
}

/**
 * Obtém descrições de todas as tools para o LLM
 */
export function getToolsDescription(): string {
  return allTools
    .map(tool => `- ${tool.name}: ${tool.description.split('\n')[0]}`)
    .join('\n');
}
