#!/bin/bash

# PDFMonkey MCP Server - Local Testing Script
# Ce script permet de tester le serveur MCP en local sans Docker

set -e  # Exit on error

echo "🧪 PDFMonkey MCP Server - Local Test"
echo "===================================="
echo ""

# Check if API key is set
if [ -z "$PDFMONKEY_API_KEY" ]; then
    echo "❌ Error: PDFMONKEY_API_KEY environment variable not set"
    echo ""
    echo "Usage:"
    echo "  export PDFMONKEY_API_KEY='your-api-key'"
    echo "  ./test-local.sh"
    exit 1
fi

echo "✅ API Key configured"
echo ""

# Build if needed
if [ ! -d "dist" ]; then
    echo "📦 Building TypeScript..."
    npm run build
    echo "✅ Build complete"
    echo ""
fi

# Test 1: Check if server starts
echo "🧪 Test 1: Server startup"
echo "------------------------"
timeout 2 node dist/index.js > /dev/null 2>&1 || true
if [ $? -eq 124 ]; then
    echo "✅ Server starts successfully (timeout is expected)"
else
    echo "⚠️  Server may have issues"
fi
echo ""

# Test 2: List tools (simulated MCP request)
echo "🧪 Test 2: List MCP Tools"
echo "------------------------"
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}' | timeout 3 node dist/index.js 2>/dev/null | head -20 || echo "Note: This test requires MCP protocol handling"
echo ""

# Test 3: Direct API client test
echo "🧪 Test 3: Direct API Client Test"
echo "--------------------------------"

# Get absolute path to project
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cat > /tmp/test-api.mjs << EOF
import { PDFMonkeyClient } from '${PROJECT_DIR}/dist/pdfmonkey-client.js';

const client = new PDFMonkeyClient({
  apiKey: process.env.PDFMONKEY_API_KEY
});

try {
  console.log('Testing getCurrentUser...');
  const user = await client.getCurrentUser();
  console.log('✅ User:', user.email);
  console.log('✅ Plan:', user.current_plan);
  console.log('✅ Available docs:', user.available_documents);
  console.log('');

  console.log('Testing listTemplates...');
  const templates = await client.listTemplates();
  console.log('✅ Found', templates.length, 'template(s)');
  if (templates.length > 0) {
    console.log('✅ First template:', templates[0].name);
  }
  console.log('');

  console.log('Testing listDocuments...');
  const documents = await client.listDocuments({});
  console.log('✅ Found', documents.length, 'document(s)');
  console.log('');

  console.log('🎉 All API tests passed!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
EOF

node /tmp/test-api.mjs
rm /tmp/test-api.mjs

echo ""
echo "=================================="
echo "✅ Local tests completed!"
echo ""
echo "Next steps:"
echo "1. Test with MCP Inspector: npx @modelcontextprotocol/inspector node dist/index.js"
echo "2. Configure Claude Desktop to use local build (see AUDIT-REPORT.md)"
echo "3. Test all 12 tools via Claude Desktop"
echo ""
