import { TokenValue } from '../types';

/**
 * Converts a token name to dot notation format.
 * @param input The token name to convert.
 * @returns The token name in dot notation format.
 */
export function convertToDotNotation(input: string): string {
  return preprocessInput(input)
    .map(part => toCamelCase(splitByNonAlphanumeric(part)))
    .join('.')
    .replace(/\.$/, '');
}

/**
 * Converts a token name and value to a nested JSON object.
 * @param input The token name to convert.
 * @param value The token value.
 * @returns A nested JSON object representing the token.
 */
export function convertToNestedJSON(input: string, value: TokenValue): Record<string, any> {
  const parts = preprocessInput(input);
  return parts.reduceRight(
    (acc, part, index) => 
      index === parts.length - 1 ? { [part]: { $value: value } } : { [part]: acc },
    {} as Record<string, any>
  );
}

/**
 * Converts a token name to camelCase format.
 * @param input The token name to convert.
 * @returns The token name in camelCase format.
 */
export function convertToCamelCase(input: string): string {
  // Split the input string by dots to handle nested structures
  const segments = input.split('.');
  
  // Convert each segment to camelCase and join them back with dots
  return segments.map(segment => {
    // Split the segment by non-alphanumeric characters
    const words = segment.split(/[^a-zA-Z0-9]+/);
    
    // Apply camelCase to each word in the segment
    return words
      .filter(word => word.length > 0)
      .map((word, index) => 
        index === 0 ? word.toLowerCase() : capitalize(word)
      )
      .join('');
  }).join('.');
}

/**
 * Converts a token name to CSS variable name format.
 * @param input The token name to convert.
 * @returns The token name as a CSS variable name.
 */
export function convertToCSSVariableName(input: string): string {
  return '--' + preprocessInput(input)
    .map(part => toCamelCase(splitByNonAlphanumeric(part)))
    .join('-')
    .replace(/-+$/, '');
}

// Helper functions

function preprocessInput(input: string): string[] {
  return splitBySlash(removeDoubleSlashes(removeParentheses(input)));
}

function removeParentheses(input: string): string {
  return input.replace(/\(.*?\)/g, '');
}

function removeDoubleSlashes(input: string): string {
  return input.replace(/\/\//g, '/');
}

function splitBySlash(input: string): string[] {
  return input.split('/');
}

function splitByNonAlphanumeric(input: string): string[] {
  return input.split(/[^a-zA-Z0-9-]/);
}

function toCamelCase(words: string[]): string {
  return words.map((word, index) => 
    index === 0 ? word.toLowerCase() : capitalize(word)
  ).join('');
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
