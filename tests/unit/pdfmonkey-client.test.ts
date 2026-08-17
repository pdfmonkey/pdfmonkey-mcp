import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PDFMonkeyClient, PDFMonkeyError } from '../../src/pdfmonkey-client.js';
import type { Template, DocumentCard, CurrentUser } from '../../src/pdfmonkey-client.js';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('PDFMonkeyClient', () => {
  let client: PDFMonkeyClient;
  const API_KEY = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    client = new PDFMonkeyClient({ apiKey: API_KEY });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with API key', () => {
      expect(client).toBeInstanceOf(PDFMonkeyClient);
    });
  });

  describe('HTTP Error Handling', () => {
    it('should throw PDFMonkeyError on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' })
      } as Response);

      const promise = client.listTemplates();
      await expect(promise).rejects.toThrow(PDFMonkeyError);
      await expect(promise).rejects.toThrow('Invalid API key');
    });

    it('should throw PDFMonkeyError on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' })
      } as Response);

      await expect(client.getTemplate('nonexistent')).rejects.toThrow(PDFMonkeyError);
    });

    it('should throw PDFMonkeyError on 429 Rate Limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response);

      await expect(client.listTemplates()).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw PDFMonkeyError on 500 Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal error' })
      } as Response);

      await expect(client.listTemplates()).rejects.toThrow('Internal error');
    });

    it('should handle error response without JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Invalid JSON'); }
      } as Response);

      await expect(client.listTemplates()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('listWorkspaces', () => {
    it('should fetch workspaces successfully', async () => {
      const mockWorkspaces = [
        { id: 'wks_1', name: 'Workspace 1', created_at: '2024-01-01T00:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspace_cards: mockWorkspaces })
      } as Response);

      const result = await client.listWorkspaces();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/workspace_cards',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${API_KEY}`
          })
        })
      );
      expect(result).toEqual(mockWorkspaces);
    });
  });

  describe('listTemplates', () => {
    it('should fetch templates successfully', async () => {
      const mockTemplates = [
        { id: 'tpl_1', name: 'Template 1', identifier: 'test', created_at: '2024-01-01T00:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_template_cards: mockTemplates })
      } as Response);

      const result = await client.listTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/document_template_cards',
        expect.any(Object)
      );
    });

    it('should scope templates by workspace_id with page=all', async () => {
      const mockTemplates = [
        { id: 'tpl_1', name: 'Template 1', identifier: 'test', created_at: '2024-01-01T00:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_template_cards: mockTemplates })
      } as Response);

      const result = await client.listTemplates('wks_42');

      expect(result).toEqual(mockTemplates);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q%5Bworkspace_id%5D=wks_42'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=all'),
        expect.any(Object)
      );
    });
  });

  describe('getTemplate', () => {
    it('should fetch single template', async () => {
      const mockTemplate: Template = {
        id: 'tpl_123',
        name: 'Invoice',
        identifier: 'invoice',
        body_draft: '<html></html>',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_template: mockTemplate })
      } as Response);

      const result = await client.getTemplate('tpl_123');

      expect(result).toEqual(mockTemplate);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/document_templates/tpl_123',
        expect.any(Object)
      );
    });
  });

  describe('createDocument', () => {
    it('should create document successfully', async () => {
      const mockDocument: DocumentCard = {
        id: 'doc_123',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document: mockDocument })
      } as Response);

      const params = {
        document_template_id: 'tpl_123',
        payload: { customer: { name: 'John' } },
        status: 'pending' as const
      };

      const result = await client.createDocument(params);

      expect(result).toEqual(mockDocument);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/documents',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ document: { ...params, status: 'pending' } })
        })
      );
    });

    it('should include app_id in the document body when provided', async () => {
      const mockDocument: DocumentCard = {
        id: 'doc_456',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document: mockDocument })
      } as Response);

      const params = {
        document_template_id: 'tpl_123',
        app_id: 'wks_99',
        payload: { customer: { name: 'John' } },
        status: 'pending' as const
      };

      await client.createDocument(params);

      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(body.document.app_id).toBe('wks_99');
    });
  });

  describe('getDocumentStatus', () => {
    it('should fetch document status', async () => {
      const mockDocument: DocumentCard = {
        id: 'doc_123',
        status: 'success',
        download_url: 'https://example.com/doc.pdf',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_card: mockDocument })
      } as Response);

      const result = await client.getDocumentStatus('doc_123');

      expect(result).toEqual(mockDocument);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/document_cards/doc_123',
        expect.any(Object)
      );
    });
  });

  describe('listDocuments', () => {
    it('should list documents without filters', async () => {
      const mockDocuments = [
        { id: 'doc_1', status: 'success' as const, created_at: '2024-01-01T00:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_cards: mockDocuments })
      } as Response);

      const result = await client.listDocuments({});

      expect(result).toEqual(mockDocuments);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/document_cards',
        expect.any(Object)
      );
    });

    it('should list documents with filters', async () => {
      const mockDocuments = [
        { id: 'doc_1', status: 'success' as const, created_at: '2024-01-01T00:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_cards: mockDocuments })
      } as Response);

      const result = await client.listDocuments({
        status: 'success',
        page: 2,
        document_template_id: 'tpl_123'
      });

      expect(result).toEqual(mockDocuments);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q%5Bstatus%5D=success'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page%5Bnumber%5D=2'),
        expect.any(Object)
      );
    });

    it('should map updated_since to the Ransack updated_at_gteq predicate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_cards: [] })
      } as Response);

      await client.listDocuments({ updated_since: '2026-01-01T00:00:00Z' });

      const [calledUrl] = mockFetch.mock.calls[0];
      expect(calledUrl).toContain('q%5Bupdated_at_gteq%5D=');
      expect(calledUrl).not.toContain('updated_since');
    });

    it('should accept pending and generating status filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_cards: [] })
      } as Response);

      await client.listDocuments({ status: 'generating' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q%5Bstatus%5D=generating'),
        expect.any(Object)
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response);

      await client.deleteDocument('doc_123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/documents/doc_123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('listSnippets', () => {
    it('should fetch snippets successfully', async () => {
      const mockSnippets = [
        { id: 'snp_1', name: 'Header', identifier: 'header', created_at: '2024-01-01T00:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ snippets: mockSnippets })
      } as Response);

      const result = await client.listSnippets();

      expect(result).toEqual(mockSnippets);
    });
  });

  describe('getSnippet', () => {
    it('should fetch single snippet', async () => {
      const mockSnippet = {
        id: 'snp_123',
        name: 'Header',
        identifier: 'header',
        code: '{% if customer %}...',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ snippet: mockSnippet })
      } as Response);

      const result = await client.getSnippet('snp_123');

      expect(result).toEqual(mockSnippet);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user info', async () => {
      const mockUser: CurrentUser = {
        id: 'usr_123',
        auth_token: 'token',
        email: 'test@example.com',
        available_documents: 100,
        current_plan: 'pro',
        paying_customer: true,
        share_links: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        block_resources: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current_user: mockUser })
      } as Response);

      const result = await client.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pdfmonkey.io/api/v1/current_user',
        expect.any(Object)
      );
    });
  });

  describe('generateDocumentAndWait', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should poll until document is ready (success)', async () => {
      const createResponse: DocumentCard = {
        id: 'doc_123',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      };

      const successResponse: DocumentCard = {
        id: 'doc_123',
        status: 'success',
        download_url: 'https://example.com/doc.pdf',
        created_at: '2024-01-01T00:00:00Z'
      };

      // Mock create document
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document: createResponse })
      } as Response);

      // Mock first poll (still generating)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_card: { ...createResponse, status: 'generating' } })
      } as Response);

      // Mock second poll (success)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_card: successResponse })
      } as Response);

      const params = {
        document_template_id: 'tpl_123',
        payload: { customer: { name: 'John' } },
        status: 'pending' as const
      };

      const promise = client.generateDocumentAndWait(params);

      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toEqual(successResponse);
      expect(result.status).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(3); // create + 2 polls
    });

    it('should throw error on document generation failure', async () => {
      const createResponse: DocumentCard = {
        id: 'doc_fail',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      };

      const failureResponse: DocumentCard = {
        id: 'doc_fail',
        status: 'failure',
        failure_cause: 'Template error',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document: createResponse })
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_card: failureResponse })
      } as Response);

      const params = {
        document_template_id: 'tpl_123',
        payload: {},
        status: 'pending' as const
      };

      const promise = client.generateDocumentAndWait(params);
      const expectation = expect(promise).rejects.toThrow('Document generation failed: Template error');

      await jest.runAllTimersAsync();
      await expectation;
    });

    it('should timeout after 3 minutes', async () => {
      const createResponse: DocumentCard = {
        id: 'doc_timeout',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      };

      // Mock create document (first call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document: createResponse })
      } as Response);

      // Mock all subsequent status checks with generating status
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ document_card: { ...createResponse, status: 'generating' } })
      } as Response);

      const params = {
        document_template_id: 'tpl_123',
        payload: {},
        status: 'pending' as const
      };

      const promise = client.generateDocumentAndWait(params);
      const expectation = expect(promise).rejects.toThrow('Timeout waiting for document generation');

      // Run all timers to exhaust max attempts
      await jest.runAllTimersAsync();
      await expectation;
    });
  });

  describe('PDFMonkeyError', () => {
    it('should create error with all properties', () => {
      const error = new PDFMonkeyError('Test error', 404, { detail: 'Not found' });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ detail: 'Not found' });
      expect(error.name).toBe('PDFMonkeyError');
    });
  });
});
