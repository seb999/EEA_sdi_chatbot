# EEA SDI Chatbot - System Architecture

## Overview

The EEA SDI Chatbot is a conversational AI system that enables users to interact with the European Environment Agency's Spatial Data Infrastructure (SDI) Catalogue through natural language. The system uses OpenAI's GPT models with function calling capabilities to intelligently query and retrieve geospatial metadata.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Browser                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │          React Frontend (Port 60678)                          │  │
│  │  • TypeScript + React 19                                      │  │
│  │  • Material-UI Components                                     │  │
│  │  • Tailwind CSS                                               │  │
│  │  • Streaming SSE Support                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│           │                            │                              │
│           │ /chat (Proxy)              │ /api (Proxy)                │
│           ▼                            ▼                              │
└─────────────────────────────────────────────────────────────────────┘
            │                            │
            │                            │
┌───────────▼─────────────┐  ┌──────────▼───────────────────────────┐
│  Python Service         │  │  MCP Server (TypeScript)             │
│  (Flask - Port 5000)    │  │  (Express - Port 3001)               │
│                         │  │                                       │
│  • Flask REST API       │  │  • Express HTTP Server                │
│  • OpenAI SDK           │  │  • MCP Protocol Handler               │
│  • Function Calling     │  │  • API Proxy Layer                    │
│  • SSE Streaming        │  │  • CORS Enabled                       │
│  • Tool Execution       │  │                                       │
└────────┬────────────────┘  └──────────┬───────────────────────────┘
         │                              │
         │                              │
         │ OpenAI API                   │ HTTP/REST
         │ (Function Calls)             │
         │                              │
         ▼                              ▼
┌─────────────────────────┐  ┌──────────────────────────────────────┐
│   OpenAI Cloud API      │  │  EEA SDI Catalogue API               │
│   (GPT-4o)              │  │  (GeoNetwork 4.4.9)                  │
│                         │  │  https://sdi.eea.europa.eu/          │
│  • Chat Completions     │  │                                       │
│  • Function Calling     │  │  • Search Metadata                    │
│  • Streaming Responses  │  │  • Get Records                        │
│  • Tool Integration     │  │  • Tags & Categories                  │
│                         │  │  • Geographic Regions                 │
│                         │  │  • Export Formats                     │
└─────────────────────────┘  └───────────────────────────────────────┘
```

## Component Details

### 1. React Frontend (Chatbot UI)

**Technology Stack:**
- React 19 with TypeScript
- Material-UI v7 for UI components
- Tailwind CSS v4 for styling
- React Markdown for message rendering
- Vite for build tooling

**Responsibilities:**
- Render chat interface with EEA branding
- Handle user input and message history
- Stream responses from Python service using Server-Sent Events (SSE)
- Display markdown-formatted responses
- Manage conversation state

**Key Files:**
- [src/App.tsx](src/App.tsx) - Main application component
- [src/services/llmService.ts](src/services/llmService.ts) - LLM communication service
- [src/services/mcpService.ts](src/services/mcpService.ts) - Direct MCP API service
- [vite.config.ts](vite.config.ts) - Build configuration with proxy setup

**API Endpoints Used:**
- `POST /chat` - Send messages and receive streaming responses (proxied to Python service)
- `POST /api/*` - Direct MCP API calls (proxied to MCP server)

### 2. Python Service (Flask Backend)

**Location:** [python_service/app.py](python_service/app.py)

**Technology Stack:**
- Flask (Python web framework)
- OpenAI Python SDK
- Flask-CORS for cross-origin support
- python-dotenv for configuration

**Port:** 5000

**Responsibilities:**
- Receive chat messages from frontend
- Communicate with OpenAI API using function calling
- Execute MCP tool calls based on OpenAI's function call decisions
- Format and stream responses back to frontend
- Handle authentication with OpenAI API

**Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API authentication
- `MCP_BASE_URL` - MCP server endpoint (default: http://127.0.0.1:3001/api)

**Function Calling Tools:**
The service defines 7 MCP tools for OpenAI function calling:

1. **search_catalogue** - Search for geospatial metadata records
2. **get_catalogue_tags** - Get all available tags/categories
3. **get_catalogue_regions** - Get available geographic regions
4. **get_record_details** - Get detailed information about a specific record
5. **get_site_info** - Get information about the catalogue site
6. **get_catalogue_sources** - Get available catalogue sources/sub-portals
7. **list_catalogue_groups** - List user groups in the catalogue

**Request Flow:**
1. Receive chat request from frontend
2. Add system prompt with tool instructions
3. Call OpenAI API with available tools
4. If OpenAI requests function calls:
   - Execute tool calls via MCP API
   - Send tool results back to OpenAI
   - Stream final response to frontend
5. If no function calls needed:
   - Stream OpenAI response directly to frontend

### 3. MCP Server (TypeScript Express Server)

**Location:** `c:\Users\dubos\_Projects\EEA_SDI_MCP_Server\`

**Technology Stack:**
- TypeScript
- Express.js
- Model Context Protocol SDK (@modelcontextprotocol/sdk)
- Axios for HTTP requests
- CORS enabled

**Port:** 3001

**Responsibilities:**
- Implement MCP protocol for EEA SDI Catalogue
- Proxy and format requests to GeoNetwork API
- Provide RESTful HTTP endpoints for MCP tools
- Handle authentication and error handling for external API
- Transform GeoNetwork responses into MCP-compatible format

**API Endpoints:**
- `POST /api/search` - Search catalogue records
- `GET /api/records/:uuid` - Get record details
- `GET /api/records/:uuid/formatters` - Get export formats
- `GET /api/records/:uuid/export/:formatter` - Export record
- `GET /api/records/:uuid/related` - Get related records
- `GET /api/groups` - List catalogue groups
- `GET /api/sources` - Get catalogue sources
- `GET /api/site` - Get site information
- `GET /api/tags` - Get available tags
- `GET /api/regions` - Get geographic regions
- `POST /api/search/extent` - Search by bounding box

### 4. OpenAI Cloud API (GPT-4o)

**Service:** OpenAI Chat Completions API

**Responsibilities:**
- Process natural language user queries
- Decide which tools to call based on user intent
- Generate function call parameters
- Synthesize final responses from tool results
- Stream responses for better UX

**Model:** GPT-4o (gpt-4o)

**Features Used:**
- Chat Completions API
- Function Calling / Tool Use
- Streaming responses
- Multi-turn conversations with tool results

### 5. EEA SDI Catalogue API (GeoNetwork)

**URL:** https://sdi.eea.europa.eu/

**Platform:** GeoNetwork 4.4.9

**Responsibilities:**
- Store and manage geospatial metadata records
- Provide search and discovery capabilities
- Manage catalogue organization (groups, sources, tags)
- Export metadata in various formats
- Handle geographic extent queries

**API Type:** REST API with JSON responses

## Data Flow

### Typical User Interaction Flow

```
1. User types: "Show me datasets about water quality"
   │
   ▼
2. Frontend sends to Python Service (POST /chat)
   │
   ▼
3. Python Service calls OpenAI API with message + tools
   │
   ▼
4. OpenAI decides to call "search_catalogue" function
   │
   ▼
5. Python Service executes search via MCP Server
   │
   ▼
6. MCP Server queries EEA SDI Catalogue API
   │
   ▼
7. GeoNetwork returns search results (JSON)
   │
   ▼
8. MCP Server returns formatted results
   │
   ▼
9. Python Service sends results back to OpenAI
   │
   ▼
10. OpenAI generates natural language response
    │
    ▼
11. Python Service streams response to Frontend
    │
    ▼
12. User sees formatted, conversational response
```

## Communication Protocols

### Frontend ↔ Python Service
- **Protocol:** HTTP/HTTPS
- **Format:** JSON for requests, Server-Sent Events (SSE) for streaming responses
- **Endpoint:** `/chat`
- **Method:** POST

### Python Service ↔ OpenAI
- **Protocol:** HTTPS
- **Format:** JSON
- **SDK:** OpenAI Python SDK
- **Streaming:** Yes, using OpenAI's streaming API

### Python Service ↔ MCP Server
- **Protocol:** HTTP
- **Format:** JSON
- **Base URL:** http://127.0.0.1:3001/api
- **Method:** GET/POST depending on endpoint

### MCP Server ↔ EEA SDI Catalogue
- **Protocol:** HTTPS
- **Format:** JSON
- **Base URL:** https://sdi.eea.europa.eu/catalogue/srv/api
- **Method:** GET/POST
- **Authentication:** Public API (no auth required for read operations)

## Security Considerations

1. **API Key Management**
   - OpenAI API key stored in `.env` file (not committed to git)
   - Environment variables used for sensitive configuration

2. **CORS Configuration**
   - Flask service has CORS enabled for development
   - MCP server has CORS enabled for local proxy access

3. **Proxy Pattern**
   - Frontend uses Vite proxy to avoid exposing backend URLs
   - All backend calls go through proxy configuration

4. **Input Validation**
   - Python service validates message structure
   - MCP server validates UUIDs and parameters
   - OpenAI handles prompt injection through system prompts

## Deployment Architecture

### Development Setup
- **Frontend:** Vite dev server on port 60678
- **Python Service:** Flask development server on port 5000
- **MCP Server:** Node.js Express server on port 3001
- All services run locally on 127.0.0.1

### Production Considerations
- Frontend should be built and served via CDN or web server
- Python service should use production WSGI server (gunicorn, uwsgi)
- MCP server should use PM2 or similar process manager
- Add reverse proxy (nginx/Apache) for SSL/TLS termination
- Implement rate limiting and authentication
- Add monitoring and logging infrastructure

## Technology Summary

| Component | Technology | Language | Port | Protocol |
|-----------|-----------|----------|------|----------|
| Frontend | React 19 + Vite | TypeScript | 60678 | HTTP/SSE |
| Python Service | Flask | Python | 5000 | HTTP |
| MCP Server | Express | TypeScript | 3001 | HTTP |
| OpenAI API | Cloud Service | - | 443 | HTTPS |
| SDI Catalogue | GeoNetwork | - | 443 | HTTPS |

## Configuration Files

- [package.json](package.json) - Frontend dependencies and scripts
- [vite.config.ts](vite.config.ts) - Vite build config and proxy setup
- [python_service/app.py](python_service/app.py) - Python service implementation
- [python_service/requirements.txt](python_service/requirements.txt) - Python dependencies
- `.env` - Environment variables (OPENAI_API_KEY, MCP_BASE_URL)

## Key Features

1. **Natural Language Interface** - Users can ask questions in plain language
2. **Intelligent Tool Selection** - OpenAI automatically chooses appropriate tools
3. **Streaming Responses** - Real-time response streaming for better UX
4. **Function Calling** - OpenAI function calling orchestrates MCP tool execution
5. **Geospatial Search** - Full access to EEA SDI catalogue capabilities
6. **Multi-turn Conversations** - Maintains conversation context
7. **Markdown Formatting** - Rich text responses with formatting

## Future Enhancements

- Add user authentication and authorization
- Implement conversation history persistence
- Add map visualization for geographic results
- Support for more MCP tools (extent search, export formats)
- Add analytics and usage tracking
- Implement caching for common queries
- Add support for multiple languages
- Deploy to cloud infrastructure (Azure, AWS, GCP)
