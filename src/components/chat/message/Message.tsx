import type { Message as MessageType, ToolCall } from '../../../types';
import ToolCallIndicator from '../tools/ToolCallIndicator';

interface MessageProps {
  message: MessageType;
  getToolCall?: (id: string) => ToolCall | undefined;
}

export default function Message({ message, getToolCall }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-lg p-4 font-mono text-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.toolCalls.map((toolCallId) => (
              <ToolCallIndicator
                key={toolCallId}
                toolCallId={toolCallId}
                toolCall={getToolCall?.(toolCallId)}
              />
            ))}
          </div>
        )}
        {message.isStreaming && (
          <span className="inline-block ml-2 w-2 h-4 bg-gray-400 animate-pulse" />
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs opacity-60">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
          {message.tokenUsage && (
            <div className="text-xs opacity-60 flex items-center gap-3">
              <span>Tokens: {message.tokenUsage.totalTokens.toLocaleString()}</span>
              <span className="opacity-50">
                ({message.tokenUsage.inputTokens.toLocaleString()} in /{' '}
                {message.tokenUsage.outputTokens.toLocaleString()} out)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

