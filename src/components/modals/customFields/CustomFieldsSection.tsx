import type { CustomField } from '../../../utils/customFieldTypes';
import CustomFieldRow from './CustomFieldRow';

interface CustomFieldsSectionProps {
  fields: CustomField[];
  onFieldsChange: (fields: CustomField[]) => void;
}

export default function CustomFieldsSection({
  fields,
  onFieldsChange,
}: CustomFieldsSectionProps) {
  const handleAddField = () => {
    onFieldsChange([
      ...fields,
      { key: '', type: 'string', value: '' },
    ]);
  };

  const handleRemoveField = (index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: CustomField) => {
    onFieldsChange(
      fields.map((f, i) => (i === index ? field : f))
    );
  };

  return (
    <div className="border-t border-gray-700 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm text-gray-300">Custom Request Fields</label>
        <button
          type="button"
          onClick={handleAddField}
          className="px-3 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
        >
          + Add Field
        </button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto overflow-x-hidden">
        {fields.map((field, index) => (
          <CustomFieldRow
            key={index}
            field={field}
            onChange={(updatedField) => handleFieldChange(index, updatedField)}
            onRemove={() => handleRemoveField(index)}
          />
        ))}
        {fields.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            No custom fields. Click "Add Field" to add key-value pairs that will be included in the request body.
          </p>
        )}
      </div>
    </div>
  );
}

