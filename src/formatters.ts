/**
 * Formatting utilities for MCP responses
 * Provides clean, readable output for Claude Desktop
 */

import type { Template, TemplateCard, DocumentCard, CurrentUser } from './pdfmonkey-client.js';

/**
 * Format templates as a markdown table
 */
export function formatTemplatesTable(templates: TemplateCard[]): string {
  if (templates.length === 0) {
    return '📄 No templates found.';
  }

  let output = `## 📄 Templates (${templates.length} total)\n\n`;
  output += '| ID | Name | Identifier | Last Updated |\n';
  output += '|----|----|----|-----------|\n';

  templates.forEach(template => {
    const id = template.id.substring(0, 8);
    const name = template.name || 'Untitled';
    const identifier = template.identifier || '-';
    const updated = template.updated_at
      ? new Date(template.updated_at).toLocaleDateString()
      : new Date(template.created_at).toLocaleDateString();

    output += `| ${id}... | ${name} | ${identifier} | ${updated} |\n`;
  });

  output += '\n💡 Use the full ID when generating documents.';

  return output;
}

/**
 * Format documents as a markdown table
 */
export function formatDocumentsTable(documents: DocumentCard[]): string {
  if (documents.length === 0) {
    return '📦 No documents found.';
  }

  let output = `## 📦 Documents (${documents.length} total)\n\n`;
  output += '| ID | Filename | Status | Created | Download | Share Link |\n';
  output += '|----|----------|--------|---------|----------|------------|\n';

  documents.forEach(doc => {
    const id = doc.id.substring(0, 8);
    const filename = doc.filename || doc.meta?._filename || 'document.pdf';

    const statusEmoji = {
      success: '✅',
      failure: '❌',
      pending: '⏳',
      generating: '⏳',
      draft: '📝'
    }[doc.status] || '•';

    const status = `${statusEmoji} ${doc.status}`;
    const created = new Date(doc.created_at).toLocaleDateString();
    const download = doc.download_url ? `[Download](${doc.download_url})` : '-';
    const share = doc.public_share_link ? `[Share](${doc.public_share_link})` : '-';

    output += `| ${id}... | ${filename} | ${status} | ${created} | ${download} | ${share} |\n`;
  });

  output += '\n💡 Click on links to download PDFs or get shareable URLs.';

  return output;
}

/**
 * Format a single document with full details
 */
export function formatDocumentDetails(document: DocumentCard): string {
  const statusEmoji = {
    success: '✅',
    failure: '❌',
    pending: '⏳',
    generating: '⏳',
    draft: '📝'
  }[document.status] || '•';

  let output = `## ${statusEmoji} Document Details\n\n`;

  // Basic info
  output += `**ID:** \`${document.id}\`\n`;
  output += `**Status:** ${statusEmoji} ${document.status.toUpperCase()}\n`;
  output += `**Filename:** ${document.filename || document.meta?._filename || 'document.pdf'}\n`;
  output += `**Created:** ${new Date(document.created_at).toLocaleString()}\n`;

  if (document.updated_at) {
    output += `**Updated:** ${new Date(document.updated_at).toLocaleString()}\n`;
  }

  // URLs
  output += '\n### 🔗 Links\n\n';
  if (document.download_url) {
    output += `**Download URL:** ${document.download_url}\n`;
    output += '⏰ *Expires after 1 hour*\n\n';
  } else {
    output += '*No download URL available yet*\n\n';
  }

  if (document.public_share_link) {
    output += `**Public Share Link:** ${document.public_share_link}\n`;
    output += '♾️ *Permanent link (Premium feature)*\n\n';
  }

  // Metadata
  if (document.meta && Object.keys(document.meta).length > 0) {
    output += '### 📋 Metadata\n\n';
    for (const [key, value] of Object.entries(document.meta)) {
      if (key.startsWith('_')) {
        output += `**${key}:** \`${value}\`\n`;
      } else {
        output += `**${key}:** ${value}\n`;
      }
    }
    output += '\n';
  }

  // Failure info
  if (document.status === 'failure' && document.failure_cause) {
    output += '### ❌ Failure Information\n\n';
    output += `**Cause:** ${document.failure_cause}\n\n`;
  }

  return output;
}

/**
 * Format template details
 */
export function formatTemplateDetails(template: Template): string {
  let output = `## 📄 Template: ${template.name}\n\n`;

  output += `**ID:** \`${template.id}\`\n`;
  output += `**Identifier:** ${template.identifier || '-'}\n`;
  output += `**Created:** ${new Date(template.created_at).toLocaleString()}\n`;

  if (template.updated_at) {
    output += `**Updated:** ${new Date(template.updated_at).toLocaleString()}\n`;
  }

  // Show HTML body
  if (template.body_draft) {
    output += '\n### 📝 HTML Template\n\n';
    output += '```html\n';
    output += template.body_draft;
    output += '\n```\n';
  } else {
    output += '\n**HTML Body:** *Not defined*\n';
  }

  // Show CSS styles
  if (template.scss_style_draft) {
    output += '\n### 🎨 CSS Styles\n\n';
    output += '```scss\n';
    output += template.scss_style_draft;
    output += '\n```\n';
  } else {
    output += '**CSS Styles:** *Not defined*\n';
  }

  // Show sample data structure if available
  if (template.sample_data_draft) {
    output += '\n### 📊 Sample Data (Properties)\n\n';
    output += '```json\n';
    output += template.sample_data_draft;
    output += '\n```\n';
  } else {
    output += '**Sample Data:** *Not defined*\n';
  }

  return output;
}

/**
 * Format quota information
 */
export function formatQuota(user: CurrentUser): string {
  let output = `## 📊 Quota Information\n\n`;

  output += `**Available Documents:** ${user.available_documents}\n`;
  output += `**Current Plan:** ${user.current_plan}`;

  if (user.current_plan_interval) {
    output += ` (${user.current_plan_interval}ly)`;
  }
  output += '\n';

  output += `**Paying Customer:** ${user.paying_customer ? 'Yes' : 'No'}\n`;

  if (user.trial_ends_on && !user.paying_customer) {
    output += `**Trial Ends:** ${new Date(user.trial_ends_on).toLocaleDateString()}\n`;
  }

  output += `**Share Links Enabled:** ${user.share_links ? 'Yes' : 'No'}\n`;

  return output;
}

/**
 * Format user information (complete)
 */
export function formatUserInfo(user: CurrentUser): string {
  let output = `## 👤 User Information\n\n`;

  output += `**Email:** ${user.email}\n`;

  if (user.first_name || user.last_name) {
    output += `**Name:** ${user.first_name || ''} ${user.last_name || ''}`.trim() + '\n';
  }

  if (user.company_name) {
    output += `**Company:** ${user.company_name}\n`;
  }

  if (user.phone_number) {
    output += `**Phone:** ${user.phone_number}\n`;
  }

  if (user.country) {
    output += `**Country:** ${user.country}\n`;
  }

  output += `\n### 📊 Account Details\n\n`;
  output += `**Plan:** ${user.current_plan}`;
  if (user.current_plan_interval) {
    output += ` (${user.current_plan_interval}ly)`;
  }
  output += '\n';

  output += `**Available Documents:** ${user.available_documents}\n`;
  output += `**Paying Customer:** ${user.paying_customer ? 'Yes' : 'No'}\n`;

  if (user.trial_ends_on && !user.paying_customer) {
    output += `**Trial Ends:** ${new Date(user.trial_ends_on).toLocaleDateString()}\n`;
  }

  output += `**Share Links:** ${user.share_links ? 'Enabled' : 'Disabled'}\n`;
  output += `**Language:** ${user.lang || 'en'}\n`;

  if (user.use_case) {
    output += `**Use Case:** ${user.use_case}\n`;
  }

  output += `\n**Created:** ${new Date(user.created_at).toLocaleDateString()}\n`;

  return output;
}

/**
 * Format minimal user information (just essentials)
 */
export function formatUser(user: CurrentUser): string {
  let output = `## 👤 User: ${user.email}\n\n`;

  output += `**Plan:** ${user.current_plan}\n`;
  output += `**Available Documents:** ${user.available_documents}\n`;

  if (user.first_name || user.last_name) {
    output += `**Name:** ${user.first_name || ''} ${user.last_name || ''}`.trim() + '\n';
  }

  return output;
}
