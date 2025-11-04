/**
 * Service for interacting with the EEA SDI Catalogue MCP API
 */

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

class MCPService {
  private baseUrl = '/api';

  /**
   * Search for metadata records in the catalogue
   */
  async searchRecords(params: SearchParams = {}) {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get detailed metadata for a specific record
   */
  async getRecord(uuid: string, approved: boolean = true) {
    const response = await fetch(
      `${this.baseUrl}/records/${uuid}?approved=${approved}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get record: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get available export formats for a record
   */
  async getRecordFormatters(uuid: string) {
    const response = await fetch(`${this.baseUrl}/records/${uuid}/formatters`);

    if (!response.ok) {
      throw new Error(`Failed to get formatters: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Export a record in a specific format
   */
  async exportRecord(uuid: string, formatter: string) {
    const response = await fetch(
      `${this.baseUrl}/records/${uuid}/export/${formatter}`
    );

    if (!response.ok) {
      throw new Error(`Failed to export record: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Get records related to a specific record
   */
  async getRelatedRecords(uuid: string, type?: string) {
    const url = type
      ? `${this.baseUrl}/records/${uuid}/related?type=${type}`
      : `${this.baseUrl}/records/${uuid}/related`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get related records: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List all groups in the catalogue
   */
  async listGroups(withReservedGroup: boolean = false) {
    const response = await fetch(
      `${this.baseUrl}/groups?withReservedGroup=${withReservedGroup}`
    );

    if (!response.ok) {
      throw new Error(`Failed to list groups: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get catalogue sources (sub-portals)
   */
  async getSources() {
    const response = await fetch(`${this.baseUrl}/sources`);

    if (!response.ok) {
      throw new Error(`Failed to get sources: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get site configuration information
   */
  async getSiteInfo() {
    const response = await fetch(`${this.baseUrl}/site`);

    if (!response.ok) {
      throw new Error(`Failed to get site info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all available tags/categories
   */
  async getTags(): Promise<Tag[]> {
    const response = await fetch(`${this.baseUrl}/tags`);

    if (!response.ok) {
      throw new Error(`Failed to get tags: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get geographic regions/extents
   */
  async getRegions(categoryId?: string): Promise<Region[]> {
    const url = categoryId
      ? `${this.baseUrl}/regions?categoryId=${categoryId}`
      : `${this.baseUrl}/regions`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get regions: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search by geographic extent (bounding box)
   */
  async searchByExtent(params: ExtentSearchParams) {
    const response = await fetch(`${this.baseUrl}/search/extent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Extent search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get list of available tools/endpoints
   */
  async getTools() {
    const response = await fetch('/tools');

    if (!response.ok) {
      throw new Error(`Failed to get tools: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check API health
   */
  async checkHealth() {
    const response = await fetch('/health');

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Export a singleton instance
export const mcpService = new MCPService();
