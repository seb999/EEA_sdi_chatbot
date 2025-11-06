# MCP Integration - Refactored Architecture

## Overview

This document explains the refactored MCP (Model Context Protocol) integration in the EEA SDI Chatbot. The system now properly uses the MCP protocol to dynamically fetch and execute tools, eliminating the need for hardcoded tool definitions in the Python service.

## Architecture Changes

### Before (Old Architecture)
```
Frontend → Python Service → OpenAI API
              ↓
         Hardcoded Tool Definitions
              ↓
         Direct HTTP calls to MCP REST API
```

**Problems:**
- Tool definitions duplicated in Python service and MCP server
- Manual implementation of each tool in Python
- Tight coupling between Python service and MCP API structure
- Changes to tools require updates in multiple places

### After (New Architecture)
```
Frontend → Python Service → OpenAI API
              ↓
         MCP Client (JSON-RPC)
              ↓
         MCP Server (SSE/HTTP) → EEA SDI Catalogue
         ↑ Single source of truth for tools
```

**Benefits:**
- Tools defined once in MCP server only
- Python service dynamically fetches tool definitions
- Loose coupling via MCP protocol
- Easy to add/modify tools (only change MCP server)
- Follows MCP protocol standards

## Components

### 1. MCP Client (`mcp_client.py`)

A Python client that implements the MCP protocol for communication with the MCP server.

**Key Features:**
- JSON-RPC 2.0 protocol implementation
- Dynamic tool discovery via `tools/list`
- Tool execution via `tools/call`
- Automatic conversion of MCP tools to OpenAI function format
- Error handling and result formatting

**Usage:**
```python
from mcp_client import MCPClient

# Initialize client
mcp_client = MCPClient(base_url="http://127.0.0.1:3001")
mcp_client.initialize()

# Get available tools
tools = mcp_client.get_tools()

# Call a tool
result = mcp_client.call_tool("search_catalogue", {"query": "water quality"})

# Convert tools to OpenAI format
openai_tools = mcp_client.convert_tools_to_openai_format()
```

**Methods:**
- `initialize()` - Connect to MCP server and fetch tools
- `get_tools()` - Get list of available tools
- `call_tool(name, args)` - Execute a tool on MCP server
- `convert_tools_to_openai_format()` - Transform MCP tools for OpenAI
- `format_tool_result(result)` - Format MCP result for OpenAI
- `check_health()` - Check MCP server health

### 2. Refactored Python Service (`app.py`)

The Flask service now uses the MCP client instead of hardcoded tools.

**Key Changes:**
1. **Imports MCP Client:**
   ```python
   from mcp_client import MCPClient
   ```

2. **Initializes MCP Client:**
   ```python
   mcp_client = MCPClient(base_url=MCP_BASE_URL)
   mcp_client.initialize()
   ```

3. **Dynamic Tool Fetching:**
   ```python
   # In chat endpoint
   mcp_tools = mcp_client.convert_tools_to_openai_format()

   response = client.chat.completions.create(
       model="gpt-4o",
       messages=openai_messages,
       tools=mcp_tools,  # Dynamic tools from MCP
       tool_choice="auto",
       stream=False
   )
   ```

4. **Simplified Tool Execution:**
   ```python
   def execute_tool_call(tool_name: str, arguments: Dict[str, Any]) -> str:
       result = mcp_client.call_tool(tool_name, arguments)
       formatted_result = mcp_client.format_tool_result(result)
       return formatted_result
   ```

### 3. MCP Server

The MCP server is the single source of truth for all tool definitions and implementations.

**Location:** `c:\Users\dubos\_Projects\EEA_SDI_MCP_Server\`

**Responsibilities:**
- Define all available tools
- Implement tool execution logic
- Provide MCP protocol endpoints:
  - `POST /message` - JSON-RPC endpoint
  - `GET /health` - Health check
  - `GET /sse` - Server-Sent Events endpoint (if using SSE)

**Tool Definition Example:**
```typescript
{
  name: "search_catalogue",
  description: "Search the EEA SDI Catalogue for geospatial metadata records",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query"
      },
      size: {
        type: "integer",
        description: "Number of results to return",
        default: 5
      }
    },
    required: ["query"]
  }
}
```

## MCP Protocol Communication

### Tool Discovery (tools/list)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_catalogue",
        "description": "Search the EEA SDI Catalogue...",
        "inputSchema": { ... }
      },
      ...
    ]
  }
}
```

### Tool Execution (tools/call)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_catalogue",
    "arguments": {
      "query": "water quality",
      "size": 5
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 10 results for 'water quality':\n\n1. ..."
      }
    ],
    "isError": false
  }
}
```

## Data Flow

1. **User sends message** to Frontend
2. **Frontend** sends to Python Service `/chat` endpoint
3. **Python Service**:
   - Calls `mcp_client.convert_tools_to_openai_format()` to get dynamic tools
   - Sends message + tools to OpenAI
4. **OpenAI** decides which tools to call
5. **Python Service**:
   - Calls `mcp_client.call_tool(name, args)` via MCP protocol
6. **MCP Client**:
   - Sends JSON-RPC request to MCP Server
7. **MCP Server**:
   - Executes tool
   - Returns result in MCP format
8. **MCP Client**:
   - Formats result for OpenAI
9. **Python Service**:
   - Sends tool results back to OpenAI
   - Streams final response to Frontend
10. **Frontend** displays response to user

## Configuration

### Environment Variables

**`.env` file:**
```bash
# OpenAI API Key
OPENAI_API_KEY=sk-...

# MCP Server URL (without /api suffix)
MCP_BASE_URL=http://127.0.0.1:3001

# Flask Secret Key
FLASK_SECRET_KEY=your-secret-key
```

**Note:** The `MCP_BASE_URL` should NOT include `/api` suffix anymore, as the MCP client communicates via JSON-RPC protocol.

### Port Configuration

| Service | Port | Protocol |
|---------|------|----------|
| Frontend (Vite) | 60678 | HTTP |
| Python Service | 5000 | HTTP |
| MCP Server | 3001 | HTTP/SSE |

## Migration Guide

If you have an existing installation, follow these steps:

### 1. Update MCP Server

Ensure your MCP server is running and accessible at the configured URL (default: `http://127.0.0.1:3001`).

The MCP server should expose:
- `POST /message` - JSON-RPC endpoint for `tools/list` and `tools/call`
- `GET /health` - Health check endpoint

### 2. Update Python Service

The refactored code is already in place. Simply restart the Python service:

```bash
cd python_service
python app.py
```

You should see:
```
OpenAI client initialized successfully
MCP Client initialized with X tools
MCP Client connected to http://127.0.0.1:3001
```

### 3. Update Environment Variables

Update your `.env` file to use the correct MCP base URL:

```bash
# OLD - Don't use this anymore
MCP_BASE_URL=http://127.0.0.1:3001/api

# NEW - Use this instead
MCP_BASE_URL=http://127.0.0.1:3001
```

### 4. Test the Integration

1. Start MCP Server: `npm start` (in MCP server directory)
2. Start Python Service: `python app.py` (in python_service directory)
3. Start Frontend: `npm run dev` (in project root)
4. Test commands like `/tag`, `/record <uuid>`, or natural language queries

## Troubleshooting

### MCP Client Initialization Failed

**Error:** `WARNING: Could not initialize MCP client`

**Solution:**
1. Check if MCP server is running: `curl http://127.0.0.1:3001/health`
2. Verify `MCP_BASE_URL` in `.env` is correct
3. Check MCP server logs for errors

### No Tools Available

**Error:** `MCP Client initialized with 0 tools`

**Solution:**
1. Check MCP server implementation of `tools/list`
2. Verify MCP server is returning tools in correct format
3. Test manually: `curl -X POST http://127.0.0.1:3001/message -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`

### Tool Execution Fails

**Error:** `Error executing tool X`

**Solution:**
1. Check MCP server logs for tool execution errors
2. Verify tool arguments match expected schema
3. Test tool directly via MCP protocol
4. Check network connectivity between Python service and MCP server

## Benefits of This Architecture

1. **Single Source of Truth**: Tools defined once in MCP server
2. **Dynamic Updates**: Add/modify tools without changing Python service
3. **Protocol Compliance**: Follows MCP standard protocol
4. **Maintainability**: Less code duplication, easier to maintain
5. **Flexibility**: Easy to swap MCP servers or add multiple servers
6. **Scalability**: Can distribute tool execution across multiple MCP servers
7. **Testing**: Easier to test and mock MCP interactions

## Future Enhancements

1. **Connection Pooling**: Reuse HTTP connections for better performance
2. **Caching**: Cache tool definitions to reduce `tools/list` calls
3. **Multiple MCP Servers**: Support multiple MCP servers for different tool categories
4. **SSE Streaming**: Use Server-Sent Events for real-time tool execution
5. **Tool Discovery UI**: Show available tools in the UI
6. **Tool Marketplace**: Allow users to enable/disable specific tools
7. **Error Recovery**: Retry failed tool calls with exponential backoff
8. **Metrics**: Track tool usage and performance metrics

## References

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
