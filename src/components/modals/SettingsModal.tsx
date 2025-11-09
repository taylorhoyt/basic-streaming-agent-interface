import { useState, useEffect } from 'react';
import type { ConversationSettings } from '../../types';
import type { CustomField } from '../../utils/customFieldTypes';
import { detectFieldType, valueToString } from '../../utils/customFieldTypes';
import { parseFieldValue } from '../../utils/customFieldParser';
import CustomFieldsSection from './customFields/CustomFieldsSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversationSettings;
  onSave: (settings: ConversationSettings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<ConversationSettings>(settings);
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    if (settings.customFields) {
      return Object.entries(settings.customFields).map(([key, value]) => {
        const type = detectFieldType(value);
        return {
          key,
          type,
          value: valueToString(type, value),
        };
      });
    }
    return [];
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      if (settings.customFields) {
        setCustomFields(
          Object.entries(settings.customFields).map(([key, value]) => {
            const type = detectFieldType(value);
            return {
              key,
              type,
              value: valueToString(type, value),
            };
          })
        );
      } else {
        setCustomFields([]);
      }
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert custom fields array to object using parser
    const customFieldsObj: Record<string, unknown> = {};
    customFields.forEach((field) => {
      if (field.key.trim()) {
        customFieldsObj[field.key.trim()] = parseFieldValue(field.type, field.value);
      }
    });
    
    onSave({
      ...formData,
      customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-2xl font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Endpoint URL
            </label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) =>
                setFormData({ ...formData, endpoint: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Access Key ID
            </label>
            <input
              type="password"
              value={formData.credentials?.accessKeyId || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  credentials: {
                    ...formData.credentials,
                    accessKeyId: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Secret Access Key
            </label>
            <input
              type="password"
              value={formData.credentials?.secretAccessKey || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  credentials: {
                    ...formData.credentials,
                    secretAccessKey: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Region</label>
            <input
              type="text"
              value={formData.credentials?.region || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  credentials: {
                    ...formData.credentials,
                    region: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="us-east-1"
            />
          </div>
          <CustomFieldsSection
            fields={customFields}
            onFieldsChange={setCustomFields}
          />
          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

