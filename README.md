# PDFMonkey MCP Server

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with the [PDFMonkey API](https://pdfmonkey.io) for generating PDFs from templates.

[![Docker](https://img.shields.io/badge/docker-available-blue)](https://hub.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-80%2F80%20passing-success)](package.json)

## Features

- **Template Management**: List and inspect PDF templates with detailed information (HTML, CSS, properties)
- **Document Generation**: Create PDFs with async generation and automatic polling
- **Document Management**: List, check status, and delete generated documents
- **Snippet Support**: Access reusable Liquid code snippets
- **Workspace Info**: View workspace details
- **User & Quota Management**: Check account quota, plan information, and user details

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Build locally (a published Docker Hub image is not available yet)
docker build -t pdfmonkey-mcp-server:latest .
```

**Configure in Claude Desktop:**

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "PDFMONKEY_API_KEY=your-api-key-here",
        "pdfmonkey-mcp-server:latest"
      ]
    }
  }
}
```

See [DOCKER-MCP-TOOLKIT.md](DOCKER-MCP-TOOLKIT.md) for Docker MCP Toolkit integration.

### Option 2: From npm

```bash
npm install -g pdfmonkey-mcp-server
```

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "command": "pdfmonkey-mcp-server",
      "env": {
        "PDFMONKEY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Option 3: From Source

```bash
git clone https://github.com/pdfmonkey/pdfmonkey-mcp
cd pdfmonkey-mcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "command": "node",
      "args": ["/absolute/path/to/pdfmonkey-mcp-server/dist/index.js"],
      "env": {
        "PDFMONKEY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Get Your API Key

1. Sign up at [dashboard.pdfmonkey.io/register](https://dashboard.pdfmonkey.io/register)
2. Get your API key from the dashboard

## Available Tools (11 total)

### Workspace Operations

- **`list_workspaces`** - List all accessible workspaces

### Template Operations

- **`list_templates`** - List all PDF templates
- **`get_template`** - Get template details with full HTML, CSS, and properties

### Document Operations

- **`generate_document`** - Generate PDF with async polling (1.5s intervals, 3min timeout)
- **`get_document_status`** - Check document status and get download URL
- **`list_documents`** - List documents with filters (status, template_id, page, updated_since)
- **`delete_document`** - Delete document permanently

### Snippet Operations

- **`list_snippets`** - List all Liquid code snippets
- **`get_snippet`** - Get snippet code

### User & Quota Operations

- **`get_quota`** - Get quota and plan information
- **`get_user_info`** - Get complete account details

## Usage Examples

### Generate an Invoice

```
User: Generate a PDF invoice using my invoice template

Claude: I'll help you generate an invoice. First, let me list your templates.
[Uses list_templates tool]
I found your invoice template (ID: abc-123). Now I'll generate the PDF.
[Uses generate_document tool with data]
Your invoice has been generated! Download: https://...
```

### View Template Code

```
User: Show me the HTML and CSS for template abc-123

Claude: [Uses get_template tool]
Here's the complete template:

### 📝 HTML Template
[Shows full HTML code]

### 🎨 CSS Styles
[Shows full CSS code]

### 📊 Sample Data
[Shows JSON properties]
```

### Check Account Status

```
User: What's my current quota?

Claude: [Uses get_quota tool]
You have 450 documents available on your Professional plan (monthly).
Share links are enabled.
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

Current test coverage: **80/80 tests passing** (~89% overall statements/lines; `tools.ts` dispatch 100%)

### Watch Mode

```bash
npm run watch
```

### Test Locally

```bash
export PDFMONKEY_API_KEY="your-api-key"
npm start
```

### Test Docker Image

```bash
# Build
docker build -t pdfmonkey-mcp-server:latest .

# Test with real API
docker run -it --rm \
  -e PDFMONKEY_API_KEY="your-key" \
  pdfmonkey-mcp-server:latest

# In another terminal, send test JSON-RPC
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  docker run -i --rm -e PDFMONKEY_API_KEY="your-key" pdfmonkey-mcp-server:latest
```

## Publishing to Docker Hub

### Prerequisites

- Docker Hub account
- Image tested and validated
- All tests passing

### Steps

```bash
# 1. Tag image
docker tag pdfmonkey-mcp-server:latest yourusername/pdfmonkey-mcp-server:1.0.0
docker tag pdfmonkey-mcp-server:latest yourusername/pdfmonkey-mcp-server:latest

# 2. Login to Docker Hub
docker login

# 3. Push images
docker push yourusername/pdfmonkey-mcp-server:1.0.0
docker push yourusername/pdfmonkey-mcp-server:latest
```

### Multi-Architecture Build

Support Mac M1/M2 (ARM64) and Intel (AMD64):

```bash
# Create builder
docker buildx create --use --name mcp-builder

# Build and push multi-arch
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/pdfmonkey-mcp-server:1.0.0 \
  -t yourusername/pdfmonkey-mcp-server:latest \
  --push \
  .
```

### GitHub Actions CI/CD

Create `.github/workflows/docker-publish.yml`:

```yaml
name: Docker Build and Publish

on:
  release:
    types: [created]
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install and test
        run: |
          npm ci
          npm test
          npm run build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            yourusername/pdfmonkey-mcp-server:latest
            yourusername/pdfmonkey-mcp-server:${{ github.ref_name }}
```

## Docker Image Details

- **Base**: Node 18 Alpine
- **Size**: ~236MB
- **User**: Non-root (nodejs:1001)
- **Security**: Read-only filesystem, no hardcoded secrets
- **Architecture**: Multi-arch (AMD64, ARM64)

## API Reference

### Important Notes

- **Async Generation**: `generate_document` polls every 1.5 seconds for up to 3 minutes
- **Download URLs**: Expire after 1 hour
- **Share Links**: Permanent URLs for premium users
- **Rate Limiting**: 60 requests/minute

Full API documentation: [docs.pdfmonkey.io](https://docs.pdfmonkey.io)

## Troubleshooting

### "PDFMONKEY_API_KEY environment variable is required"

Verify your configuration file includes the API key.

### "Invalid API key" or 401 errors

Get a new key from [dashboard.pdfmonkey.io](https://dashboard.pdfmonkey.io).

### Document generation timeout

Generation took >3 minutes. Use `get_document_status` with the document ID to check later.

### Docker container exits immediately

Ensure you're using `-i` (interactive) flag:

```bash
docker run -i --rm -e PDFMONKEY_API_KEY="key" pdfmonkey-mcp-server:latest
```

### View Docker logs

```bash
docker logs <container-id>
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## Testing

The project has comprehensive test coverage:

- **Unit tests**: 80 tests covering the formatters, API client, and tool/prompt dispatch
- **Coverage**: ~89% overall statements/lines (`tools.ts` dispatch at 100%)
- **Mock testing**: Full fetch API mocking
- **Async testing**: Polling and timeout scenarios

Run tests:

```bash
npm test              # All tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Project Structure

```
pdfmonkey-mcp-server/
├── src/
│   ├── index.ts              # MCP server bootstrap (env, client, stdio)
│   ├── tools.ts              # Tool/prompt definitions + dispatch
│   ├── pdfmonkey-client.ts   # PDFMonkey API client
│   └── formatters.ts         # Output formatters
├── tests/
│   └── unit/
│       ├── formatters.test.ts        # Formatter tests (21)
│       ├── pdfmonkey-client.test.ts  # Client tests (25)
│       └── tools.test.ts             # Tool dispatch tests (34)
├── server.json               # MCP registry manifest
├── Dockerfile                # Multi-stage build
├── package.json
├── tsconfig.json
└── jest.config.js
```

## License

MIT License - see [LICENSE](LICENSE) file

## Resources

- [PDFMonkey Website](https://pdfmonkey.io)
- [PDFMonkey Documentation](https://docs.pdfmonkey.io)
- [PDFMonkey Dashboard](https://dashboard.pdfmonkey.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Docker MCP Toolkit](https://docs.docker.com/ai/mcp-catalog-and-toolkit/)

## Support

- **MCP Server Issues**: Open an issue on GitHub
- **PDFMonkey API Issues**: [PDFMonkey Support](https://pdfmonkey.io/support)
- **Docker MCP Toolkit**: [Docker Forums](https://forums.docker.com/)
