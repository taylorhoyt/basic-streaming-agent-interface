import type { Message, ToolCall } from '../types';

export interface StreamingParserCallbacks {
  onTextUpdate: (messageId: string, content: string) => void;
  onToolCallCreate: (toolCall: ToolCall) => void;
  onToolCallUpdate: (toolCallId: string, updates: Partial<ToolCall>) => void;
  onToolCallLinkToMessage: (messageId: string, toolCallId: string) => void;
  onMessageUpdate: (messageId: string, updates: Partial<Message>) => void;
  onToolResult: (toolCallId: string, result?: unknown, error?: string) => void;
  onNewMessageCycle?: (previousMessageId: string) => string; // Returns new message ID
}

export class StreamingParser {
  private buffer = '';
  private accumulatedContent = '';
  private contentBlockToToolUseId = new Map<number, string>();
  private toolCallInputs = new Map<string, string>();
  private assistantMessageId: string;
  private callbacks: StreamingParserCallbacks;
  private hasSeenFirstMessage = false;

  constructor(assistantMessageId: string, callbacks: StreamingParserCallbacks) {
    this.assistantMessageId = assistantMessageId;
    this.callbacks = callbacks;
  }

  async parseStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      this.buffer += decoder.decode(value, { stream: true });
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        this.parseLine(line.trim());
      }
    }
  }

  private parseLine(line: string): void {
    if (!line || !line.startsWith('data: ')) return;

    try {
      const jsonStr = line.substring(6); // Remove 'data: ' prefix

      // Skip Python string representations (they start with single quotes)
      // Only parse valid JSON objects/arrays
      if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
        const data = JSON.parse(jsonStr);
        this.handleData(data);
      }
    } catch (e) {
      // Skip invalid JSON (like Python string representations)
      console.debug('Skipping non-JSON line:', line);
    }
  }

  private handleData(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;

    // Handle events
    if ('event' in data && data.event) {
      this.handleEvent(data.event);
    }

    // Handle final message
    if ('message' in data && data.message) {
      const message = data.message as { role?: string; content?: unknown };
      if (message.role === 'assistant') {
        this.handleAssistantMessage(message);
      } else if (message.role === 'user') {
        this.handleToolResultMessage(message);
      }
    }
  }

  private handleEvent(event: unknown): void {
    if (typeof event !== 'object' || event === null) return;

    // Handle messageStart
    if ('messageStart' in event && event.messageStart) {
      if (this.hasSeenFirstMessage && this.callbacks.onNewMessageCycle) {
        // New message cycle after tool call - create new message
        const newMessageId = this.callbacks.onNewMessageCycle(this.assistantMessageId);
        if (newMessageId) {
          this.assistantMessageId = newMessageId;
          // Reset accumulated state for new message
          this.accumulatedContent = '';
          this.contentBlockToToolUseId.clear();
          this.toolCallInputs.clear();
        }
      }
      this.hasSeenFirstMessage = true;
      return;
    }

    // Handle contentBlockStart for tool calls
    if ('contentBlockStart' in event && event.contentBlockStart) {
      this.handleContentBlockStart(event.contentBlockStart);
    }

    // Handle contentBlockDelta
    if ('contentBlockDelta' in event && event.contentBlockDelta) {
      this.handleContentBlockDelta(event.contentBlockDelta);
    }

    // Handle contentBlockStop
    if ('contentBlockStop' in event && event.contentBlockStop) {
      this.handleContentBlockStop(event.contentBlockStop);
    }

    // Handle messageStop
    if ('messageStop' in event && event.messageStop) {
      this.callbacks.onMessageUpdate(this.assistantMessageId, {
        isStreaming: false,
      });
    }
  }

  private handleContentBlockStart(contentBlockStart: unknown): void {
    if (
      typeof contentBlockStart !== 'object' ||
      contentBlockStart === null ||
      !('start' in contentBlockStart) ||
      !('contentBlockIndex' in contentBlockStart)
    ) {
      return;
    }

    const start = (contentBlockStart as { start?: unknown }).start;
    const contentBlockIndex = (contentBlockStart as {
      contentBlockIndex: number;
    }).contentBlockIndex;

    if (
      typeof start === 'object' &&
      start !== null &&
      'toolUse' in start &&
      start.toolUse
    ) {
      const toolUse = (start as { toolUse: unknown }).toolUse as {
        toolUseId: string;
        name: string;
      };

      const toolUseId = toolUse.toolUseId;

      // Map contentBlockIndex to toolUseId
      this.contentBlockToToolUseId.set(contentBlockIndex, toolUseId);
      this.toolCallInputs.set(toolUseId, '');

      // Create a new tool call
      const toolCall: ToolCall = {
        id: toolUseId,
        toolName: toolUse.name,
        parameters: {},
        status: 'pending',
        timestamp: Date.now(),
        messageId: this.assistantMessageId,
      };

      this.callbacks.onToolCallCreate(toolCall);
      this.callbacks.onToolCallLinkToMessage(
        this.assistantMessageId,
        toolUseId
      );
    }
  }

  private handleContentBlockDelta(contentBlockDelta: unknown): void {
    if (
      typeof contentBlockDelta !== 'object' ||
      contentBlockDelta === null ||
      !('delta' in contentBlockDelta) ||
      !('contentBlockIndex' in contentBlockDelta)
    ) {
      return;
    }

    const delta = (contentBlockDelta as { delta: unknown }).delta;
    const contentBlockIndex = (contentBlockDelta as {
      contentBlockIndex: number;
    }).contentBlockIndex;

    if (typeof delta !== 'object' || delta === null) return;

    // Handle text deltas
    if ('text' in delta && delta.text !== undefined) {
      this.accumulatedContent += delta.text as string;
      this.callbacks.onTextUpdate(this.assistantMessageId, this.accumulatedContent);
    }

    // Handle toolUse input deltas (streaming JSON input)
    if (
      'toolUse' in delta &&
      delta.toolUse &&
      typeof delta.toolUse === 'object' &&
      delta.toolUse !== null &&
      'input' in delta.toolUse
    ) {
      const toolUseInput = delta.toolUse.input as string;
      const toolUseId = this.contentBlockToToolUseId.get(contentBlockIndex);

      if (toolUseId) {
        // Accumulate the input string
        const currentInput = this.toolCallInputs.get(toolUseId) || '';
        const newInput = currentInput + toolUseInput;
        this.toolCallInputs.set(toolUseId, newInput);

        // Try to parse the accumulated input as JSON and update the tool call
        // Only update if we have valid JSON
        try {
          const parsedInput = JSON.parse(newInput);
          this.callbacks.onToolCallUpdate(toolUseId, {
            parameters: parsedInput,
          });
        } catch {
          // JSON is incomplete, just update the parameters with the raw string
          // We'll parse it properly when we get the final message
        }
      }
    }
  }

  private handleContentBlockStop(contentBlockStop: unknown): void {
    if (
      typeof contentBlockStop !== 'object' ||
      contentBlockStop === null ||
      !('contentBlockIndex' in contentBlockStop)
    ) {
      return;
    }

    const contentBlockIndex = (contentBlockStop as {
      contentBlockIndex: number;
    }).contentBlockIndex;
    const toolUseId = this.contentBlockToToolUseId.get(contentBlockIndex);

    if (toolUseId) {
      // Try to parse the final accumulated input
      const accumulatedInput = this.toolCallInputs.get(toolUseId);
      if (accumulatedInput) {
        try {
          const parsedInput = JSON.parse(accumulatedInput);
          this.callbacks.onToolCallUpdate(toolUseId, {
            parameters: parsedInput,
            status: 'executing',
          });
        } catch {
          // If parsing fails, mark as executing anyway - we'll get the final message
          this.callbacks.onToolCallUpdate(toolUseId, {
            status: 'executing',
          });
        }
      }
    }
  }

  private handleAssistantMessage(message: {
    role?: string;
    content?: unknown;
  }): void {
    const messageContent = message.content;
    if (!Array.isArray(messageContent)) return;

    let fullText = '';
    const toolCallIds: string[] = [];

    for (const block of messageContent) {
      if (typeof block === 'object' && block !== null) {
        if ('text' in block && block.text) {
          fullText += block.text as string;
        }
        if ('toolUse' in block && block.toolUse) {
          const toolUse = block.toolUse as {
            toolUseId: string;
            name: string;
            input: string | Record<string, unknown>;
          };
          const toolUseId = toolUse.toolUseId;
          toolCallIds.push(toolUseId);

          // Update or create tool call with complete information
          const parameters =
            typeof toolUse.input === 'string'
              ? JSON.parse(toolUse.input)
              : toolUse.input;

          this.callbacks.onToolCallUpdate(toolUseId, {
            toolName: toolUse.name,
            parameters,
            status: 'executing',
          });
        }
      }
    }

    if (fullText) {
      this.accumulatedContent = fullText;
      this.callbacks.onTextUpdate(this.assistantMessageId, fullText);
      this.callbacks.onMessageUpdate(this.assistantMessageId, {
        content: fullText,
        isStreaming: false,
        toolCalls: toolCallIds,
      });
    } else if (toolCallIds.length > 0) {
      // Update message with tool calls even if no text
      this.callbacks.onMessageUpdate(this.assistantMessageId, {
        isStreaming: false,
        toolCalls: toolCallIds,
      });
    }
  }

  private handleToolResultMessage(message: {
    role?: string;
    content?: unknown;
  }): void {
    const messageContent = message.content;
    if (!Array.isArray(messageContent)) return;

    for (const block of messageContent) {
      if (
        typeof block === 'object' &&
        block !== null &&
        'toolResult' in block &&
        block.toolResult
      ) {
        const toolResult = block.toolResult as {
          toolUseId: string;
          status: string;
          content?: Array<{ text?: string }> | unknown;
        };
        const toolUseId = toolResult.toolUseId;
        const status = toolResult.status === 'success' ? 'completed' : 'error';
        const result =
          Array.isArray(toolResult.content) && toolResult.content[0]?.text
            ? toolResult.content[0].text
            : toolResult.content;

        this.callbacks.onToolResult(
          toolUseId,
          status === 'completed' ? result : undefined,
          status === 'error' ? String(result) : undefined
        );
      }
    }
  }
}

