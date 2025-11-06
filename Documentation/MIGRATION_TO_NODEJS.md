# Migration from Python to Node.js Backend

## ✅ Migration Complete!

Your EEA SDI Chatbot backend has been successfully migrated from Python/Flask to Node.js/Express with TypeScript.

## What Changed

### Before (Python)
- **Location**: `python_service/app.py`
- **Language**: Python 3
- **Framework**: Flask
- **Dependencies**: flask, openai, requests

### After (Node.js)
- **Location**: `server/src/`
- **Language**: TypeScript
- **Framework**: Express.js
- **Dependencies**: express, openai, axios, cors

## Running the New Backend

### 1. Start the Node.js Server

```bash
cd server
npm run dev
```

The server will run on **http://localhost:5000**

### 2. Start the React Frontend

```bash
# In the root directory
npm run dev
```

The frontend will run on **http://localhost:5173**

## API Endpoints (Unchanged)

Your React frontend will work without any changes because the API endpoints remain the same:

- ✅ `POST /chat` - Streaming chat with OpenAI
- ✅ `POST /api/sdi/connect` - SDI authentication
- ✅ `POST /api/sdi/disconnect` - Disconnect from SDI
- ✅ `GET /api/sdi/status` - Check SDI status
- ✅ `GET /health` - Health check

## Benefits of Node.js Backend

1. **Single Language Stack** - JavaScript/TypeScript everywhere
2. **Better Type Safety** - Full TypeScript support
3. **Native Async** - Built-in async/await
4. **Easier Maintenance** - Shared code between frontend/backend
5. **Better MCP Integration** - Native support for MCP SDK (when you add it)

## Environment Variables

The `.env` file has been created in `server/.env` with your OpenAI API key.

```env
OPENAI_API_KEY=sk-proj-...
PORT=5000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=eea-chatbot-secret-key-2024
```

## Old Python Service

The Python service in `python_service/` is now deprecated but kept for reference. You can:
- Keep it for backup
- Delete it when confident with Node.js version
- Use it for reference if needed

## Next Steps

### Optional: Add MCP Support

When you're ready to add MCP (Model Context Protocol) support:

```bash
cd server
npm install @modelcontextprotocol/sdk
```

Then update the chat endpoint to include MCP tools for catalogue search.

## Testing

Test the backend:
```bash
# Health check
curl http://localhost:5000/health

# SDI status
curl http://localhost:5000/api/sdi/status
```

## Troubleshooting

### Server won't start
- Check that port 5000 is not in use
- Verify `.env` file exists with OPENAI_API_KEY

### OpenAI errors
- Verify your API key is valid
- Check OpenAI account has credits

### CORS errors
- Ensure FRONTEND_URL in `.env` matches your frontend URL
- Check that both frontend and backend are running

## Directory Structure

```
EEA_sdi_chatbot/
├── server/                    # ← New Node.js backend
│   ├── src/
│   │   ├── index.ts          # Main server
│   │   └── routes/
│   │       ├── chat.ts       # Chat endpoints
│   │       └── sdi.ts        # SDI auth
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── src/                       # React frontend
├── python_service/            # Old Python backend (deprecated)
└── package.json
```

---

**Status**: ✅ Ready to use
**Last Updated**: November 2024
