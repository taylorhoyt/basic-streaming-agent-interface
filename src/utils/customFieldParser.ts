/**
 * Parser utility for custom field values based on their type
 */

import type { CustomFieldType } from './customFieldTypes';

/**
 * Parses a string input value based on the field type
 * 
 * Rules:
 * - Strings: Must be wrapped in quotes (e.g., "hello")
 * - Numbers: Parse as number (e.g., 123, 45.67)
 * - Booleans: Must be true or false without quotes (not 0/1)
 * - Arrays: Parse comma-separated values based on element type
 * - Objects: Parse as JSON
 * 
 * @param type - The type of the field
 * @param input - The raw string input from the user
 * @returns The parsed value, or falls back to string if parsing fails
 */
export function parseFieldValue(type: CustomFieldType, input: string): unknown {
  const trimmed = input.trim();
  
  // Empty input returns empty value based on type
  if (trimmed === '') {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'string[]':
      case 'number[]':
      case 'boolean[]':
        return [];
      case 'object':
        return {};
      default:
        return '';
    }
  }

  try {
    switch (type) {
      case 'string': {
        // Strings must be wrapped in quotes
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          // Remove quotes and unescape
          return JSON.parse(trimmed);
        }
        // If not quoted, treat as plain string (backward compatibility)
        return trimmed;
      }

      case 'number': {
        const parsed = Number(trimmed);
        if (isNaN(parsed)) {
          throw new Error('Invalid number');
        }
        return parsed;
      }

      case 'boolean': {
        const lower = trimmed.toLowerCase();
        if (lower === 'true') {
          return true;
        }
        if (lower === 'false') {
          return false;
        }
        // Explicitly reject 0/1 as per requirements
        throw new Error('Boolean must be true or false (not 0/1)');
      }

      case 'string[]': {
        // Parse comma-separated string values
        // Each value should be quoted: "item1", "item2"
        const items: string[] = [];
        let current = '';
        let inQuotes = false;
        let escapeNext = false;

        for (let i = 0; i < trimmed.length; i++) {
          const char = trimmed[i];

          if (escapeNext) {
            current += char;
            escapeNext = false;
            continue;
          }

          if (char === '\\') {
            escapeNext = true;
            current += char;
            continue;
          }

          if (char === '"') {
            inQuotes = !inQuotes;
            current += char;
            continue;
          }

          if (char === ',' && !inQuotes) {
            const item = current.trim();
            if (item) {
              // Try to parse as JSON string (handles quotes)
              try {
                items.push(JSON.parse(item));
              } catch {
                // If parsing fails, remove quotes if present and use as-is
                items.push(item.replace(/^"|"$/g, ''));
              }
            }
            current = '';
            continue;
          }

          current += char;
        }

        // Add the last item
        const lastItem = current.trim();
        if (lastItem) {
          try {
            items.push(JSON.parse(lastItem));
          } catch {
            items.push(lastItem.replace(/^"|"$/g, ''));
          }
        }

        return items;
      }

      case 'number[]': {
        // Parse comma-separated numbers
        const items = trimmed
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item !== '')
          .map((item) => {
            const num = Number(item);
            if (isNaN(num)) {
              throw new Error(`Invalid number: ${item}`);
            }
            return num;
          });
        return items;
      }

      case 'boolean[]': {
        // Parse comma-separated booleans
        const items = trimmed
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item !== '')
          .map((item) => {
            const lower = item.toLowerCase();
            if (lower === 'true') {
              return true;
            }
            if (lower === 'false') {
              return false;
            }
            throw new Error(`Invalid boolean: ${item} (must be true or false)`);
          });
        return items;
      }

      case 'object': {
        // Parse as JSON
        return JSON.parse(trimmed);
      }

      default:
        return trimmed;
    }
  } catch (error) {
    // On parsing error, fallback to string for backward compatibility
    console.warn(`Failed to parse ${type} value "${input}":`, error);
    return trimmed;
  }
}

