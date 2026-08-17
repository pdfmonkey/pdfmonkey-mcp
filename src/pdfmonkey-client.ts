/**
 * PDFMonkey API Client
 *
 * A TypeScript client for interacting with the PDFMonkey API.
 * Based on PDFMonkey API v1 documentation and CLI implementation.
 */

const API_BASE_URL = 'https://api.pdfmonkey.io/api/v1';

export interface PDFMonkeyConfig {
  apiKey: string;
}

export interface DocumentPayload {
  [key: string]: unknown;
}

export interface DocumentMeta {
  _filename?: string;
  _ttl?: string;
  [key: string]: unknown;
}

export interface CreateDocumentParams {
  document_template_id: string;
  payload: DocumentPayload;
  meta?: DocumentMeta;
  status?: 'draft' | 'pending';
}

export interface Document {
  id: string;
  status: 'draft' | 'pending' | 'generating' | 'success' | 'failure';
  document_template_id: string;
  payload: DocumentPayload;
  meta?: DocumentMeta;
  download_url?: string | null;
  preview_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface DocumentCard {
  id: string;
  status: 'draft' | 'pending' | 'generating' | 'success' | 'failure';
  download_url?: string | null;
  public_share_link?: string | null;
  filename?: string;
  meta?: DocumentMeta;
  failure_cause?: string;
  created_at: string;
  updated_at?: string;
}

export interface Template {
  id: string;
  name: string;
  identifier: string;
  body_draft?: string;
  scss_style_draft?: string;
  sample_data_draft?: string;
  created_at: string;
  updated_at?: string;
}

export interface TemplateCard {
  id: string;
  name: string;
  identifier: string;
  created_at: string;
  updated_at?: string;
}

export interface Snippet {
  id: string;
  name: string;
  identifier: string;
  code?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkspaceCard {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
}

export interface CurrentUser {
  id: string;
  auth_token: string;
  available_documents: number;
  company_name?: string;
  country?: string;
  created_at: string;
  current_plan: string;
  current_plan_interval?: string;
  desired_name?: string;
  email: string;
  first_name?: string;
  lang?: string;
  last_name?: string;
  onboarding_completed_at?: string;
  paying_customer: boolean;
  phone_number?: string;
  share_links: boolean;
  trial_ends_on?: string;
  updated_at: string;
  use_case?: string;
  block_resources: boolean;
}

export interface ListDocumentsParams {
  page?: number;
  status?: 'success' | 'failure' | 'draft';
  document_template_id?: string;
  updated_since?: string;
}

export class PDFMonkeyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PDFMonkeyError';
  }
}

export class PDFMonkeyClient {
  private apiKey: string;

  constructor(config: PDFMonkeyConfig) {
    this.apiKey = config.apiKey;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PDFMonkey MCP Server'
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/${endpoint}`;
    const headers = this.buildHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = this.extractErrorMessage(data);
      throw new PDFMonkeyError(
        errorMessage,
        response.status,
        data
      );
    }

    return data as T;
  }

  private extractErrorMessage(errorData: unknown): string {
    if (typeof errorData === 'object' && errorData !== null) {
      const error = errorData as Record<string, unknown>;

      if (error.message && typeof error.message === 'string') {
        return error.message;
      }

      if (error.error && typeof error.error === 'string') {
        return error.error;
      }

      if (error.errors) {
        return JSON.stringify(error.errors);
      }
    }

    return 'Unknown error occurred';
  }

  // User operations
  async getCurrentUser(): Promise<CurrentUser> {
    const response = await this.request<{ current_user: CurrentUser }>('current_user');
    return response.current_user;
  }

  // Workspace operations
  async listWorkspaces(): Promise<WorkspaceCard[]> {
    const response = await this.request<{ workspace_cards: WorkspaceCard[] }>('workspace_cards');
    return response.workspace_cards;
  }

  // Template operations
  async listTemplates(): Promise<TemplateCard[]> {
    const response = await this.request<{ document_template_cards: TemplateCard[] }>('document_template_cards');
    return response.document_template_cards;
  }

  async getTemplate(templateId: string): Promise<Template> {
    const response = await this.request<{ document_template: Template }>(`document_templates/${templateId}`);
    return response.document_template;
  }

  // Document operations
  async createDocument(params: CreateDocumentParams): Promise<Document> {
    const response = await this.request<{ document: Document }>('documents', {
      method: 'POST',
      body: JSON.stringify({
        document: {
          ...params,
          status: params.status || 'pending'
        }
      })
    });
    return response.document;
  }

  async getDocumentStatus(documentId: string): Promise<DocumentCard> {
    const response = await this.request<{ document_card: DocumentCard }>(`document_cards/${documentId}`);
    return response.document_card;
  }

  async listDocuments(params: ListDocumentsParams = {}): Promise<DocumentCard[]> {
    const queryParams = new URLSearchParams();

    if (params.page) {
      queryParams.append('page[number]', params.page.toString());
    }
    if (params.status) {
      queryParams.append('q[status]', params.status);
    }
    if (params.document_template_id) {
      queryParams.append('q[document_template_id]', params.document_template_id);
    }
    if (params.updated_since) {
      queryParams.append('q[updated_at_gteq]', params.updated_since);
    }

    const query = queryParams.toString();
    const endpoint = query ? `document_cards?${query}` : 'document_cards';

    const response = await this.request<{ document_cards: DocumentCard[] }>(endpoint);
    return response.document_cards;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.request<void>(`documents/${documentId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Generate a document and poll until completion
   * Implements the recommended async workflow with polling
   */
  async generateDocumentAndWait(
    params: CreateDocumentParams,
    options: {
      pollingInterval?: number;
      maxAttempts?: number;
    } = {}
  ): Promise<DocumentCard> {
    const pollingInterval = options.pollingInterval || 1500; // 1.5 seconds
    const maxAttempts = options.maxAttempts || 120; // 3 minutes max

    // Step 1: Create document
    const document = await this.createDocument(params);

    // Step 2: Poll for completion
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const documentCard = await this.getDocumentStatus(document.id);

      if (documentCard.status === 'success') {
        return documentCard;
      } else if (documentCard.status === 'failure') {
        throw new PDFMonkeyError(
          `Document generation failed: ${documentCard.failure_cause || 'Unknown error'}`,
          undefined,
          documentCard
        );
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }

    throw new PDFMonkeyError(
      'Timeout waiting for document generation',
      undefined,
      { documentId: document.id }
    );
  }

  // Snippet operations
  async listSnippets(): Promise<Snippet[]> {
    const response = await this.request<{ snippets: Snippet[] }>('snippets');
    return response.snippets;
  }

  async getSnippet(snippetId: string): Promise<Snippet> {
    const response = await this.request<{ snippet: Snippet }>(`snippets/${snippetId}`);
    return response.snippet;
  }
}
