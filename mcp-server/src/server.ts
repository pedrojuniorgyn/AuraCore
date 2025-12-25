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
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name } = request.params;

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

      // Parse URI (contract://api-contract ou adr://0001-sqlserver-only)
      const [protocol, id] = uri.split('://');

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
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AuraCore MCP Server v1.0.0 running');
  }
}
