# EEA SDI Chatbot - System Architecture

## Overview

The EEA SDI Chatbot is a conversational AI system that enables users to interact with the European Environment Agency's Spatial Data Infrastructure (SDI) Catalogue through natural language. The system uses OpenAI's GPT-4o with function calling capabilities to intelligently query and retrieve geospatial metadata through the Model Context Protocol (MCP).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Browser                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │          React Frontend (front/ - Port 60678)                 │  │
│  │  • TypeScript + React 19                                      │  │
│  │  • Material-UI Components                                     │  │
│  │  • Tailwind CSS                                               │  │
│  │  • Streaming SSE Support                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│           │                                                           │
│           │ /chat, /api/sdi (Vite Proxy)                            │
│           ▼                                                           │
└─────────────────────────────────────────────────────────────────────┘
            │
            │
┌───────────▼──────────────────────────────────────────────────────────┐
│  Node.js Backend (back/ - Port 5000)                                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Express.js Server                                             │  │
│  │  • Chat Route (OpenAI Integration)                             │  │
│  │  • SDI Authentication Route                                    │  │
│  │  • MCP Client (Streamable HTTP Transport)                      │  │
│  │  • Session Management                                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│         │                              │                              │
│         │ OpenAI API                   │ MCP Protocol                 │
│         │ (Function Calls)             │ (Streamable HTTP)            │
│         ▼                              ▼                              │
└───────────────────────────────────────────────────────────────────────┘
         │                               │
         │                               │
┌────────▼─────────────┐  ┌──────────────▼────────────────────────────┐
│  OpenAI Cloud API    │  │  MCP Server (Port 3001)                   │
│  (GPT-4o)            │  │  ┌────────────────────────────────────┐   │
│                      │  │  │  Streamable HTTP Server            │   │
│  • Chat Completions  │  │  │  • MCP Protocol Handler            │   │
│  • Function Calling  │  │  │  • 13 Catalogue Tools              │   │
│  • Streaming         │  │  │  • EEA SDI API Integration         │   │
│                      │  │  └────────────────────────────────────┘   │
└──────────────────────┘  └──────────────┬────────────────────────────┘
                                         │
                                         │ HTTPS REST API
                                         │
                          ┌──────────────▼────────────────────────────┐
                          │  EEA SDI Catalogue API                    │
                          │  (GeoNetwork 4.4.9)                       │
                          │  https://galliwasp.eea.europa.eu/         │
                          │                                            │
                          │  • Search Metadata                         │
                          │  • Get Records                             │
                          │  • Tags & Categories                       │
                          │  • Geographic Regions                      │
                          │  • Export Formats                          │
                          │  • Duplicate Records (Auth required)       │
                          └────────────────────────────────────────────┘
```

## Project Structure

```
EEA_sdi_chatbot/
├── front/                    # Frontend application
│   ├── src/                  # React source code
│   │   ├── components/       # React components
│   │   ├── modules/          # Feature modules (chatbot)
│   │   ├── services/         # API services
│   │   └── type/            # TypeScript types
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   ├── vite.config.ts       # Vite configuration
│   └── tsconfig.json        # TypeScript configuration
│
├── back/                     # Backend application
│   ├── src/
│   │   ├── routes/          # Express routes
│   │   │   ├── chat.ts     # Chat endpoint with OpenAI
│   │   │   └── sdi.ts      # SDI authentication
│   │   ├── lib/
│   │   │   └── mcpClient.ts # MCP client wrapper
│   │   └── index.ts         # Server entry point
│   ├── package.json         # Backend dependencies
│   ├── tsconfig.json        # TypeScript configuration
│   └── .env                 # Environment variables
│
└── Documentation/           # Project documentation
    ├── ARCHITECTURE.md      # This file
    ├── QUICK_START.md       # Getting started guide
    └── MCP_INTEGRATION.md   # MCP integration details
```

## Component Details

### 1. React Frontend (Chatbot UI)

**Location:** `front/`

**Technology Stack:**
- React 19 with TypeScript
- Material-UI v7 for UI components
- Tailwind CSS v4 for styling
- React Markdown for message rendering
- Vite for build tooling

**Port:** 60678

**Responsibilities:**
- Render chat interface with EEA branding
- Handle user input and message history
- Stream responses from backend using Server-Sent Events (SSE)
- Display markdown-formatted responses
- Manage conversation state
- SDI authentication dialog

**Key Files:**
- `front/src/App.tsx` - Main application component
- `front/src/modules/chatbotModule.tsx` - Chat interface
- `front/src/services/llmService.ts` - Backend communication
- `front/src/components/SDIConnectionDialog.tsx` - SDI authentication
- `front/vite.config.ts` - Build configuration with proxy setup

**API Endpoints Used:**
- `POST /chat` - Send messages and receive streaming responses
- `POST /api/sdi/connect` - Authenticate with SDI catalogue
- `POST /api/sdi/disconnect` - Disconnect from SDI
- `GET /api/sdi/status` - Check SDI connection status

### 2. Node.js Backend (Express Server)

**Location:** `back/`

**Technology Stack:**
- Node.js with TypeScript
- Express.js web framework
- OpenAI SDK (v4.63.0)
- Model Context Protocol SDK (v1.21.0)
- Express-session for session management
- CORS for cross-origin support

**Port:** 5000

**Responsibilities:**
- Receive chat messages from frontend
- Communicate with OpenAI API using function calling
- Connect to MCP server using Streamable HTTP transport
- Execute MCP tool calls based on OpenAI's decisions
- Format and stream responses back to frontend
- Handle SDI authentication and session management

**Environment Variables:**
```
OPENAI_API_KEY=<your-openai-api-key>
PORT=5000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=<session-secret>
MCP_BASE_URL=http://127.0.0.1:3001
NODE_ENV=development
```

**Key Components:**

#### Chat Route (`back/src/routes/chat.ts`)
- Handles POST `/chat` endpoint
- Integrates with OpenAI GPT-4o
- Manages MCP tool execution
- Streams responses via SSE

#### MCP Client (`back/src/lib/mcpClient.ts`)
- Wraps MCP SDK StreamableHTTPClientTransport
- Connects to MCP server on startup
- Converts MCP tools to OpenAI function format
- Executes tool calls and formats results

#### SDI Route (`back/src/routes/sdi.ts`)
- Handles SDI catalogue authentication
- Manages user sessions
- Provides connection status

**Request Flow:**
1. Receive chat request from frontend
2. Add system prompt with tool instructions
3. Call OpenAI API with available MCP tools
4. If OpenAI requests function calls:
   - Execute tool calls via MCP client
   - Send tool results back to OpenAI
   - Stream final response to frontend
5. If no function calls needed:
   - Stream OpenAI response directly to frontend

### 3. MCP Server (Standalone Service)

**Location:** `../EEA_sdi_mcp/` (external repository)

**Technology Stack:**
- TypeScript
- Express.js
- Model Context Protocol SDK (@modelcontextprotocol/sdk)
- StreamableHTTPServerTransport
- Axios for HTTP requests

**Port:** 3001

**Protocol:** MCP over Streamable HTTP

**Responsibilities:**
- Implement MCP protocol for EEA SDI Catalogue
- Provide 13 catalogue tools via MCP
- Proxy and format requests to GeoNetwork API
- Handle authentication for protected operations
- Transform GeoNetwork responses into MCP-compatible format

**MCP Endpoints:**
- `GET /` - MCP SSE stream endpoint
- `POST /` - MCP message endpoint
- `GET /health` - Health check

**Available Tools:**
1. **search_catalogue** - Search for geospatial metadata records
2. **get_record_details** - Get detailed information about a record
3. **get_tags** - Get all available tags/categories
4. **get_regions** - Get available geographic regions
5. **get_site_info** - Get information about the catalogue site
6. **get_sources** - Get available catalogue sources/sub-portals
7. **list_groups** - List user groups in the catalogue
8. **get_related_records** - Get records related to a specific record
9. **get_record_formatters** - Get available export formats
10. **export_record** - Export record in specific format
11. **search_by_extent** - Search by geographic bounding box
12. **duplicate_record** - Duplicate a metadata record (requires auth)
13. **get_user_info** - Get authenticated user information

### 4. OpenAI Cloud API (GPT-4o)

**Service:** OpenAI Chat Completions API

**Model:** GPT-4o (gpt-4o)

**Responsibilities:**
- Process natural language user queries
- Decide which MCP tools to call based on user intent
- Generate function call parameters
- Synthesize final responses from tool results
- Stream responses for better UX

**Features Used:**
- Chat Completions API
- Function Calling / Tool Use
- Streaming responses
- Multi-turn conversations with tool results

### 5. EEA SDI Catalogue API (GeoNetwork)

**URL:** https://galliwasp.eea.europa.eu/catalogue/

**Platform:** GeoNetwork 4.4.9

**Responsibilities:**
- Store and manage geospatial metadata records
- Provide search and discovery capabilities
- Manage catalogue organization (groups, sources, tags)
- Export metadata in various formats
- Handle geographic extent queries
- Support metadata record duplication (authenticated)

**API Type:** REST API with JSON responses

## Data Flow

### Typical User Interaction Flow

```
1. User types: "Show me datasets about water quality"
   │
   ▼
2. Frontend sends to Node.js Backend (POST /chat)
   │
   ▼
3. Backend calls OpenAI API with message + MCP tools
   │
   ▼
4. OpenAI decides to call "search_catalogue" function
   │
   ▼
5. Backend MCP Client calls MCP Server (Streamable HTTP)
   │
   ▼
6. MCP Server queries EEA SDI Catalogue API
   │
   ▼
7. GeoNetwork returns search results (JSON)
   │
   ▼
8. MCP Server returns formatted MCP response
   │
   ▼
9. Backend sends tool results back to OpenAI
   │
   ▼
10. OpenAI generates natural language response
    │
    ▼
11. Backend streams response to Frontend (SSE)
    │
    ▼
12. User sees formatted, conversational response
```

## Communication Protocols

### Frontend ↔ Backend
- **Protocol:** HTTP/HTTPS
- **Format:** JSON for requests, Server-Sent Events (SSE) for streaming responses
- **Endpoints:** `/chat`, `/api/sdi/*`
- **Method:** POST for chat, POST/GET for SDI

### Backend ↔ OpenAI
- **Protocol:** HTTPS
- **Format:** JSON
- **SDK:** OpenAI Node.js SDK (v4.63.0)
- **Streaming:** Yes, using OpenAI's streaming API

### Backend ↔ MCP Server
- **Protocol:** HTTP (Streamable HTTP Transport)
- **Format:** MCP Protocol (JSON-RPC 2.0 over HTTP)
- **Base URL:** http://127.0.0.1:3001
- **Transport:** StreamableHTTPClientTransport
- **Features:** Stateless, bidirectional communication

### MCP Server ↔ EEA SDI Catalogue
- **Protocol:** HTTPS
- **Format:** JSON
- **Base URL:** https://galliwasp.eea.europa.eu/catalogue/srv/api
- **Method:** GET/POST
- **Authentication:** Optional (required for protected operations like duplicate_record)

## Security Considerations

1. **API Key Management**
   - OpenAI API key stored in `.env` file (not committed to git)
   - Environment variables used for sensitive configuration
   - Session secrets for user session management

2. **CORS Configuration**
   - Backend has CORS enabled for frontend origin
   - MCP server has CORS enabled for backend access
   - Production should restrict origins

3. **Proxy Pattern**
   - Frontend uses Vite proxy to avoid exposing backend URLs
   - All backend calls go through proxy configuration

4. **Session Management**
   - Express-session for user authentication state
   - Secure cookies in production
   - 24-hour session timeout

5. **Input Validation**
   - Backend validates message structure
   - MCP server validates UUIDs and parameters
   - OpenAI handles prompt injection through system prompts

## Deployment Architecture

### Development Setup
- **Frontend:** Vite dev server on port 60678
- **Backend:** tsx watch on port 5000
- **MCP Server:** Node.js Express server on port 3001
- All services run locally on 127.0.0.1

### Production Considerations
- Frontend should be built and served via CDN or web server
- Backend should use PM2 or similar process manager
- MCP server should use PM2 with clustering
- Add reverse proxy (nginx/Apache) for SSL/TLS termination
- Implement rate limiting and authentication
- Add monitoring and logging infrastructure
- Use production-grade session store (Redis)
- Secure environment variable management

## Technology Summary

| Component | Technology | Language | Port | Protocol |
|-----------|-----------|----------|------|----------|
| Frontend | React 19 + Vite | TypeScript | 60678 | HTTP/SSE |
| Backend | Express.js | TypeScript | 5000 | HTTP |
| MCP Server | Express.js | TypeScript | 3001 | MCP/HTTP |
| OpenAI API | Cloud Service | - | 443 | HTTPS |
| SDI Catalogue | GeoNetwork | - | 443 | HTTPS |

## Key Features

1. **Natural Language Interface** - Users can ask questions in plain language
2. **Intelligent Tool Selection** - OpenAI automatically chooses appropriate MCP tools
3. **Streaming Responses** - Real-time response streaming for better UX
4. **MCP Protocol** - Standard Model Context Protocol for tool integration
5. **Function Calling** - OpenAI function calling orchestrates MCP tool execution
6. **Geospatial Search** - Full access to EEA SDI catalogue capabilities
7. **Multi-turn Conversations** - Maintains conversation context
8. **Markdown Formatting** - Rich text responses with formatting
9. **SDI Authentication** - Direct catalogue authentication for protected operations
10. **Clean Logging** - Informative logs showing MCP tool usage

## Logging

The backend provides clean, informative logging:

**Startup:**
```
[MCP Client] Connecting to http://127.0.0.1:3001...
[MCP Client] ✓ Connected with 13 tools: search_catalogue, get_record_details, ...
```

**Chat with Tools:**
```
📨 Chat: "search for water quality datasets"
🔧 Using MCP tools: search_catalogue
```

**Chat without Tools:**
```
📨 Chat: "Hello, how are you?"
💬 Direct response (no tools used)
```

## Future Enhancements

- Add user authentication and authorization
- Implement conversation history persistence
- Add map visualization for geographic results
- Support for more MCP tools (extent search, export formats)
- Add analytics and usage tracking
- Implement caching for common queries
- Add support for multiple languages
- Deploy to cloud infrastructure (Azure, AWS, GCP)
- Add automated testing (unit, integration, e2e)
- Implement CI/CD pipeline
