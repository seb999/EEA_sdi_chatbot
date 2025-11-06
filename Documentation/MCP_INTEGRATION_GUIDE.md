# MCP Integration Guide

## ✅ MCP Integration Complete!

Your EEA SDI Chatbot now has full MCP (Model Context Protocol) support using the official `@modelcontextprotocol/sdk`.

## What is MCP?

MCP (Model Context Protocol) allows your chatbot to connect to external tools and data sources. In your case, it connects to the **EEA SDI Catalogue** to search datasets, get record details, and more.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  React Frontend │────────▶│  Node.js Backend │────────▶│   OpenAI API    │
│  (Port 5173)    │         │   (Port 5000)    │         │   (GPT-4)       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     │ MCP Protocol
                                     ▼
                            ┌──────────────────┐
                            │   MCP Server     │
                            │  (Port 3001)     │
                            │                  │
                            │  - search        │
                            │  - get_details   │
                            │  - list_tags     │
                            │  - etc.          │
                            └──────────────────┘
```

## How It Works

1. **User sends message** → React frontend
2. **Frontend sends to backend** → Node.js `/chat` endpoint
3. **Backend gets MCP tools** → From MCP server
4. **Backend calls OpenAI** → With MCP tools as functions
5. **OpenAI decides to use tools** → Calls MCP tools
6. **Backend executes tools** → Via MCP client
7. **Backend gets results** → Sends back to OpenAI
8. **OpenAI formats response** → Streams back to user

## Files Created

### 1. MCP Client Library
**Location**: [server/src/lib/mcpClient.ts](server/src/lib/mcpClient.ts)

- Connects to MCP server using SSE transport
- Lists available tools
- Executes tool calls
- Formats results for OpenAI

### 2. Updated Chat Route
**Location**: [server/src/routes/chat.ts](server/src/routes/chat.ts)

- Integrates MCP tools with OpenAI
- Handles tool calls from GPT-4
- Streams responses back to frontend

### 3. Updated Main Server
**Location**: [server/src/index.ts](server/src/index.ts)

- Initializes MCP client on startup
- Configurable MCP server URL

## Configuration

Add to your [server/.env](server/.env):

```env
# MCP Server Configuration
MCP_BASE_URL=http://127.0.0.1:3001
```

## Running Everything

### 1. Start MCP Server (Port 3001)
You need to have your MCP server running that provides the catalogue tools.

### 2. Start Node.js Backend
```bash
cd server
npm run dev
```

Expected output:
```
============================================================
EEA ChatBot Service - Node.js with OpenAI + MCP
============================================================
Port: 5000
OpenAI: Configured
Frontend URL: http://localhost:5173
MCP Server: http://127.0.0.1:3001
============================================================
[MCP Client] Connecting to http://127.0.0.1:3001...
[MCP Client] ✓ Connected with X tools available
[MCP Client] Tools: search_catalogue, get_record_details, ...
```

### 3. Start React Frontend
```bash
# In root directory
npm run dev
```

## Testing MCP Tools

Once everything is running, test with these commands in the chat:

### Search Catalogue
```
/search water quality
```

### Get Record Details
```
/record e7967ccf-26f0-4758-8afc-5d1ff5b50577
```

### List Tags
```
/tag
```

### List Regions
```
What regions are available?
```

## How MCP Tools are Used

When you send a message, the backend:

1. **Checks MCP availability**
   ```typescript
   const mcpClient = getMCPClient();
   const mcpEnabled = mcpClient.isInitialized();
   ```

2. **Gets available tools**
   ```typescript
   const mcpTools = mcpClient.convertToOpenAIFormat();
   // Converts to OpenAI function format
   ```

3. **Sends to OpenAI with tools**
   ```typescript
   const response = await openai.chat.completions.create({
     model: 'gpt-4o',
     messages: messages,
     tools: mcpTools,
     tool_choice: 'auto'
   });
   ```

4. **Executes tool calls**
   ```typescript
   if (message.tool_calls) {
     for (const toolCall of message.tool_calls) {
       const result = await mcpClient.callTool(
         toolCall.function.name,
         JSON.parse(toolCall.function.arguments)
       );
       // Add result to conversation
     }
   }
   ```

5. **Sends results back to OpenAI**
   - OpenAI formats the tool results into a natural response
   - Response is streamed back to the user

## Graceful Degradation

If the MCP server is not available:
- ✅ Backend still starts successfully
- ✅ Chat works without MCP tools
- ✅ User sees: "⚠️ Chatbot will work without MCP catalogue tools"

## Available MCP Tools (Example)

Your MCP server should provide these tools:

1. **search_catalogue** - Search for datasets
   - Parameters: `query`, `size`

2. **get_record_details** - Get detailed record info
   - Parameters: `uuid`

3. **get_catalogue_tags** - List all tags
   - No parameters

4. **get_catalogue_regions** - List regions
   - No parameters

5. **get_site_info** - Get catalogue info
   - No parameters

6. **list_catalogue_groups** - List user groups
   - No parameters

7. **duplicate_record** - Duplicate a record (requires auth)
   - Parameters: `metadataUuid`, `group`, etc.

## Debugging

### Enable Verbose Logging

Watch the server console for:
```
📨 New chat request: "..."
📋 X MCP tools available: tool1, tool2, ...
🤖 Calling OpenAI API...
🔧 LLM decided to call X tool(s)
  Calling tool: search_catalogue
  Arguments: { "query": "water", "size": 5 }
  Result: Found 42 results...
✅ All tools executed, sending results back to LLM...
✓ Response streamed to client
```

### Common Issues

1. **MCP server not running**
   - Error: `MCP initialization failed`
   - Solution: Start your MCP server on port 3001

2. **Wrong MCP URL**
   - Check `MCP_BASE_URL` in `.env`
   - Default: `http://127.0.0.1:3001`

3. **Tools not showing up**
   - Check MCP server logs
   - Verify tools are properly exposed

## Next Steps

### Option 1: Create/Update Your MCP Server
If you don't have an MCP server yet, you need to create one that:
- Runs on port 3001
- Implements SSE transport
- Provides catalogue tools (search, get_details, etc.)

### Option 2: Use Existing MCP Server
If you already have an MCP server:
- Make sure it's running on port 3001 (or update `MCP_BASE_URL`)
- Verify it uses SSE transport
- Check it provides the expected tools

## Benefits

✅ **Standardized Protocol** - Uses official MCP SDK
✅ **Type-Safe** - Full TypeScript support
✅ **Extensible** - Easy to add new tools
✅ **Graceful Degradation** - Works without MCP
✅ **Native Integration** - OpenAI function calling

---

**Status**: ✅ Fully Integrated
**Last Updated**: November 2024
