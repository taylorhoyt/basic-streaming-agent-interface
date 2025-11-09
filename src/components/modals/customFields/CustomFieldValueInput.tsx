import type { CustomFieldType } from '../../../utils/customFieldTypes';
import { TYPE_METADATA } from '../../../utils/customFieldTypes';

interface CustomFieldValueInputProps {
  type: CustomFieldType;
  value: string;
  onChange: (value: string) => void;
}

export default function CustomFieldValueInput({
  type,
  value,
  onChange,
}: CustomFieldValueInputProps) {
  const metadata = TYPE_METADATA[type];

  switch (type) {
    case 'boolean': {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Select...</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    case 'object': {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={metadata.placeholder}
          rows={3}
          className="flex-1 min-w-0 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500 font-mono resize-y"
        />
      );
    }

    case 'number': {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={metadata.placeholder}
          step="any"
          className="flex-1 min-w-0 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        />
      );
    }

    case 'string[]':
    case 'number[]':
    case 'boolean[]': {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={metadata.placeholder}
          className="flex-1 min-w-0 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        />
      );
    }

    case 'string':
    default: {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={metadata.placeholder}
          className="flex-1 min-w-0 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        />
      );
    }
  }
}

