import { formatHex8 } from 'culori';
import {
  convertToCSSVariableName,
  convertToDotNotation,
  convertToCamelCase,
  convertToNestedJSON,
} from './processExportFormat';
import {
  ExportFormat,
  ValueFormat,
  VariableAlias,
  Mode,
  Variable,
  VariableCollection,
  VariableResolvedDataType,
} from '../types';

export async function processTokens(
  tokensToExport: Variable[],
  variableCollection: VariableCollection,
  mode: Mode,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat
): Promise<Record<string, any>> {
  const exportedTokens: Record<string, any> = {};
  const notExportedTokens: string[] = [];

  await Promise.all(
    tokensToExport.map(token =>
      processToken(token, variableCollection, mode.modeId, exportFormat, valueFormat, exportedTokens, notExportedTokens)
    )
  );

  if (notExportedTokens.length > 0) {
    console.warn(`Tokens not exported:\n${notExportedTokens.join('\n')}`);
  }

  return exportedTokens;
}

async function processToken(
  token: Variable,
  variableCollection: VariableCollection,
  modeId: string,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat,
  exportedTokens: Record<string, any>,
  notExportedTokens: string[]
): Promise<void> {
  try {
    const tokenValue = token.valuesByMode[modeId];

    if (isVariableAlias(tokenValue)) {
      await handleAliasToken(token, tokenValue, variableCollection, exportFormat, valueFormat, exportedTokens, notExportedTokens);
    } else {
      const processedValue = processTokenValue(token.resolvedType, tokenValue, token.name, valueFormat, exportFormat);
      if (processedValue !== undefined) {
        addToExportedTokens(token.name, processedValue, exportFormat, exportedTokens);
      }
    }
  } catch (error) {
    console.warn(`Error processing token ${token.name}:`, error);
    notExportedTokens.push(token.name);
  }
}

async function handleAliasToken(
  token: Variable,
  tokenValue: VariableAlias,
  variableCollection: VariableCollection,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat,
  exportedTokens: Record<string, any>,
  notExportedTokens: string[]
): Promise<void> {
  const aliasedVariable = await figma.variables.getVariableByIdAsync(tokenValue.id);
  
  if (!aliasedVariable) {
    notExportedTokens.push(token.name);
    return;
  }

  const aliasedCollection = await figma.variables.getVariableCollectionByIdAsync(aliasedVariable.variableCollectionId);

  if (!aliasedCollection) {
    notExportedTokens.push(token.name);
    return;
  }

  const processedValue = valueFormat === 'Raw value'
    ? await getTokenValueByIdAsync(aliasedVariable.id)
    : aliasedVariable.name;

  if (processedValue !== undefined) {
    const finalValue = processTokenValue(token.resolvedType, processedValue, token.name, valueFormat, exportFormat);
    addToExportedTokens(token.name, finalValue, exportFormat, exportedTokens);
  } else {
    notExportedTokens.push(token.name);
  }
}

function processTokenValue(
  tokenType: VariableResolvedDataType,
  tokenValue: any,
  tokenName: string,
  valueFormat: ValueFormat,
  exportFormat: ExportFormat
): string | undefined {
  if (isAliasName(tokenValue) && valueFormat === 'Alias name') {
    return processAliasName(tokenValue, exportFormat);
  }

  switch (tokenType) {
    case 'COLOR':
      return processColorToken(tokenValue);
    case 'BOOLEAN':
      return processBooleanToken(tokenValue, tokenName);
    case 'FLOAT':
      return processFloatToken(tokenValue);
    case 'STRING':
    default:
      return String(tokenValue);
  }
}

function isAliasName(value: any): value is string {
  return typeof value === 'string' && value.includes('/');
}

function processAliasName(tokenValue: string, exportFormat: ExportFormat): string {
  switch (exportFormat) {
    case 'w3c':
      return convertToCSSVariableName(tokenValue);
    case 'dotNotation':
      return convertToDotNotation(tokenValue);
    case 'camelCase':
      return convertToCamelCase(tokenValue);
    case 'cssVar':
    default:
      return `var(${convertToCSSVariableName(tokenValue)})`;
  }
}

function processColorToken(tokenValue: any): string | undefined {
  if (isColorObject(tokenValue)) {
    const { r, g, b, a } = tokenValue;
    return formatHex8({ mode: 'rgb', r, g, b, alpha: a });
  }
  return String(tokenValue);
}

function isColorObject(value: any): value is { r: number; g: number; b: number; a: number } {
  return typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value && 'a' in value;
}

function processBooleanToken(tokenValue: boolean, tokenName: string): string {
  if (isVisibilityToken(tokenName)) {
    return tokenValue ? 'visible' : 'hidden';
  }
  if (isTextDecorationToken(tokenName)) {
    return getTextDecorationValue(tokenName);
  }
  return String(tokenValue);
}

function isVisibilityToken(tokenName: string): boolean {
  const visibilityKeywords = ['visible', 'visibility', 'show'];
  return visibilityKeywords.some(keyword => tokenName.toLowerCase().includes(keyword));
}

function isTextDecorationToken(tokenName: string): boolean {
  const textDecorationKeywords = ['underline', 'text-decoration'];
  return textDecorationKeywords.some(keyword => tokenName.toLowerCase().includes(keyword));
}

function getTextDecorationValue(tokenName: string): string {
  if (tokenName.toLowerCase().includes('solid')) return 'solid';
  if (tokenName.toLowerCase().includes('dashed')) return 'dashed';
  return 'underline';
}

function processFloatToken(tokenValue: number): string {
  if (tokenValue === 0) return '0';
  return tokenValue > 0 ? `${tokenValue}px` : String(tokenValue);
}

function addToExportedTokens(
  tokenName: string,
  tokenValue: any,
  exportFormat: ExportFormat,
  exportedTokens: Record<string, any>
): void {
  const processedValue = cleanProcessedValue(tokenValue);

  switch (exportFormat) {
    case 'w3c':
      Object.assign(exportedTokens, convertToNestedJSON(tokenName, processedValue));
      break;
    case 'dotNotation':
      exportedTokens[convertToDotNotation(tokenName)] = processedValue;
      break;
    case 'camelCase':
      exportedTokens[convertToCamelCase(tokenName)] = processedValue;
      break;
    case 'cssVar':
    default:
      exportedTokens[convertToCSSVariableName(tokenName)] = processedValue;
  }
}

function cleanProcessedValue(value: string): string {
  return value.startsWith('var(') ? value.replace(/^"|"$/g, '') : value;
}

function isVariableAlias(value: any): value is VariableAlias {
  return typeof value === 'object' && value.type === 'VARIABLE_ALIAS';
}

async function getTokenValueByIdAsync(varId: string): Promise<any> {
  const variable = await figma.variables.getVariableByIdAsync(varId);
  if (!variable) return undefined;

  const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
  if (!collection) return undefined;

  const value = variable.valuesByMode[collection.defaultModeId];

  if (isVariableAlias(value)) {
    return getTokenValueByIdAsync(value.id);
  }

  return value;
}