export type MessageRole = 'user' | 'assistant';

export type ToolCallStatus = 'pending' | 'executing' | 'completed' | 'error';

export interface ToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  status: ToolCallStatus;
  result?: unknown;
  error?: string;
  timestamp: number;
  messageId: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: string[]; // Array of tool call IDs
  isStreaming?: boolean;
}

export interface StreamingEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  data?: unknown;
  toolCallId?: string;
}

export interface ConversationSettings {
  endpoint: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
  };
  streamSettings?: {
    
  };
}

