/**
 * EEA SDI Chatbot - Node.js Backend Server
 * Connects React frontend to OpenAI API with MCP tools
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import chatRoutes from './routes/chat.js';
import sdiRoutes from './routes/sdi.js';
import { initializeMCP } from './lib/mcpClient.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/chat', chatRoutes);
app.use('/api/sdi', sdiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EEA ChatBot with OpenAI',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log('EEA ChatBot Service - Node.js with OpenAI + MCP');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`MCP Server: ${process.env.MCP_BASE_URL || 'http://127.0.0.1:3001'}`);
  console.log('='.repeat(60));

  if (!process.env.OPENAI_API_KEY) {
    console.error('⚠️  WARNING: OPENAI_API_KEY not set in .env file');
  }

  // Initialize MCP client
  await initializeMCP();
});

export default app;
