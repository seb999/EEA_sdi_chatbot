/**
 * Chat Routes - Handle chat requests with OpenAI streaming and MCP tools
 */
import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { getMCPClient } from '../lib/mcpClient.js';

const router = Router();

// Get OpenAI client (lazy initialization)
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * POST /chat
 * Handle chat requests with streaming support and MCP tools
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !Array.isArray(prompt)) {
      return res.status(400).json({ error: 'Invalid request: prompt must be an array of messages' });
    }

    // Log incoming request
    const userMessage = prompt[prompt.length - 1]?.content || '';
    console.log('\n' + '='.repeat(60));
    console.log(`📨 New chat request: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
    console.log('='.repeat(60));

    // Get MCP client
    const mcpClient = getMCPClient();
    const mcpEnabled = mcpClient.isInitialized();

    // Add system message with MCP tools context
    const systemContent = mcpEnabled
      ? `You are a helpful assistant for the European Environment Agency (EEA) that helps users explore the EEA SDI Catalogue of geospatial metadata.

IMPORTANT: You have access to catalogue tools. You MUST use these tools to answer user questions:

USE TOOLS FOR:
- Searching datasets: Use search_catalogue tool
- Getting record details: Use get_record_details tool when user provides a UUID
- Listing tags: Use get_catalogue_tags tool
- Listing regions: Use get_catalogue_regions tool
- Commands like "/record <uuid>", "/tag", "/search <query>" - ALWAYS use the corresponding tool

CRITICAL: When a user provides a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) with "/record" or asks for record details, you MUST call the get_record_details tool immediately. Do NOT try to fetch the details yourself.

Example:
User: "/record e7967ccf-26f0-4758-8afc-5d1ff5b50577"
Action: Call get_record_details with uuid="e7967ccf-26f0-4758-8afc-5d1ff5b50577"

After getting tool results, present them in a conversational, helpful way.`
      : `You are a helpful assistant for the European Environment Agency (EEA) that helps users with their questions.

Provide clear, concise, and helpful responses. When discussing environmental topics, ensure accuracy and cite relevant information when possible.

Be conversational and friendly while maintaining professionalism.`;

    const systemMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'system',
      content: systemContent
    };

    // Prepare messages for OpenAI
    let messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      systemMessage,
      ...prompt
    ];

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Get OpenAI client
    const openai = getOpenAI();

    // Prepare API params
    const apiParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model: 'gpt-4o',
      messages: messages,
      stream: false
    };

    // Add MCP tools if available
    if (mcpEnabled) {
      const mcpTools = mcpClient.convertToOpenAIFormat();
      if (mcpTools.length > 0) {
        apiParams.tools = mcpTools;
        apiParams.tool_choice = 'auto';
        console.log(`📋 ${mcpTools.length} MCP tools available: ${mcpTools.map(t => t.function.name).join(', ')}`);
      }
    } else {
      console.log('💬 Processing chat without MCP tools');
    }

    console.log('🤖 Calling OpenAI API...');

    // First API call - check if model wants to use tools
    const response = await openai.chat.completions.create(apiParams);
    const message = response.choices[0].message;

    // Check if the model wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`🔧 LLM decided to call ${message.tool_calls.length} tool(s)`);

      // Add assistant message to conversation
      messages.push(message);

      // Execute all tool calls
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`  Calling tool: ${functionName}`);
        console.log(`  Arguments:`, JSON.stringify(functionArgs, null, 2));

        // Call the MCP tool
        const toolResult = await mcpClient.callTool(functionName, functionArgs);

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult
        });

        console.log(`  Result: ${toolResult.substring(0, 200)}...`);
      }

      console.log('✅ All tools executed, sending results back to LLM...');

      // Second API call with tool results - stream the response
      const streamResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        stream: true
      });

      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data:${JSON.stringify({ content })}\n`);
        }
      }

    } else {
      // No tool calls, stream the direct response
      console.log('💬 LLM responding directly without tools');

      const streamResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        stream: true
      });

      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data:${JSON.stringify({ content })}\n`);
        }
      }
    }

    console.log('✓ Response streamed to client');
    res.end();

  } catch (error: any) {
    console.error('❌ Error in chat:', error.message);

    // If headers not sent, send error response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    } else {
      // If streaming already started, send error as SSE
      res.write(`data:${JSON.stringify({ content: `Error: ${error.message}` })}\n`);
      res.end();
    }
  }
});

export default router;
