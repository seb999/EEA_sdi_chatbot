/**
 * MCP Client - Connect to MCP Server using SSE Transport
 * Uses the official Model Context Protocol SDK
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

class MCPClientWrapper {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private mcpBaseUrl: string;
  private availableTools: MCPTool[] = [];
  private initialized: boolean = false;

  constructor(baseUrl: string = 'http://127.0.0.1:3001') {
    this.mcpBaseUrl = baseUrl;
  }

  /**
   * Initialize the MCP client and connect to the server
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[MCP Client] Already initialized');
      return;
    }

    try {
      console.log(`[MCP Client] Connecting to ${this.mcpBaseUrl}...`);

      // Create SSE transport
      this.transport = new SSEClientTransport(
        new URL(`${this.mcpBaseUrl}/sse`),
        new URL(`${this.mcpBaseUrl}/message`)
      );

      // Create MCP client
      this.client = new Client(
        {
          name: 'eea-chatbot-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Connect to server
      await this.client.connect(this.transport);

      // List available tools
      const toolsResponse = await this.client.listTools();
      this.availableTools = toolsResponse.tools as MCPTool[];

      this.initialized = true;
      console.log(`[MCP Client] ✓ Connected with ${this.availableTools.length} tools available`);

      // Log tool names
      const toolNames = this.availableTools.map(t => t.name).join(', ');
      console.log(`[MCP Client] Tools: ${toolNames}`);

    } catch (error: any) {
      console.error('[MCP Client] Failed to initialize:', error.message);
      throw new Error(`MCP initialization failed: ${error.message}`);
    }
  }

  /**
   * Get list of available tools
   */
  getTools(): MCPTool[] {
    if (!this.initialized) {
      return [];
    }
    return this.availableTools;
  }

  /**
   * Convert MCP tools to OpenAI function format
   */
  convertToOpenAIFormat(): OpenAITool[] {
    return this.availableTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }));
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<string> {
    if (!this.initialized || !this.client) {
      throw new Error('MCP client not initialized');
    }

    try {
      console.log(`[MCP Client] Calling tool: ${toolName}`);
      console.log(`[MCP Client] Arguments:`, JSON.stringify(args, null, 2));

      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      // Format the result
      const formattedResult = this.formatToolResult(result);

      console.log(`[MCP Client] Result:`, formattedResult.substring(0, 200) + '...');

      return formattedResult;

    } catch (error: any) {
      console.error(`[MCP Client] Tool call failed:`, error.message);
      return `Error calling tool ${toolName}: ${error.message}`;
    }
  }

  /**
   * Format MCP tool result for OpenAI
   */
  private formatToolResult(result: any): string {
    if (result.isError) {
      const content = result.content || [];
      if (content.length > 0 && content[0].text) {
        return `Error: ${content[0].text}`;
      }
      return 'Error: Tool execution failed';
    }

    // Extract text content from MCP response
    const content = result.content || [];
    if (content.length > 0) {
      if (content[0].type === 'text' && content[0].text) {
        return content[0].text;
      }
    }

    return 'No result';
  }

  /**
   * Check if MCP is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log('[MCP Client] Disconnected');
      } catch (error) {
        console.error('[MCP Client] Error disconnecting:', error);
      }
    }
    this.initialized = false;
    this.client = null;
    this.transport = null;
  }
}

// Export singleton instance
let mcpClientInstance: MCPClientWrapper | null = null;

export function getMCPClient(baseUrl?: string): MCPClientWrapper {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClientWrapper(baseUrl || process.env.MCP_BASE_URL || 'http://127.0.0.1:3001');
  }
  return mcpClientInstance;
}

export async function initializeMCP(baseUrl?: string): Promise<MCPClientWrapper | null> {
  try {
    const client = getMCPClient(baseUrl);
    await client.initialize();
    return client;
  } catch (error: any) {
    console.error('[MCP Client] Initialization failed:', error.message);
    console.log('[MCP Client] ⚠️  Chatbot will work without MCP catalogue tools');
    return null;
  }
}

export { MCPClientWrapper };
