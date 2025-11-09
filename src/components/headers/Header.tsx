import { Settings } from "lucide-react";

interface HeaderProps {
  onSettingsClick: () => void;
  onClearConversation: () => void;
}

export default function Header({ onSettingsClick, onClearConversation }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
      <h3 className="text-xl font-mono text-white">AgentCore Interface</h3>
      <div className="flex gap-2">
        <button
          onClick={onClearConversation}
          className="px-4 py-2 font-mono text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onSettingsClick}
          className="px-4 py-2 font-mono text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

