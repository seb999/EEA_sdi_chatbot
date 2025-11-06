/**
 * MCP Client Service using SSE Transport
 * Connects to the EEA SDI MCP Server via Server-Sent Events
 */

export interface Tag {
  name: string;
  id: number;
  label: {
    eng: string;
  };
}

export interface Region {
  id: string;
  name: string;
  label?: {
    eng: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export interface SearchParams {
  query?: string;
  from?: number;
  size?: number;
  bucket?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExtentSearchParams {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
  relation?: 'intersects' | 'within' | 'contains';
}

class MCPService {
  private baseUrl = '';
  private messageIdCounter = 0;
  private availableTools: MCPTool[] = [];
  private initialized = false;
  private eventSource: EventSource | null = null;
  private sseConnected = false;

  /**
   * Check server health before establishing connection
   */
  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('[MCP Client] Health check passed:', data);
      return true;
    } catch (error) {
      console.error('[MCP Client] Health check failed:', error);
      throw error;
    }
  }

  /**
   * Establish SSE connection to the MCP server
   */
  private async connectSSE(): Promise<void> {
    if (this.sseConnected && this.eventSource) {
      console.log('[MCP Client] SSE already connected');
      return;
    }

    // First check health
    await this.checkHealth();

    return new Promise((resolve, reject) => {
      console.log('[MCP Client] Establishing SSE connection to /sse...');

      this.eventSource = new EventSource(`${this.baseUrl}/sse`);

      this.eventSource.onopen = () => {
        console.log('[MCP Client] SSE connection established successfully');
        this.sseConnected = true;
        resolve();
      };

      this.eventSource.onerror = (error) => {
        console.error('[MCP Client] SSE connection error:', error);
        this.sseConnected = false;
        this.eventSource?.close();
        this.eventSource = null;
        reject(new Error('Failed to establish SSE connection'));
      };

      this.eventSource.onmessage = (event) => {
        console.log('[MCP Client] SSE message received:', event.data);
        // Handle server messages if needed
      };

      // Set a timeout for connection
      setTimeout(() => {
        if (!this.sseConnected) {
          console.error('[MCP Client] SSE connection timeout');
          this.eventSource?.close();
          this.eventSource = null;
          reject(new Error('SSE connection timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Initialize the MCP connection and list available tools
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('[MCP Client] Starting initialization...');

      // Step 1: Establish SSE connection first
      await this.connectSSE();

      // Step 2: List available tools from the server
      console.log('[MCP Client] Requesting tools list...');
      const result = await this.sendMCPRequest('tools/list', {});

      if (result.tools) {
        this.availableTools = result.tools;
        this.initialized = true;
        console.log(`[MCP Client] Initialized successfully with ${this.availableTools.length} tools`);
      }
    } catch (error) {
      console.error('[MCP Client] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Disconnect SSE connection
   */
  disconnect() {
    if (this.eventSource) {
      console.log('[MCP Client] Closing SSE connection');
      this.eventSource.close();
      this.eventSource = null;
      this.sseConnected = false;
      this.initialized = false;
    }
  }

  /**
   * Send an MCP protocol request via POST /message
   */
  private async sendMCPRequest(method: string, params: any): Promise<any> {
    const messageId = ++this.messageIdCounter;

    const mcpRequest = {
      jsonrpc: '2.0',
      id: messageId,
      method,
      params,
    };

    const response = await fetch(`${this.baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mcpRequest),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`MCP error: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Call a tool on the MCP server
   */
  private async callTool(toolName: string, args: any): Promise<MCPToolResult> {
    const result = await this.sendMCPRequest('tools/call', {
      name: toolName,
      arguments: args,
    });

    return result;
  }

  /**
   * Get list of available tools
   */
  async getTools(): Promise<MCPTool[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.availableTools;
  }

  /**
   * Search for metadata records in the catalogue
   */
  async searchRecords(params: SearchParams = {}) {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('search_records', params);

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Search failed');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Get detailed metadata for a specific record
   */
  async getRecord(uuid: string, approved: boolean = true) {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('get_record', { uuid, approved });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to get record');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Get available export formats for a record
   */
  async getRecordFormatters(uuid: string) {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('get_record_formatters', { uuid });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to get formatters');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Export a record in a specific format
   */
  async exportRecord(uuid: string, formatter: string) {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('export_record', { uuid, formatter });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to export record');
    }

    // Export returns raw text, not JSON
    return result.content[0].text;
  }

  /**
   * Get records related to a specific record
   */
  async getRelatedRecords(uuid: string, type?: string) {
    if (!this.initialized) await this.initialize();

    const args: any = { uuid };
    if (type) args.type = type;

    const result = await this.callTool('get_related_records', args);

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to get related records');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * List all groups in the catalogue
   */
  async listGroups(withReservedGroup: boolean = false) {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('list_groups', { withReservedGroup });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to list groups');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Get catalogue sources (sub-portals)
   */
  async getSources() {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('get_sources', {});

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to get sources');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Get site configuration information
   */
  async getSiteInfo() {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('get_site_info', {});

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to get site info');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Get all available tags/categories
   */
  async getTags() {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('get_tags', {});

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to get tags');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Get geographic regions/extents
   */
  async getRegions(categoryId?: string) {
    if (!this.initialized) await this.initialize();

    const args: any = {};
    if (categoryId) args.categoryId = categoryId;

    const result = await this.callTool('get_regions', args);

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to get regions');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Search by geographic extent (bounding box)
   */
  async searchByExtent(params: ExtentSearchParams) {
    if (!this.initialized) await this.initialize();

    const result = await this.callTool('search_by_extent', params);

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Extent search failed');
    }

    return JSON.parse(result.content[0].text);
  }

  /**
   * Duplicate a metadata record
   */
  async duplicateRecord(metadataUuid: string, groupId?: string, isVisibleByAllGroupMembers?: boolean) {
    if (!this.initialized) await this.initialize();

    const args: any = { metadataUuid };
    if (groupId !== undefined) args.groupId = groupId;
    if (isVisibleByAllGroupMembers !== undefined) args.isVisibleByAllGroupMembers = isVisibleByAllGroupMembers;

    const result = await this.callTool('duplicate_record', args);

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to duplicate record');
    }

    return JSON.parse(result.content[0].text);
  }
}

// Export a singleton instance
export const mcpService = new MCPService();
