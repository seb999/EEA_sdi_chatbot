/**
 * Service for interacting with the EEA LLM Service (Flask backend)
 */

import type { ChatGptMessage } from "../type/ChatGptMessage";

export interface StreamChunk {
  content: string;
}

export interface ChatResponse {
  role: "assistant";
  content: string;
}

class LLMService {
  private baseUrl = "/chat";

  /**
   * Send a chat message and receive a streaming response
   * @param messages - Full conversation history
   * @param onChunk - Callback for each streamed chunk
   * @returns Promise that resolves when streaming is complete
   */
  async sendMessage(
    messages: ChatGptMessage[],
    onChunk: (chunk: string, fullContent: string) => void
  ): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: messages }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n");
      buffer = chunks.pop() || "";

      for (const chunk of chunks) {
        if (chunk.startsWith("data:")) {
          const json = chunk.replace("data:", "").replace("null", "").trim();
          try {
            const parsed: StreamChunk = JSON.parse(json);
            const chunkText = parsed.content;

            fullContent += chunkText;

            // Call the callback with the new chunk and full content so far
            onChunk(chunkText, fullContent);
          } catch (err) {
            console.error("Failed to parse JSON chunk:", json, err);
          }
        }
      }
    }

    return fullContent;
  }

  /**
   * Send a simple chat message without streaming
   * Useful for non-interactive scenarios
   * @param messages - Full conversation history
   * @returns Promise with the complete response
   */
  async sendMessageSync(messages: ChatGptMessage[]): Promise<string> {
    let fullContent = "";

    await this.sendMessage(messages, (_, content) => {
      fullContent = content;
    });

    return fullContent;
  }

  /**
   * Create a new conversation with a system prompt
   * @param systemPrompt - Initial system message
   * @returns Initial message array
   */
  createConversation(systemPrompt?: string): ChatGptMessage[] {
    if (systemPrompt) {
      return [{ role: "user", content: systemPrompt }];
    }
    return [];
  }

  /**
   * Add a user message to the conversation
   * @param messages - Current conversation
   * @param content - User message content
   * @returns Updated conversation
   */
  addUserMessage(
    messages: ChatGptMessage[],
    content: string
  ): ChatGptMessage[] {
    return [...messages, { role: "user", content }];
  }

  /**
   * Add an assistant message to the conversation
   * @param messages - Current conversation
   * @param content - Assistant message content
   * @returns Updated conversation
   */
  addAssistantMessage(
    messages: ChatGptMessage[],
    content: string
  ): ChatGptMessage[] {
    return [...messages, { role: "assistant", content }];
  }
}

// Export a singleton instance
export const llmService = new LLMService();
