# Quickstart

Get the PDFMonkey MCP server running with Claude Desktop in under two minutes.

## 1. Get your API key

Sign up at [dashboard.pdfmonkey.io/register](https://dashboard.pdfmonkey.io/register) and copy your API key from the dashboard.

## 2. Run with npx (no install required)

```bash
PDFMONKEY_API_KEY="your-api-key-here" npx pdfmonkey-mcp-server
```

The server speaks MCP over stdio and exits when the client disconnects.

## 3. Configure Claude Desktop

Add the server to your Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "command": "npx",
      "args": ["-y", "pdfmonkey-mcp-server"],
      "env": {
        "PDFMONKEY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop. You should now see the PDFMonkey tools available.

## 4. Try it

Ask Claude:

> List my PDFMonkey templates, then generate a PDF from the first one.

## Next steps

- Full tool reference and Docker setup: [README.md](README.md)
- Docker MCP Toolkit integration: [DOCKER-MCP-TOOLKIT.md](DOCKER-MCP-TOOLKIT.md)
