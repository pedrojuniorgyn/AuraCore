import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { listContracts, getContract } from './resources/contracts.js';
import { listADRs, getADR } from './resources/adrs.js';
import { checkCursorIssues, IssueCheckResult } from './tools/check-cursor-issues.js';

export class AuraCoreMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'auracore-knowledge',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'ping',
          description: 'Test tool - responds with pong',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'check_cursor_issues',
          description: 'Verifica issues identificados pelo Cursor apos operacoes criticas',
          inputSchema: {
            type: 'object',
            properties: {
              context: {
                type: 'string',
                description: 'Contexto da verificacao',
              },
              scope: {
                type: 'string',
                description: 'Escopo da verificacao',
                default: '.',
              },
            },
            required: ['context'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'ping') {
        return {
          content: [
            {
              type: 'text',
              text: 'PONG! AuraCore MCP Server is working!',
            },
          ],
        };
      }

      if (name === 'check_cursor_issues') {
        // Validar argumentos
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments for check_cursor_issues');
        }

        const typedArgs = args as { context?: unknown; scope?: unknown };
        const context = typedArgs.context;

        if (!context || typeof context !== 'string' || context.trim() === '') {
          throw new Error('check_cursor_issues requires non-empty context parameter');
        }

        const scope = typeof typedArgs.scope === 'string' ? typedArgs.scope : '.';

        const result = await checkCursorIssues(context, scope);

        return {
          content: [
            {
              type: 'text',
              text: formatIssueCheckResult(result),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });

    // Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const contracts = await listContracts();
      const adrs = await listADRs();
      
      return {
        resources: [...contracts, ...adrs],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        // Parse URI (contract://api-contract ou adr://0001-sqlserver-only)
        const [protocol, id] = uri.split('://');

        if (!id) {
          throw new Error(`Invalid URI format: ${uri}. Expected protocol://id`);
        }

        if (protocol === 'contract') {
          const content = await getContract(id);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: content,
              },
            ],
          };
        }

        if (protocol === 'adr') {
          const content = await getADR(id);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: content,
              },
            ],
          };
        }

        throw new Error(`Unknown resource protocol: ${protocol}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error reading resource ${uri}:`, errorMessage);
        throw new Error(`Failed to read resource: ${errorMessage}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AuraCore MCP Server v1.0.0 running');
  }
}

function formatIssueCheckResult(result: IssueCheckResult): string {
  let output = `VERIFICACAO DE ISSUES - ${result.context}\n\n`;
  output += `Timestamp: ${result.timestamp}\n`;
  output += `Escopo: ${result.scope}\n`;
  output += `Total: ${result.totalIssues}\n\n`;

  if (result.critical.length > 0) {
    output += `CRITICO (${result.critical.length}):\n`;
    result.critical.forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    output += '\n';
  }

  if (result.high.length > 0) {
    output += `ALTA (${result.high.length}):\n`;
    result.high.forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    output += '\n';
  }

  if (result.medium.length > 0) {
    output += `MEDIA (${result.medium.length}):\n`;
    result.medium.slice(0, 3).forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    if (result.medium.length > 3) {
      output += `  ... e mais ${result.medium.length - 3} issue(s)\n`;
    }
    output += '\n';
  }

  if (result.low.length > 0) {
    output += `BAIXA (${result.low.length}):\n`;
    result.low.slice(0, 3).forEach(issue => {
      output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
    });
    if (result.low.length > 3) {
      output += `  ... e mais ${result.low.length - 3} issue(s)\n`;
    }
    output += '\n';
  }

  output += `\nRECOMENDACAO: ${result.recommendation}`;
  return output;
}
