import { useState, useCallback } from 'react';
import Header from '../headers/Header';
import MessageList from './message/MessageList';
import ChatInput from './ChatInput';
import ToolCallsPanel from './tools/ToolCallsPanel';
import StreamingIndicator from '../indicators/StreamingIndicator';
import SettingsModal from '../modals/SettingsModal';
import type { Message, ToolCall, ConversationSettings } from '../../types';
import { StreamingParser } from '../../utils/streamParser';

const defaultSettings: ConversationSettings = {
  endpoint: 'http://localhost:8080/invocations',
  credentials: {},
};

// Helper to normalize endpoint URL - use proxy in development for localhost
const normalizeEndpoint = (endpoint: string): string => {
  try {
    const url = new URL(endpoint);
    // If it's localhost:8080, use the proxy path
    if (url.hostname === 'localhost' && url.port === '8080') {
      return `/api${url.pathname}`;
    }
    // Otherwise return as-is
    return endpoint;
  } catch {
    // If it's not a valid URL, check if it's already a relative path
    if (endpoint.startsWith('/')) {
      return endpoint;
    }
    return endpoint;
  }
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings>(() => {
    const saved = localStorage.getItem('agentcore-settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const handleSend = useCallback(
    async (content: string) => {
      if (!settings.endpoint) {
        alert('Please configure the endpoint in settings first.');
        return;
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      // Create assistant message immediately for streaming
      const assistantMessageId = `msg-${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const endpointUrl = normalizeEndpoint(settings.endpoint);
        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: content }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();

        // Create parser with callbacks
        const parser = new StreamingParser(assistantMessageId, {
          onTextUpdate: (messageId: string, content: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, content } : msg
              )
            );
          },
          onNewMessageCycle: (_previousMessageId: string) => {
            // Create a new assistant message for the next cycle
            const newAssistantMessageId = `msg-${Date.now()}`;
            const newAssistantMessage: Message = {
              id: newAssistantMessageId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              isStreaming: true,
            };
            setMessages((prev) => [...prev, newAssistantMessage]);
            return newAssistantMessageId;
          },
          onToolCallCreate: (toolCall: ToolCall) => {
            setToolCalls((prev) => [...prev, toolCall]);
          },
          onToolCallUpdate: (toolCallId: string, updates: Partial<ToolCall>) => {
            setToolCalls((prev) => {
              const existing = prev.find((tc) => tc.id === toolCallId);
              if (existing) {
                // Update existing tool call
                return prev.map((tc) =>
                  tc.id === toolCallId ? { ...tc, ...updates } : tc
                );
              } else {
                // Create new tool call if it doesn't exist
                const newToolCall: ToolCall = {
                  id: toolCallId,
                  toolName: updates.toolName || '',
                  parameters: updates.parameters || {},
                  status: (updates.status as ToolCall['status']) || 'executing',
                  timestamp: Date.now(),
                  messageId: assistantMessageId,
                  ...updates,
                };
                return [...prev, newToolCall];
              }
            });
          },
          onToolCallLinkToMessage: (messageId: string, toolCallId: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      toolCalls: [...(msg.toolCalls || []), toolCallId],
                    }
                  : msg
              )
            );
          },
          onMessageUpdate: (messageId: string, updates: Partial<Message>) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      ...updates,
                      toolCalls:
                        'toolCalls' in updates && updates.toolCalls
                          ? [
                              ...(msg.toolCalls || []),
                              ...updates.toolCalls.filter(
                                (id) => !msg.toolCalls?.includes(id)
                              ),
                            ]
                          : msg.toolCalls,
                    }
                  : msg
              )
            );
          },
          onToolResult: (toolCallId: string, result?: unknown, error?: string) => {
            setToolCalls((prev) => {
              const existing = prev.find((tc) => tc.id === toolCallId);
              if (existing) {
                return prev.map((tc) =>
                  tc.id === toolCallId
                    ? {
                        ...tc,
                        status: error ? 'error' : 'completed',
                        result,
                        error,
                      }
                    : tc
                );
              } else {
                // Create tool call if it doesn't exist (shouldn't happen, but be safe)
                const newToolCall: ToolCall = {
                  id: toolCallId,
                  toolName: 'unknown',
                  parameters: {},
                  status: error ? 'error' : 'completed',
                  timestamp: Date.now(),
                  messageId: assistantMessageId,
                  result,
                  error,
                };
                return [...prev, newToolCall];
              }
            });
          },
        });

        await parser.parseStream(reader);

        // Ensure streaming is marked as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
      } catch (error) {
        console.error('Streaming error:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  isStreaming: false,
                }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [settings.endpoint]
  );

  const handleClearConversation = useCallback(() => {
    if (confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
      setToolCalls([]);
    }
  }, []);

  const handleSaveSettings = useCallback((newSettings: ConversationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('agentcore-settings', JSON.stringify(newSettings));
  }, []);

  const getToolCallById = useCallback(
    (id: string) => toolCalls.find((tc) => tc.id === id),
    [toolCalls]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Header
        onSettingsClick={() => setIsSettingsOpen(true)}
        onClearConversation={handleClearConversation}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <MessageList
            messages={messages}
            getToolCall={getToolCallById}
          />
          <StreamingIndicator isStreaming={isStreaming} />
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
        <ToolCallsPanel toolCalls={toolCalls} />
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

