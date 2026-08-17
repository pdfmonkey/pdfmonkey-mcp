import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  TOOLS,
  PROMPTS,
  listTools,
  listPrompts,
  getPrompt,
  callTool
} from '../../src/tools.js';
import { PDFMonkeyClient, PDFMonkeyError } from '../../src/pdfmonkey-client.js';
import type {
  TemplateCard,
  Template,
  DocumentCard,
  WorkspaceCard,
  Snippet,
  CurrentUser
} from '../../src/pdfmonkey-client.js';

// A fully mocked PDFMonkeyClient. Each method is a jest mock so we can assert
// on the mapped arguments and control resolved / rejected values.
type MockClient = {
  [K in keyof PDFMonkeyClient]: PDFMonkeyClient[K] extends (...args: infer A) => infer R
    ? jest.Mock<(...args: A) => R>
    : PDFMonkeyClient[K];
};

function createMockClient(): MockClient {
  return {
    listWorkspaces: jest.fn(),
    listTemplates: jest.fn(),
    getTemplate: jest.fn(),
    createDocument: jest.fn(),
    getDocumentStatus: jest.fn(),
    listDocuments: jest.fn(),
    deleteDocument: jest.fn(),
    generateDocumentAndWait: jest.fn(),
    listSnippets: jest.fn(),
    getSnippet: jest.fn(),
    getCurrentUser: jest.fn()
  } as unknown as MockClient;
}

const sampleTemplateCard: TemplateCard = {
  id: 'tpl_1',
  name: 'Invoice',
  identifier: 'invoice',
  created_at: '2024-01-01T00:00:00Z'
};

const sampleTemplate: Template = {
  id: 'tpl_1',
  name: 'Invoice',
  identifier: 'invoice',
  body_draft: '<h1>Hi</h1>',
  scss_style_draft: 'h1 { color: red; }',
  sample_data_draft: '{"a":1}',
  created_at: '2024-01-01T00:00:00Z'
};

const sampleDocumentCard: DocumentCard = {
  id: 'doc_1',
  status: 'success',
  download_url: 'https://example.com/doc.pdf',
  public_share_link: 'https://example.com/share',
  filename: 'doc.pdf',
  created_at: '2024-01-01T00:00:00Z'
};

const sampleWorkspace: WorkspaceCard = {
  id: 'ws_1',
  name: 'Default',
  created_at: '2024-01-01T00:00:00Z'
};

const sampleSnippet: Snippet = {
  id: 'sn_1',
  name: 'Header',
  identifier: 'header',
  code: '{{ title }}',
  created_at: '2024-01-01T00:00:00Z'
};

const sampleUser: CurrentUser = {
  id: 'usr_1',
  auth_token: 'token',
  available_documents: 100,
  created_at: '2024-01-01T00:00:00Z',
  current_plan: 'Pro',
  email: 'user@example.com',
  paying_customer: true,
  share_links: true,
  updated_at: '2024-01-02T00:00:00Z',
  block_resources: false
};

function asClient(mock: MockClient): PDFMonkeyClient {
  return mock as unknown as PDFMonkeyClient;
}

describe('tool definitions', () => {
  it('exposes exactly 11 tools with the expected names', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toEqual([
      'list_workspaces',
      'list_templates',
      'get_template',
      'generate_document',
      'get_document_status',
      'list_documents',
      'delete_document',
      'list_snippets',
      'get_snippet',
      'get_quota',
      'get_user_info'
    ]);
  });

  it('every tool has a description and an object input schema', () => {
    for (const tool of TOOLS) {
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('listTools returns the TOOLS array', () => {
    expect(listTools()).toEqual({ tools: TOOLS });
  });

  it('listPrompts returns the 4 prompts', () => {
    const result = listPrompts();
    expect(result.prompts).toBe(PROMPTS);
    expect(result.prompts.map((p) => p.name)).toEqual([
      'list-templates-formatted',
      'show-documents-status',
      'generate-invoice',
      'workspace-overview'
    ]);
  });
});

describe('getPrompt', () => {
  it('returns the templates prompt', () => {
    const result = getPrompt('list-templates-formatted');
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.text).toContain('templates');
  });

  it('includes the status filter when provided', () => {
    const result = getPrompt('show-documents-status', { status: 'success' });
    expect(result.messages[0].content.text).toContain('with status "success"');
  });

  it('omits the status filter when not provided', () => {
    const result = getPrompt('show-documents-status');
    expect(result.messages[0].content.text).not.toContain('with status');
  });

  it('includes the template hint when template_id is provided', () => {
    const result = getPrompt('generate-invoice', { template_id: 'tpl_1' });
    expect(result.messages[0].content.text).toContain('using template ID "tpl_1"');
  });

  it('uses the fallback hint when template_id is absent', () => {
    const result = getPrompt('generate-invoice');
    expect(result.messages[0].content.text).toContain('find the right invoice template');
  });

  it('returns the workspace overview prompt', () => {
    const result = getPrompt('workspace-overview');
    expect(result.messages[0].content.text).toContain('Workspace Overview');
  });

  it('throws for an unknown prompt', () => {
    expect(() => getPrompt('nope')).toThrow('Unknown prompt: nope');
  });
});

describe('callTool - happy paths', () => {
  let client: MockClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('list_workspaces returns JSON of workspaces', async () => {
    client.listWorkspaces.mockResolvedValue([sampleWorkspace]);
    const result = await callTool(asClient(client), 'list_workspaces', {});
    expect(client.listWorkspaces).toHaveBeenCalledTimes(1);
    expect(JSON.parse(result.content[0].text)).toEqual([sampleWorkspace]);
    expect(result.isError).toBeUndefined();
  });

  it('list_templates passes workspace_id through', async () => {
    client.listTemplates.mockResolvedValue([sampleTemplateCard]);
    const result = await callTool(asClient(client), 'list_templates', {
      workspace_id: 'ws_1'
    });
    expect(client.listTemplates).toHaveBeenCalledWith('ws_1');
    expect(result.content[0].text).toContain('Invoice');
  });

  it('list_templates works without workspace_id', async () => {
    client.listTemplates.mockResolvedValue([sampleTemplateCard]);
    await callTool(asClient(client), 'list_templates', {});
    expect(client.listTemplates).toHaveBeenCalledWith(undefined);
  });

  it('get_template maps template_id and formats details', async () => {
    client.getTemplate.mockResolvedValue(sampleTemplate);
    const result = await callTool(asClient(client), 'get_template', {
      template_id: 'tpl_1'
    });
    expect(client.getTemplate).toHaveBeenCalledWith('tpl_1');
    expect(result.content[0].text).toContain('Invoice');
  });

  it('generate_document builds params with filename and ttl in meta', async () => {
    client.generateDocumentAndWait.mockResolvedValue(sampleDocumentCard);
    const result = await callTool(asClient(client), 'generate_document', {
      template_id: 'tpl_1',
      workspace_id: 'ws_1',
      payload: { total: 42 },
      filename: 'invoice-001.pdf',
      ttl: '7d',
      meta: { custom: 'x' }
    });
    expect(client.generateDocumentAndWait).toHaveBeenCalledWith({
      document_template_id: 'tpl_1',
      app_id: 'ws_1',
      payload: { total: 42 },
      meta: { custom: 'x', _filename: 'invoice-001.pdf', _ttl: '7d' },
      status: 'pending'
    });
    expect(result.content[0].text).toContain('doc_1');
  });

  it('generate_document omits meta when empty', async () => {
    client.generateDocumentAndWait.mockResolvedValue(sampleDocumentCard);
    await callTool(asClient(client), 'generate_document', {
      template_id: 'tpl_1',
      payload: { a: 1 }
    });
    expect(client.generateDocumentAndWait).toHaveBeenCalledWith({
      document_template_id: 'tpl_1',
      app_id: undefined,
      payload: { a: 1 },
      meta: undefined,
      status: 'pending'
    });
  });

  it('get_document_status maps document_id', async () => {
    client.getDocumentStatus.mockResolvedValue(sampleDocumentCard);
    const result = await callTool(asClient(client), 'get_document_status', {
      document_id: 'doc_1'
    });
    expect(client.getDocumentStatus).toHaveBeenCalledWith('doc_1');
    expect(result.content[0].text).toContain('doc_1');
  });

  it('list_documents maps all filters', async () => {
    client.listDocuments.mockResolvedValue([sampleDocumentCard]);
    await callTool(asClient(client), 'list_documents', {
      page: 2,
      status: 'success',
      template_id: 'tpl_1',
      updated_since: '2024-01-01'
    });
    expect(client.listDocuments).toHaveBeenCalledWith({
      page: 2,
      status: 'success',
      document_template_id: 'tpl_1',
      updated_since: '2024-01-01'
    });
  });

  it('delete_document reports success', async () => {
    client.deleteDocument.mockResolvedValue(undefined);
    const result = await callTool(asClient(client), 'delete_document', {
      document_id: 'doc_1'
    });
    expect(client.deleteDocument).toHaveBeenCalledWith('doc_1');
    expect(JSON.parse(result.content[0].text)).toEqual({
      success: true,
      message: 'Document doc_1 deleted successfully'
    });
  });

  it('list_snippets returns JSON', async () => {
    client.listSnippets.mockResolvedValue([sampleSnippet]);
    const result = await callTool(asClient(client), 'list_snippets', {});
    expect(JSON.parse(result.content[0].text)).toEqual([sampleSnippet]);
  });

  it('get_snippet maps snippet_id', async () => {
    client.getSnippet.mockResolvedValue(sampleSnippet);
    const result = await callTool(asClient(client), 'get_snippet', {
      snippet_id: 'sn_1'
    });
    expect(client.getSnippet).toHaveBeenCalledWith('sn_1');
    expect(JSON.parse(result.content[0].text)).toEqual(sampleSnippet);
  });

  it('get_quota formats the user quota', async () => {
    client.getCurrentUser.mockResolvedValue(sampleUser);
    const result = await callTool(asClient(client), 'get_quota', {});
    expect(client.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toContain('100');
  });

  it('get_user_info formats the user info', async () => {
    client.getCurrentUser.mockResolvedValue(sampleUser);
    const result = await callTool(asClient(client), 'get_user_info', {});
    expect(result.content[0].text).toContain('user@example.com');
  });
});

describe('callTool - validation errors', () => {
  let client: MockClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('get_template requires template_id', async () => {
    const result = await callTool(asClient(client), 'get_template', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('template_id is required');
    expect(client.getTemplate).not.toHaveBeenCalled();
  });

  it('generate_document requires template_id and payload', async () => {
    const result = await callTool(asClient(client), 'generate_document', {
      template_id: 'tpl_1'
    });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe(
      'template_id and payload are required'
    );
  });

  it('get_document_status requires document_id', async () => {
    const result = await callTool(asClient(client), 'get_document_status', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('document_id is required');
  });

  it('delete_document requires document_id', async () => {
    const result = await callTool(asClient(client), 'delete_document', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('document_id is required');
  });

  it('get_snippet requires snippet_id', async () => {
    const result = await callTool(asClient(client), 'get_snippet', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('snippet_id is required');
  });

  it('returns an error for an unknown tool', async () => {
    const result = await callTool(asClient(client), 'does_not_exist', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('Unknown tool: does_not_exist');
  });

  it('handles undefined arguments', async () => {
    const result = await callTool(asClient(client), 'get_template', undefined);
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('template_id is required');
  });
});

describe('callTool - client error paths', () => {
  let client: MockClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('formats a PDFMonkeyError with status code and details', async () => {
    client.listWorkspaces.mockRejectedValue(
      new PDFMonkeyError('Unauthorized', 401, { detail: 'bad key' })
    );
    const result = await callTool(asClient(client), 'list_workspaces', {});
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      error: 'Unauthorized',
      statusCode: 401,
      details: { detail: 'bad key' }
    });
  });

  it('formats a generic Error', async () => {
    client.getTemplate.mockRejectedValue(new Error('boom'));
    const result = await callTool(asClient(client), 'get_template', {
      template_id: 'tpl_1'
    });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('boom');
  });

  it('handles a non-Error thrown value', async () => {
    client.listSnippets.mockRejectedValue('string failure');
    const result = await callTool(asClient(client), 'list_snippets', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('Unknown error occurred');
  });
});
