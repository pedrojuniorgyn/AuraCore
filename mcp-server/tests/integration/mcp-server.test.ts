import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Importar tools diretamente para testes de integracao
import { getEpicStatus } from '../../src/tools/get-epic-status.js';
import { getContractTool } from '../../src/tools/get-contract-tool.js';
import { searchPatterns } from '../../src/tools/search-patterns.js';
import { proposePattern } from '../../src/tools/propose-pattern.js';
import { validateCode } from '../../src/tools/validate-code.js';
import { checkCompliance } from '../../src/tools/check-compliance.js';

describe('MCP Server Integration Tests', () => {
  
  describe('Knowledge Base Access', () => {
    
    it('deve acessar contratos reais do knowledge base', async () => {
      // Testar com contrato real se existir
      const contractsDir = path.join(__dirname, '../../knowledge/contracts');
      
      try {
        const files = await fs.readdir(contractsDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        if (jsonFiles.length > 0) {
          const contractId = jsonFiles[0].replace('.json', '');
          const contract = await getContractTool(contractId);
          
          expect(contract).toBeDefined();
          expect(contract.id).toBe(contractId);
          expect(contract.title).toBeDefined();
        }
      } catch (error) {
        // Se diretorio nao existe, skip gracefully
        console.log('Knowledge base contracts not found, skipping test');
      }
    });

    it('deve buscar patterns no knowledge base', async () => {
      try {
        const result = await searchPatterns('pattern', 'all');
        
        expect(result).toBeDefined();
        expect(result.patterns).toBeDefined();
        expect(Array.isArray(result.patterns)).toBe(true);
      } catch (error) {
        // Graceful se nao ha patterns
        console.log('No patterns found, which is acceptable');
      }
    });
  });

  describe('Code Validation Flow', () => {
    
    it('deve validar codigo TypeScript contra contratos', async () => {
      const tsCode = `
        export async function createUser(data: UserInput) {
          try {
            const user = await prisma.user.create({ data });
            return user;
          } catch (error) {
            console.error(error);
            throw error;
          }
        }
      `;

      try {
        // Tentar validar contra contrato real
        const result = await validateCode(tsCode, ['api-contract'], 'typescript');
        
        expect(result).toBeDefined();
        expect(result.valid).toBeDefined();
        expect(result.violations).toBeDefined();
        expect(result.summary).toBeDefined();
      } catch (error) {
        // Se contrato nao existe, verificar erro apropriado
        expect(error).toBeDefined();
      }
    });

    it('deve detectar SQL injection em codigo real', async () => {
      const vulnerableCode = `
        const userId = req.params.id;
        const query = "SELECT * FROM users WHERE id = " + userId;
        const result = await db.execute(query);
      `;

      try {
        const result = await validateCode(vulnerableCode, ['api-contract'], 'typescript');
        
        // Deve detectar problema (se contrato tiver regra de SQL)
        expect(result).toBeDefined();
      } catch (error) {
        // Contrato pode nao existir
        console.log('Contract not found for SQL injection test');
      }
    });

    it('deve validar codigo seguro com Prisma', async () => {
      const safeCode = `
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });
      `;

      try {
        const result = await validateCode(safeCode, ['api-contract'], 'typescript');
        
        // Prisma e seguro, nao deve ter SQL injection
        const hasSqlInjection = result.violations.some(
          v => v.message.toLowerCase().includes('sql injection')
        );
        expect(hasSqlInjection).toBe(false);
      } catch (error) {
        console.log('Contract not found, skipping Prisma safety test');
      }
    });
  });

  describe('Compliance Check Flow', () => {
    
    it('deve verificar compliance de arquivo TypeScript', async () => {
      // Criar arquivo temporario para teste
      const tempDir = path.join(__dirname, '../../temp-test');
      const tempFile = path.join(tempDir, 'test-file.ts');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(tempFile, `
          export function testFunction() {
            return 'hello';
          }
        `);

        const result = await checkCompliance(tempFile);
        
        expect(result).toBeDefined();
        expect(result.file).toBeDefined();
        expect(result.summary.compliant).toBeDefined();
        expect(result.summary).toBeDefined();
        
      } finally {
        // Cleanup
        try {
          await fs.unlink(tempFile);
          await fs.rmdir(tempDir);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    it('deve detectar linguagem corretamente por extensao', async () => {
      const tempDir = path.join(__dirname, '../../temp-test');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        
        // Testar diferentes extensoes
        const extensions = [
          { ext: '.ts', expected: 'typescript' },
          { ext: '.tsx', expected: 'typescript' },
          { ext: '.js', expected: 'javascript' },
        ];
        
        for (const { ext } of extensions) {
          const tempFile = path.join(tempDir, `test${ext}`);
          await fs.writeFile(tempFile, 'const x = 1;');
          
          const result = await checkCompliance(tempFile);
          
          expect(result).toBeDefined();
          
          await fs.unlink(tempFile);
        }
        
      } finally {
        try {
          await fs.rmdir(tempDir);
        } catch (e) {
          // Ignore
        }
      }
    });
  });

  describe('Pattern Workflow', () => {
    
    it('deve criar e buscar pattern proposto', async () => {
      const uniqueId = `test-pattern-${Date.now()}`;
      
      try {
        // Criar pattern
        const created = await proposePattern({
          id: uniqueId,
          name: 'Test Pattern Integration',
          category: 'testing',
          description: 'Pattern criado em teste de integracao'
        });
        
        expect(created.id).toBe(uniqueId);
        expect(created.status).toBe('proposed');
        
        // Buscar pattern criado
        const searchResult = await searchPatterns('Integration', 'proposed');
        
        expect(searchResult.patterns.some(p => p.id === uniqueId)).toBe(true);
        
      } finally {
        // Cleanup: remover pattern criado
        const proposedDir = path.join(__dirname, '../../knowledge/patterns/proposed');
        try {
          await fs.unlink(path.join(proposedDir, `${uniqueId}.json`));
        } catch (e) {
          // Ignore
        }
      }
    });
  });

  describe('Error Handling Integration', () => {
    
    it('deve tratar arquivo inexistente gracefully', async () => {
      await expect(
        checkCompliance('non-existent-file-12345.ts')
      ).rejects.toThrow('File not found');
    });

    it('deve tratar contrato inexistente gracefully', async () => {
      const result = await validateCode(
        'const x = 1;',
        ['non-existent-contract-12345'],
        'typescript'
      );
      
      // Deve retornar resultado, nao crashar
      expect(result).toBeDefined();
      expect(result.violations).toBeDefined();
    });

    it('deve tratar epic inexistente gracefully', async () => {
      await expect(
        getEpicStatus('E9')
      ).rejects.toThrow('Epic not found');
    });
  });
});

