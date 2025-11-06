# EEA SDI Chatbot - Node.js Backend

Node.js/TypeScript backend server for the EEA SDI Chatbot. Connects the React frontend to OpenAI API with MCP (Model Context Protocol) integration.

## Features

- **OpenAI Integration** - Streaming chat completions with GPT-4o
- **MCP Integration** - Model Context Protocol client for EEA SDI Catalogue tools
- **SDI Authentication** - Connect to EEA SDI Catalogue
- **Session Management** - Secure session handling
- **TypeScript** - Full type safety
- **Express.js** - Fast, minimalist web framework

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key
- EEA SDI MCP Server running on port 3001

## Installation

1. Install dependencies:
```bash
cd server
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-...
```

## Running the Server

### Development Mode
```bash
npm run dev
```
This runs the server with hot-reload using `tsx watch`.

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Chat
- `POST /chat` - Stream chat completions from OpenAI
  - Body: `{ "prompt": [{ "role": "user", "content": "..." }] }`
  - Response: Server-Sent Events (SSE) stream

### SDI Authentication
- `POST /api/sdi/connect` - Connect to SDI Catalogue
  - Body: `{ "server": "...", "username": "...", "password": "..." }`
- `POST /api/sdi/disconnect` - Disconnect from SDI
- `GET /api/sdi/status` - Check connection status

### Health
- `GET /health` - Health check endpoint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `PORT` | Server port | 5000 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `SESSION_SECRET` | Session encryption secret | dev-secret-key |
| `MCP_BASE_URL` | MCP Server URL | http://127.0.0.1:3001 |
| `NODE_ENV` | Environment | development |

## Project Structure

```
back/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── lib/
│   │   └── mcpClient.ts   # MCP client wrapper
│   └── routes/
│       ├── chat.ts        # Chat endpoints with MCP tools
│       └── sdi.ts         # SDI authentication
├── package.json
├── tsconfig.json
└── .env
```

## MCP Integration

The backend connects to the EEA SDI MCP Server to provide catalogue search and metadata tools to the chatbot.

### MCP Server Setup

The MCP server should be running with these endpoints:
- `GET /` - SSE stream endpoint
- `POST /` - Message endpoint
- `GET /health` - Health check

Example MCP server start:
```bash
cd ../eea_sdi_mcp
npm start
```

The backend will automatically connect to the MCP server on startup and make catalogue tools available to OpenAI.

### Available MCP Tools

When the MCP server is connected, the following tools are available:
- `search_catalogue` - Search the EEA SDI Catalogue
- `get_record_details` - Get detailed information about a record
- `get_catalogue_tags` - List available tags
- `get_catalogue_regions` - List available regions
- And more...

## Migrating from Python

This Node.js backend replaces the Python Flask service (`python_service/app.py`).

Key differences:
- **Language**: TypeScript instead of Python
- **Framework**: Express.js instead of Flask
- **MCP Client**: Native MCP SDK integration
- **Async**: Native async/await (no need for separate async client)
- **Streaming**: Built-in SSE support

The API endpoints remain the same, so the React frontend works without changes.
