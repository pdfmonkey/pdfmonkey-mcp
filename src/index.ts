#!/usr/bin/env node

/**
 * PDFMonkey MCP Server
 *
 * An MCP server that provides tools for interacting with the PDFMonkey API.
 * Enables AI assistants to generate PDFs, manage templates, and handle documents.
 *
 * This file is the executable bootstrap only: it reads configuration, creates
 * the client and server, wires the MCP request handlers to the pure dispatch
 * functions in ./tools.js, and connects the stdio transport. All tool/prompt
 * definitions and dispatch logic live in ./tools.js so they can be unit-tested.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CallToolResult,
  GetPromptResult
} from '@modelcontextprotocol/sdk/types.js';
import { PDFMonkeyClient } from './pdfmonkey-client.js';
import { listTools, listPrompts, getPrompt, callTool } from './tools.js';

// Get API key from environment variable
const API_KEY = process.env.PDFMONKEY_API_KEY;

if (!API_KEY) {
  console.error('Error: PDFMONKEY_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize PDFMonkey client
const client = new PDFMonkeyClient({ apiKey: API_KEY });

// Initialize MCP server
const server = new Server(
  {
    name: 'pdfmonkey-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {},
      prompts: {}
    }
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => listTools());

// Handle prompt listing
server.setRequestHandler(ListPromptsRequestSchema, async () => listPrompts());

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  return getPrompt(request.params.name, request.params.arguments) as GetPromptResult;
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return (await callTool(client, request.params.name, request.params.arguments)) as CallToolResult;
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PDFMonkey MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
