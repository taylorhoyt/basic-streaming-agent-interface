/**
 * Type definitions and utilities for custom fields in settings
 */

export type CustomFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'boolean[]'
  | 'object';

export interface CustomField {
  key: string;
  type: CustomFieldType;
  value: string; // Raw string input, will be parsed based on type
}

export interface TypeMetadata {
  label: string;
  placeholder: string;
  example: string;
}

export const FIELD_TYPES: CustomFieldType[] = [
  'string',
  'number',
  'boolean',
  'string[]',
  'number[]',
  'boolean[]',
  'object',
];

export const TYPE_METADATA: Record<CustomFieldType, TypeMetadata> = {
  string: {
    label: 'String',
    placeholder: '"example"',
    example: '"hello world"',
  },
  number: {
    label: 'Number',
    placeholder: '123',
    example: '42',
  },
  boolean: {
    label: 'Boolean',
    placeholder: 'true or false',
    example: 'true',
  },
  'string[]': {
    label: 'String Array',
    placeholder: '"item1", "item2", "item3"',
    example: '"apple", "banana", "cherry"',
  },
  'number[]': {
    label: 'Number Array',
    placeholder: '1, 2, 3',
    example: '1, 2, 3, 4, 5',
  },
  'boolean[]': {
    label: 'Boolean Array',
    placeholder: 'true, false',
    example: 'true, false, true',
  },
  object: {
    label: 'Object',
    placeholder: '{"key": "value"}',
    example: '{"nested": {"key": "value"}}',
  },
};

/**
 * Detects the type of a value and returns the appropriate CustomFieldType
 */
export function detectFieldType(value: unknown): CustomFieldType {
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Default to string array if empty
      return 'string[]';
    }
    const firstElement = value[0];
    if (typeof firstElement === 'string') {
      return 'string[]';
    }
    if (typeof firstElement === 'number') {
      return 'number[]';
    }
    if (typeof firstElement === 'boolean') {
      return 'boolean[]';
    }
    // Default to string array for mixed or unknown types
    return 'string[]';
  }
  if (typeof value === 'object' && value !== null) {
    return 'object';
  }
  // Default fallback
  return 'string';
}

/**
 * Converts a value to its string representation for input
 */
export function valueToString(type: CustomFieldType, value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'string':
      return typeof value === 'string' ? value : String(value);
    case 'number':
      return String(value);
    case 'boolean':
      return String(value);
    case 'string[]':
      if (Array.isArray(value)) {
        return value.map((v) => JSON.stringify(String(v))).join(', ');
      }
      return String(value);
    case 'number[]':
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    case 'boolean[]':
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    case 'object':
      return JSON.stringify(value, null, 2);
    default:
      return String(value);
  }
}

