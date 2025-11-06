# Quick Start Guide - Node.js Backend with MCP

## ✅ What's Done

Your EEA SDI Chatbot has been completely migrated from Python to Node.js with full MCP integration!

### New Backend Features
- ✅ **Node.js + TypeScript** - Modern, type-safe backend
- ✅ **OpenAI Integration** - Streaming chat with GPT-4
- ✅ **MCP Support** - Connect to catalogue tools via MCP protocol
- ✅ **SDI Authentication** - Connect/disconnect to EEA SDI
- ✅ **Session Management** - Secure session handling
- ✅ **Same API** - No frontend changes needed!

## 🚀 How to Start

### Step 1: Stop Python Server (if running)

If you have the Python server running on port 5000, stop it first.

### Step 2: Start Your MCP Server (Port 3001)

Make sure your MCP server is running:
```bash
# Example - adjust based on your MCP server setup
cd path/to/your/mcp-server
npm start
# Should run on http://127.0.0.1:3001
```

### Step 3: Start Node.js Backend

```bash
cd server
npm run dev
```

You should see:
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

### Step 4: Start React Frontend

```bash
# In root directory
npm run dev
```

Frontend runs on: **http://localhost:5173**

## 📁 Project Structure

```
EEA_sdi_chatbot/
├── server/                         # ← NEW Node.js backend
│   ├── src/
│   │   ├── index.ts               # Main server
│   │   ├── lib/
│   │   │   └── mcpClient.ts       # MCP client integration
│   │   └── routes/
│   │       ├── chat.ts            # Chat with OpenAI + MCP tools
│   │       └── sdi.ts             # SDI authentication
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                        # Config (OpenAI key, MCP URL)
│
├── src/                            # React frontend (unchanged)
├── python_service/                 # OLD Python backend (deprecated)
└── package.json
```

## 🔧 Configuration

Edit [server/.env](server/.env):

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-...

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Session Secret
SESSION_SECRET=eea-chatbot-secret-key-2024

# MCP Server Configuration
MCP_BASE_URL=http://127.0.0.1:3001
```

## 🧪 Test the Integration

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

### Test 2: SDI Status
```bash
curl http://localhost:5000/api/sdi/status
```

### Test 3: Chat (from React UI)
Open http://localhost:5173 and try:

```
Hello! Can you search for water quality datasets?
```

Expected flow:
1. Frontend sends to `/chat`
2. Backend gets MCP tools
3. OpenAI calls `search_catalogue` tool
4. MCP server executes search
5. Results formatted and streamed back

## 🎯 MCP Tools Available

If your MCP server is running, these tools are available:

- **search_catalogue** - Search datasets
- **get_record_details** - Get record by UUID
- **get_catalogue_tags** - List all tags
- **get_catalogue_regions** - List regions
- **get_site_info** - Get catalogue info
- **list_catalogue_groups** - List groups
- **duplicate_record** - Duplicate records (auth required)

## 🐛 Troubleshooting

### Port 5000 Already in Use
**Problem**: Python server still running
**Solution**:
```bash
# Stop Python server first, or change Node.js port in .env
PORT=5001
```

### MCP Server Not Found
**Problem**: `[MCP Client] Initialization failed`
**Solution**:
1. Check MCP server is running on port 3001
2. Verify `MCP_BASE_URL` in `.env`
3. Backend will still work without MCP (no catalogue tools)

### OpenAI Errors
**Problem**: `OPENAI_API_KEY not set`
**Solution**: Check `.env` file has valid OpenAI key

### CORS Errors
**Problem**: Frontend can't connect to backend
**Solution**:
1. Verify `FRONTEND_URL` in `.env` matches frontend URL
2. Check both frontend and backend are running

## 📚 Documentation

- [MIGRATION_TO_NODEJS.md](MIGRATION_TO_NODEJS.md) - Full migration details
- [MCP_INTEGRATION_GUIDE.md](MCP_INTEGRATION_GUIDE.md) - MCP integration guide
- [server/README.md](server/README.md) - Server documentation

## 🎉 What Changed from Python

| Aspect | Python (Old) | Node.js (New) |
|--------|--------------|---------------|
| Language | Python 3 | TypeScript |
| Framework | Flask | Express.js |
| MCP Client | Custom SSE client | Official `@modelcontextprotocol/sdk` |
| Async | Threading + requests | Native async/await |
| Type Safety | No | Full TypeScript |
| Location | `python_service/` | `server/` |

## ✅ Ready to Go!

Your chatbot is now:
- ✅ Running on Node.js
- ✅ Connected to OpenAI
- ✅ Integrated with MCP
- ✅ Ready for catalogue searches

Just start all three services:
1. MCP Server (port 3001)
2. Node.js Backend (port 5000)
3. React Frontend (port 5173)

---

**Questions?** Check the documentation files or server logs for debugging info.
