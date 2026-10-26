# PDFMonkey MCP Server

The official [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for [PDFMonkey](https://pdfmonkey.io). It lets AI assistants such as Claude, Cursor or any other MCP client list your templates, generate documents and check your quota through the PDFMonkey API.

[![npm](https://img.shields.io/npm/v/pdfmonkey-mcp-server)](https://www.npmjs.com/package/pdfmonkey-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

- Runs locally over stdio, with your API key
- Listed in the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.pdfmonkey/pdfmonkey-mcp`
- Documentation: [pdfmonkey.io/docs/integrations/mcp](https://pdfmonkey.io/docs/integrations/mcp/)

> The MCP server works with existing templates: it can read them but not create or edit them. To let an agent build and preview templates, use the [PDFMonkey CLI](https://pdfmonkey.io/docs/code-templates/cli/).

## Get your API key

Sign up at [dashboard.pdfmonkey.io/register](https://dashboard.pdfmonkey.io/register), then copy your API key from [your account page](https://dashboard.pdfmonkey.io/account).

## Setup

The server needs Node.js 18 or later and reads your key from the `PDFMONKEY_API_KEY` environment variable.

### Claude Code

```bash
claude mcp add pdfmonkey -e PDFMONKEY_API_KEY=your-api-key -- npx -y pdfmonkey-mcp-server
```

### Claude Desktop, Cursor and other clients

Add this to your client’s MCP configuration (`claude_desktop_config.json` for Claude Desktop, `.cursor/mcp.json` for Cursor):

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "command": "npx",
      "args": ["-y", "pdfmonkey-mcp-server"],
      "env": {
        "PDFMONKEY_API_KEY": "your-api-key"
      }
    }
  }
}
```

Claude Desktop’s configuration file lives in `~/Library/Application Support/Claude/` on macOS and `%APPDATA%\Claude\` on Windows.

### Docker

No image is published yet, so build it locally:

```bash
docker build -t pdfmonkey-mcp-server .
```

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "PDFMONKEY_API_KEY", "pdfmonkey-mcp-server"],
      "env": {
        "PDFMONKEY_API_KEY": "your-api-key"
      }
    }
  }
}
```

See [DOCKER-MCP-TOOLKIT.md](DOCKER-MCP-TOOLKIT.md) to use it with the Docker MCP Toolkit.

## Tools

| Tool                  | What it does                                                             |
| --------------------- | ------------------------------------------------------------------------ |
| `list_workspaces`     | List the workspaces your API key can access                              |
| `list_templates`      | List the templates of a workspace                                        |
| `get_template`        | Get a template’s HTML, CSS and sample data                               |
| `generate_document`   | Generate a document and wait for it (polls every 1.5 s, up to 3 minutes) |
| `get_document_status` | Check a document’s status and get its download URL                       |
| `list_documents`      | List documents, filtered by status, template or update time              |
| `delete_document`     | Delete a document permanently                                            |
| `list_snippets`       | List the Liquid snippets of a workspace                                  |
| `get_snippet`         | Get a snippet’s code                                                     |
| `get_quota`           | Get your quota and plan                                                  |
| `get_user_info`       | Get your account details                                                 |

The server also exposes four prompts: `list-templates-formatted`, `show-documents-status`, `generate-invoice` and `workspace-overview`.

Good to know:

- Download URLs expire after one hour. Download the file right away, or use a share link (Pro+ and Premium plans).
- If a generation takes longer than 3 minutes, call `get_document_status` later with the document ID.

## Example

```
You: Generate an invoice for ACME with my invoice template.

Claude: [calls list_templates, then generate_document]
Your invoice is ready: https://…
```

## Development

```bash
npm install
npm run build      # compile to dist/
npm test           # run the test suite
npm run watch      # rebuild on change
```

To try the server against the real API:

```bash
PDFMONKEY_API_KEY=your-api-key npm start
```

## Troubleshooting

- **“PDFMONKEY_API_KEY environment variable is required”**: the key is missing from your client configuration.
- **401 errors**: the key is wrong or was regenerated. Copy it again from [your account page](https://dashboard.pdfmonkey.io/account).
- **Docker container exits immediately**: run it with `-i`, MCP talks over stdin.

## Resources

- [PDFMonkey documentation](https://pdfmonkey.io/docs/)
- [MCP server documentation](https://pdfmonkey.io/docs/integrations/mcp/)
- [PDFMonkey CLI](https://pdfmonkey.io/docs/code-templates/cli/)
- [API reference](https://pdfmonkey.io/docs/api/documents/)

Questions about the server? Open an issue. Questions about PDFMonkey itself? [Contact us](https://pdfmonkey.io/contact/).

## License

MIT, see [LICENSE](LICENSE).
