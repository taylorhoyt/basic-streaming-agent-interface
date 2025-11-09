import ToolCallCard from './ToolCallCard';
import type { ToolCall } from '../../../types';
import { X } from 'lucide-react';

interface ToolCallsPanelProps {
  toolCalls: ToolCall[];
  width: number;
  isVisible: boolean;
  onClose: () => void;
}

export default function ToolCallsPanel({ toolCalls, width, isVisible, onClose }: ToolCallsPanelProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="border-l border-gray-700 bg-gray-900 flex flex-col flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h6 className="font-mono text-sm font-semibold text-white">
          Tool Calls ({toolCalls.length})
        </h6>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 font-mono text-xs"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {toolCalls.length === 0 ? (
          <div className="text-gray-500 text-xs font-mono text-center py-4">
            No tool calls yet
          </div>
        ) : (
          toolCalls.map((toolCall) => (
            <ToolCallCard key={toolCall.id} toolCall={toolCall} variant="panel" />
          ))
        )}
      </div>
    </div>
  );
}

