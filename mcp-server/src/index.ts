#!/usr/bin/env node
import { AuraCoreMCPServer } from './server.js';

async function main() {
  const server = new AuraCoreMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
