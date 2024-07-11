import { TokenValue } from "../types";

const removeParentheses = (input: string): string => input.replace(/\(.*?\)/g, '');
const removeDoubleSlashes = (input: string): string => input.replace(/\/\//g, '/');
const splitBySlash = (input: string): string[] => input.split('/');
const splitByNonAlphanumeric = (input: string): string[] => input.split(/[^a-zA-Z0-9-]/);

const toCamelCase = (word: string, index: number): string => 
  index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

const preprocessInput = (input: string): string[] => 
  splitBySlash(removeDoubleSlashes(removeParentheses(input)));

export const convertToDotNotation = (input: string): string => 
  preprocessInput(input)
    .map(part => splitByNonAlphanumeric(part).map(toCamelCase).join(''))
    .join('.')
    .replace(/\.$/, '');

export const convertToNestedJSON = (input: string, value: TokenValue): Record<string, any> => {
  const parts = preprocessInput(input);
  return parts.reduceRight((acc, part, index) => 
    index === parts.length - 1 ? { [part]: { $value: value } } : { [part]: acc }, 
    {} as Record<string, any>
  );
};

export const convertToCamelCase = (input: string): string => 
  splitByNonAlphanumeric(preprocessInput(input).join(''))
    .map(toCamelCase)
    .join('');

export const convertToCSSVariableName = (input: string): string => 
  '--' + preprocessInput(input)
    .map(part => splitByNonAlphanumeric(part).map(toCamelCase).join(''))
    .join('-')
    .replace(/-+$/, '');

export const formatCSS = (json: string): string => 
  json.replace(/\"([^(\")"]+)\":/g, "$1: ")
     .replace(/\"([^(\")"]+)\"/g, "'$1'")
     .replace(/,/g, ";\n  ")
     .replace(/{/g, "{\n  ")
     .replace(/}/g, ";\n}");