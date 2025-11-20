import { describe, it, expect } from '@jest/globals';
import {
  formatTemplatesTable,
  formatDocumentsTable,
  formatDocumentDetails,
  formatTemplateDetails,
  formatQuota,
  formatUserInfo,
  formatUser
} from '../../src/formatters.js';
import type { TemplateCard, DocumentCard, Template, Document, CurrentUser } from '../../src/pdfmonkey-client.js';

describe('formatTemplatesTable', () => {
  it('should format empty template list', () => {
    const result = formatTemplatesTable([]);
    expect(result).toContain('📄 No templates found');
  });

  it('should format single template', () => {
    const templates: TemplateCard[] = [{
      id: 'tpl_123',
      name: 'Invoice Template',
      identifier: 'invoice',
      created_at: '2024-01-15T10:30:00Z'
    }];

    const result = formatTemplatesTable(templates);
    expect(result).toContain('## 📄 Templates (1 total)');
    expect(result).toContain('| ID | Name | Identifier | Last Updated |');
    expect(result).toContain('| tpl_123... | Invoice Template | invoice | 1/15/2024 |');
  });

  it('should format multiple templates', () => {
    const templates: TemplateCard[] = [
      {
        id: 'tpl_123',
        name: 'Invoice Template',
        identifier: 'invoice',
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 'tpl_456',
        name: 'Receipt Template',
        identifier: 'receipt',
        created_at: '2024-01-16T10:30:00Z'
      }
    ];

    const result = formatTemplatesTable(templates);
    expect(result).toContain('## 📄 Templates (2 total)');
    expect(result).toContain('Invoice Template');
    expect(result).toContain('Receipt Template');
  });

  it('should truncate long template IDs', () => {
    const templates: TemplateCard[] = [{
      id: 'tpl_verylongidthatshouldbetruncat',
      name: 'Test',
      identifier: 'test',
      created_at: '2024-01-15T10:30:00Z'
    }];

    const result = formatTemplatesTable(templates);
    expect(result).toContain('tpl_very...');
  });
});

describe('formatDocumentsTable', () => {
  it('should format empty document list', () => {
    const result = formatDocumentsTable([]);
    expect(result).toContain('📦 No documents found');
  });

  it('should format success document with all fields', () => {
    const documents: DocumentCard[] = [{
      id: 'doc_123',
      status: 'success',
      download_url: 'https://example.com/doc.pdf',
      public_share_link: 'https://example.com/share',
      filename: 'invoice.pdf',
      created_at: '2024-01-15T10:30:00Z'
    }];

    const result = formatDocumentsTable(documents);
    expect(result).toContain('## 📦 Documents (1 total)');
    expect(result).toContain('✅ success');
    expect(result).toContain('[Download](https://example.com/doc.pdf)');
    expect(result).toContain('[Share](https://example.com/share)');
    expect(result).toContain('invoice.pdf');
  });

  it('should handle missing filename with fallback', () => {
    const documents: DocumentCard[] = [{
      id: 'doc_123',
      status: 'success',
      created_at: '2024-01-15T10:30:00Z'
    }];

    const result = formatDocumentsTable(documents);
    expect(result).toContain('document.pdf');
  });

  it('should use meta._filename when filename is missing', () => {
    const documents: DocumentCard[] = [{
      id: 'doc_123',
      status: 'success',
      meta: { _filename: 'custom.pdf' },
      created_at: '2024-01-15T10:30:00Z'
    }];

    const result = formatDocumentsTable(documents);
    expect(result).toContain('custom.pdf');
  });

  it('should show correct emoji for each status', () => {
    const statuses: Array<'success' | 'failure' | 'pending' | 'generating' | 'draft'> =
      ['success', 'failure', 'pending', 'generating', 'draft'];
    const emojis = ['✅', '❌', '⏳', '⏳', '📝'];

    statuses.forEach((status, index) => {
      const documents: DocumentCard[] = [{
        id: 'doc_123',
        status,
        created_at: '2024-01-15T10:30:00Z'
      }];

      const result = formatDocumentsTable(documents);
      expect(result).toContain(`${emojis[index]} ${status}`);
    });
  });

  it('should handle missing download URL and share link', () => {
    const documents: DocumentCard[] = [{
      id: 'doc_123',
      status: 'draft',
      created_at: '2024-01-15T10:30:00Z'
    }];

    const result = formatDocumentsTable(documents);
    expect(result).toContain('| - | - |');
  });
});

describe('formatDocumentDetails', () => {
  it('should format success document', () => {
    const document: DocumentCard = {
      id: 'doc_123abc',
      status: 'success',
      download_url: 'https://example.com/doc.pdf',
      public_share_link: 'https://example.com/share',
      filename: 'invoice.pdf',
      created_at: '2024-01-15T10:30:25Z'
    };

    const result = formatDocumentDetails(document);
    expect(result).toContain('## ✅ Document Details');
    expect(result).toContain('**ID:** `doc_123abc`');
    expect(result).toContain('**Status:** ✅ SUCCESS');
    expect(result).toContain('**Filename:** invoice.pdf');
    expect(result).toContain('**Download URL:** https://example.com/doc.pdf');
    expect(result).toContain('**Public Share Link:** https://example.com/share');
  });

  it('should format failure document with error', () => {
    const document: DocumentCard = {
      id: 'doc_fail',
      status: 'failure',
      failure_cause: 'Template rendering error',
      created_at: '2024-01-15T10:30:25Z'
    };

    const result = formatDocumentDetails(document);
    expect(result).toContain('## ❌ Document Details');
    expect(result).toContain('### ❌ Failure Information');
    expect(result).toContain('**Cause:** Template rendering error');
  });

  it('should format pending document', () => {
    const document: DocumentCard = {
      id: 'doc_pending',
      status: 'pending',
      created_at: '2024-01-15T10:30:25Z'
    };

    const result = formatDocumentDetails(document);
    expect(result).toContain('## ⏳ Document Details');
    expect(result).toContain('**Status:** ⏳ PENDING');
  });

  it('should handle null download_url', () => {
    const document: DocumentCard = {
      id: 'doc_null',
      status: 'success',
      download_url: null,
      created_at: '2024-01-15T10:30:25Z'
    };

    const result = formatDocumentDetails(document);
    expect(result).toContain('*No download URL available yet*');
  });
});

describe('formatTemplateDetails', () => {
  it('should format complete template', () => {
    const template: Template = {
      id: 'tpl_123',
      name: 'Invoice Template',
      identifier: 'invoice',
      body_draft: '<html><body>{{customer.name}}</body></html>',
      scss_style_draft: 'body { margin: 0; }',
      sample_data_draft: '{"customer": {"name": "John Doe"}}',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-16T14:20:00Z'
    };

    const result = formatTemplateDetails(template);
    expect(result).toContain('## 📄 Template: Invoice Template');
    expect(result).toContain('**ID:** `tpl_123`');
    expect(result).toContain('**Identifier:** invoice');
    expect(result).toContain('### 📝 HTML Template');
    expect(result).toContain('```html');
    expect(result).toContain('{{customer.name}}');
    expect(result).toContain('### 🎨 CSS Styles');
    expect(result).toContain('```scss');
    expect(result).toContain('body { margin: 0; }');
    expect(result).toContain('### 📊 Sample Data (Properties)');
    expect(result).toContain('```json');
    expect(result).toContain('"customer"');
  });

  it('should handle missing optional fields', () => {
    const template: Template = {
      id: 'tpl_minimal',
      name: 'Minimal Template',
      identifier: 'minimal',
      created_at: '2024-01-15T10:30:00Z'
    };

    const result = formatTemplateDetails(template);
    expect(result).toContain('Minimal Template');
    expect(result).toContain('**HTML Body:** *Not defined*');
    expect(result).toContain('**CSS Styles:** *Not defined*');
    expect(result).toContain('**Sample Data:** *Not defined*');
  });
});

describe('formatQuota', () => {
  it('should format user with trial', () => {
    const user: CurrentUser = {
      id: 'usr_123',
      auth_token: 'token',
      email: 'test@example.com',
      available_documents: 100,
      current_plan: 'free',
      paying_customer: false,
      share_links: false,
      trial_ends_on: '2024-02-01',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      block_resources: false
    };

    const result = formatQuota(user);
    expect(result).toContain('## 📊 Quota Information');
    expect(result).toContain('**Available Documents:** 100');
    expect(result).toContain('**Current Plan:** free');
    expect(result).toContain('**Paying Customer:** No');
    expect(result).toContain('**Trial Ends:** 2/1/2024');
    expect(result).toContain('**Share Links Enabled:** No');
  });

  it('should format paying customer without trial', () => {
    const user: CurrentUser = {
      id: 'usr_456',
      auth_token: 'token',
      email: 'premium@example.com',
      available_documents: 1000,
      current_plan: 'pro',
      current_plan_interval: 'monthly',
      paying_customer: true,
      share_links: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      block_resources: false
    };

    const result = formatQuota(user);
    expect(result).toContain('**Available Documents:** 1000');
    expect(result).toContain('**Current Plan:** pro (monthly');
    expect(result).toContain('**Paying Customer:** Yes');
    expect(result).toContain('**Share Links Enabled:** Yes');
    expect(result).not.toContain('Trial');
  });
});

describe('formatUserInfo', () => {
  it('should format complete user info', () => {
    const user: CurrentUser = {
      id: 'usr_123',
      auth_token: 'token',
      email: 'john@company.com',
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Acme Corp',
      phone_number: '+1234567890',
      country: 'United States',
      available_documents: 500,
      current_plan: 'professional',
      current_plan_interval: 'yearly',
      paying_customer: true,
      share_links: true,
      lang: 'en',
      use_case: 'Invoice generation',
      onboarding_completed_at: '2024-01-02T00:00:00Z',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-15T14:30:00Z',
      block_resources: false
    };

    const result = formatUserInfo(user);
    expect(result).toContain('## 👤 User Information');
    expect(result).toContain('**Email:** john@company.com');
    expect(result).toContain('**Name:** John Doe');
    expect(result).toContain('**Company:** Acme Corp');
    expect(result).toContain('**Phone:** +1234567890');
    expect(result).toContain('**Country:** United States');
    expect(result).toContain('**Plan:** professional (yearly');
    expect(result).toContain('**Paying Customer:** Yes');
    expect(result).toContain('**Available Documents:** 500');
    expect(result).toContain('**Language:** en');
    expect(result).toContain('**Use Case:** Invoice generation');
  });

  it('should handle minimal user info', () => {
    const user: CurrentUser = {
      id: 'usr_min',
      auth_token: 'token',
      email: 'minimal@test.com',
      available_documents: 10,
      current_plan: 'free',
      paying_customer: false,
      share_links: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      block_resources: false
    };

    const result = formatUserInfo(user);
    expect(result).toContain('**Email:** minimal@test.com');
    expect(result).not.toContain('**Name:**');
    expect(result).not.toContain('**Company:**');
    expect(result).toContain('**Paying Customer:** No');
  });
});

describe('formatUser', () => {
  it('should format basic user info', () => {
    const user: CurrentUser = {
      id: 'usr_123',
      auth_token: 'token',
      email: 'test@example.com',
      available_documents: 250,
      current_plan: 'pro',
      paying_customer: true,
      share_links: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      block_resources: false
    };

    const result = formatUser(user);
    expect(result).toContain('## 👤 User: test@example.com');
    expect(result).toContain('**Plan:** pro');
    expect(result).toContain('**Available Documents:** 250');
  });
});
