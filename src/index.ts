#!/usr/bin/env node

/**
 * PDFMonkey MCP Server
 *
 * An MCP server that provides tools for interacting with the PDFMonkey API.
 * Enables AI assistants to generate PDFs, manage templates, and handle documents.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import {
  PDFMonkeyClient,
  CreateDocumentParams,
  ListDocumentsParams,
  PDFMonkeyError
} from './pdfmonkey-client.js';
import {
  formatTemplatesTable,
  formatDocumentsTable,
  formatDocumentDetails,
  formatTemplateDetails,
  formatQuota,
  formatUserInfo
} from './formatters.js';

// Get API key from environment variable
const API_KEY = process.env.PDFMONKEY_API_KEY;

if (!API_KEY) {
  console.error('Error: PDFMONKEY_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize PDFMonkey client
const client = new PDFMonkeyClient({ apiKey: API_KEY });

// Define MCP tools
const TOOLS: Tool[] = [
  // Workspace tools
  {
    name: 'list_workspaces',
    description: 'List all PDFMonkey workspaces accessible with the current API key',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // Template tools
  {
    name: 'list_templates',
    description: 'List all PDF templates available in the workspace',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_template',
    description: 'Get detailed information about a specific template including HTML, CSS, and sample data',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: {
          type: 'string',
          description: 'The ID of the template to retrieve'
        }
      },
      required: ['template_id']
    }
  },

  // Document generation tools
  {
    name: 'generate_document',
    description: 'Generate a PDF document from a template with provided data. This uses async generation with automatic polling until completion. Returns the download URL when ready.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: {
          type: 'string',
          description: 'The ID of the template to use for generation'
        },
        payload: {
          type: 'object',
          description: 'The data to merge into the template (must match template structure)',
          additionalProperties: true
        },
        filename: {
          type: 'string',
          description: 'Optional filename for the generated PDF (e.g., "invoice-001.pdf")'
        },
        ttl: {
          type: 'string',
          description: 'Optional time-to-live for automatic deletion (e.g., "7d", "2h", "30m")'
        },
        meta: {
          type: 'object',
          description: 'Optional additional metadata to store with the document',
          additionalProperties: true
        }
      },
      required: ['template_id', 'payload']
    }
  },
  {
    name: 'get_document_status',
    description: 'Check the generation status of a document and get its download URL if ready',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'The ID of the document to check'
        }
      },
      required: ['document_id']
    }
  },
  {
    name: 'list_documents',
    description: 'List documents with optional filtering by status, template, or update time',
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          description: 'Page number for pagination (default: 1)'
        },
        status: {
          type: 'string',
          enum: ['draft', 'pending', 'generating', 'success', 'failure'],
          description: 'Filter by document status'
        },
        template_id: {
          type: 'string',
          description: 'Filter by template ID'
        },
        updated_since: {
          type: 'string',
          description: 'Filter by update timestamp (ISO 8601 format)'
        }
      },
      required: []
    }
  },
  {
    name: 'delete_document',
    description: 'Permanently delete a document and its generated PDF',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'The ID of the document to delete'
        }
      },
      required: ['document_id']
    }
  },

  // Snippet tools
  {
    name: 'list_snippets',
    description: 'List all reusable Liquid code snippets in the workspace',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_snippet',
    description: 'Get the Liquid code of a specific snippet',
    inputSchema: {
      type: 'object',
      properties: {
        snippet_id: {
          type: 'string',
          description: 'The ID of the snippet to retrieve'
        }
      },
      required: ['snippet_id']
    }
  },

  // User and quota tools
  {
    name: 'get_quota',
    description: 'Get current quota and plan information for the account',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_user_info',
    description: 'Get complete user account information including personal details, plan, and settings',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Define MCP prompts for better formatting guidance
const PROMPTS = [
  {
    name: 'list-templates-formatted',
    description: 'Display all PDF templates in a clean, readable format with key information',
    arguments: []
  },
  {
    name: 'show-documents-status',
    description: 'Show documents with their status, download links, and metadata in a structured way',
    arguments: [
      {
        name: 'status',
        description: 'Filter by status (success, failure, draft)',
        required: false
      }
    ]
  },
  {
    name: 'generate-invoice',
    description: 'Guide the user through generating an invoice PDF with proper formatting',
    arguments: [
      {
        name: 'template_id',
        description: 'The template ID to use for the invoice',
        required: false
      }
    ]
  },
  {
    name: 'workspace-overview',
    description: 'Display a comprehensive overview of the workspace including quota, templates, and recent documents',
    arguments: []
  }
];

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
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle prompt listing
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'list-templates-formatted':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'List all my PDFMonkey templates and display them in a clean table format with columns: Name, ID, Created Date. After the table, provide a brief summary of the total number of templates.'
            }
          }
        ]
      };

    case 'show-documents-status':
      const statusFilter = args?.status ? ` with status "${args.status}"` : '';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `List all my PDFMonkey documents${statusFilter} and display them in a structured format:\n\n` +
                    `For each document, show:\n` +
                    `- Document ID\n` +
                    `- Status (with emoji: ✅ success, ❌ failure, 📝 draft, ⏳ pending/generating)\n` +
                    `- Filename\n` +
                    `- Download URL (if available)\n` +
                    `- Public share link (if available)\n` +
                    `- Created date\n\n` +
                    `Group documents by status and provide a summary count for each status.`
            }
          }
        ]
      };

    case 'generate-invoice':
      const templateHint = args?.template_id
        ? ` using template ID "${args.template_id}"`
        : ' (first, help me find the right invoice template)';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to generate an invoice PDF${templateHint}. Please guide me through the process:\n\n` +
                    `1. If I haven't specified a template, show me available templates that look like invoice templates\n` +
                    `2. Ask me for the invoice data I want to include (customer info, items, amounts, etc.)\n` +
                    `3. Generate the PDF with proper error handling\n` +
                    `4. Once generated, show me:\n` +
                    `   - The download URL (clearly formatted)\n` +
                    `   - The public share link if available\n` +
                    `   - Confirmation that the invoice was created successfully\n\n` +
                    `Format all output in a clear, professional manner.`
            }
          }
        ]
      };

    case 'workspace-overview':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Provide a comprehensive overview of my PDFMonkey workspace. Structure the information as follows:\n\n` +
                    `## 📊 Workspace Overview\n\n` +
                    `### Workspace Information\n` +
                    `- Display workspace details (name, ID, created date)\n\n` +
                    `### 📄 Templates\n` +
                    `- Total number of templates\n` +
                    `- List top 5 most recently updated templates\n\n` +
                    `### 📦 Recent Documents\n` +
                    `- Total documents count by status\n` +
                    `- List last 5 generated documents with status\n\n` +
                    `### 🧩 Snippets\n` +
                    `- Total number of snippets available\n\n` +
                    `Use emojis and clear formatting to make the overview easy to read.`
            }
          }
        ]
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      // Workspace operations
      case 'list_workspaces': {
        const workspaces = await client.listWorkspaces();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workspaces, null, 2)
            }
          ]
        };
      }

      // Template operations
      case 'list_templates': {
        const templates = await client.listTemplates();
        return {
          content: [
            {
              type: 'text',
              text: formatTemplatesTable(templates)
            }
          ]
        };
      }

      case 'get_template': {
        const templateId = args?.template_id as string;
        if (!templateId) {
          throw new Error('template_id is required');
        }
        const template = await client.getTemplate(templateId);
        return {
          content: [
            {
              type: 'text',
              text: formatTemplateDetails(template)
            }
          ]
        };
      }

      // Document operations
      case 'generate_document': {
        const templateId = args?.template_id as string;
        const payload = args?.payload as Record<string, unknown>;
        const filename = args?.filename as string | undefined;
        const ttl = args?.ttl as string | undefined;
        const customMeta = args?.meta as Record<string, unknown> | undefined;

        if (!templateId || !payload) {
          throw new Error('template_id and payload are required');
        }

        const meta: Record<string, unknown> = customMeta || {};
        if (filename) {
          meta._filename = filename;
        }
        if (ttl) {
          meta._ttl = ttl;
        }

        const params: CreateDocumentParams = {
          document_template_id: templateId,
          payload,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
          status: 'pending'
        };

        const documentCard = await client.generateDocumentAndWait(params);
        return {
          content: [
            {
              type: 'text',
              text: formatDocumentDetails(documentCard)
            }
          ]
        };
      }

      case 'get_document_status': {
        const documentId = args?.document_id as string;
        if (!documentId) {
          throw new Error('document_id is required');
        }
        const documentCard = await client.getDocumentStatus(documentId);
        return {
          content: [
            {
              type: 'text',
              text: formatDocumentDetails(documentCard)
            }
          ]
        };
      }

      case 'list_documents': {
        const params: ListDocumentsParams = {
          page: args?.page as number | undefined,
          status: args?.status as 'draft' | 'pending' | 'generating' | 'success' | 'failure' | undefined,
          document_template_id: args?.template_id as string | undefined,
          updated_since: args?.updated_since as string | undefined
        };
        const documents = await client.listDocuments(params);
        return {
          content: [
            {
              type: 'text',
              text: formatDocumentsTable(documents)
            }
          ]
        };
      }

      case 'delete_document': {
        const documentId = args?.document_id as string;
        if (!documentId) {
          throw new Error('document_id is required');
        }
        await client.deleteDocument(documentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Document ${documentId} deleted successfully` })
            }
          ]
        };
      }

      // Snippet operations
      case 'list_snippets': {
        const snippets = await client.listSnippets();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(snippets, null, 2)
            }
          ]
        };
      }

      case 'get_snippet': {
        const snippetId = args?.snippet_id as string;
        if (!snippetId) {
          throw new Error('snippet_id is required');
        }
        const snippet = await client.getSnippet(snippetId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(snippet, null, 2)
            }
          ]
        };
      }

      // User and quota operations
      case 'get_quota': {
        const user = await client.getCurrentUser();
        return {
          content: [
            {
              type: 'text',
              text: formatQuota(user)
            }
          ]
        };
      }

      case 'get_user_info': {
        const user = await client.getCurrentUser();
        return {
          content: [
            {
              type: 'text',
              text: formatUserInfo(user)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof PDFMonkeyError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error.message,
              statusCode: error.statusCode,
              details: error.details
            }, null, 2)
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }, null, 2)
        }
      ],
      isError: true
    };
  }
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
