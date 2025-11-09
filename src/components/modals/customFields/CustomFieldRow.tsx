import { Trash2 } from 'lucide-react';
import type { CustomField, CustomFieldType } from '../../../utils/customFieldTypes';
import { FIELD_TYPES, TYPE_METADATA } from '../../../utils/customFieldTypes';
import CustomFieldValueInput from './CustomFieldValueInput';

interface CustomFieldRowProps {
  field: CustomField;
  onChange: (field: CustomField) => void;
  onRemove: () => void;
}

export default function CustomFieldRow({
  field,
  onChange,
  onRemove,
}: CustomFieldRowProps) {
  const handleKeyChange = (key: string) => {
    onChange({ ...field, key });
  };

  const handleTypeChange = (type: CustomFieldType) => {
    // Reset value when type changes to avoid invalid state
    onChange({ ...field, type, value: '' });
  };

  const handleValueChange = (value: string) => {
    onChange({ ...field, value });
  };

  return (
    <div className="flex gap-2 items-center min-w-0">
      <input
        type="text"
        value={field.key}
        onChange={(e) => handleKeyChange(e.target.value)}
        placeholder="Field name"
        className="flex-1 min-w-0 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
      />
      <select
        value={field.type}
        onChange={(e) => handleTypeChange(e.target.value as CustomFieldType)}
        className="w-32 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        title={TYPE_METADATA[field.type].example}
      >
        {FIELD_TYPES.map((type) => (
          <option key={type} value={type}>
            {TYPE_METADATA[type].label}
          </option>
        ))}
      </select>
      <CustomFieldValueInput
        type={field.type}
        value={field.value}
        onChange={handleValueChange}
      />
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 p-1.5 bg-red-900/50 text-red-300 border border-red-800 rounded hover:bg-red-900/70 transition-colors"
        aria-label="Remove field"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

