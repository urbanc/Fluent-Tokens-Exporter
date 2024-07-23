import { formatHex8 } from 'culori'
import {
  convertToCSSVariableName,
  convertToDotNotation,
  convertToCamelCase,
  convertToNestedJSON,
} from './processExportFormat'
import {
  ExportFormat,
  ValueFormat,
  VariableAlias,
  Mode,
  Variable,
  VariableCollection,
  VariableResolvedDataType,
} from '../types'

export async function processTokens(
  tokensToExport: Variable[],
  variableCollection: VariableCollection,
  mode: Mode,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat,
  exportedTokens: Record<string, any>,
  notExportedTokens: string[]
): Promise<void> {
  const promises = tokensToExport
    .filter((token): token is Variable => token !== null)
    .map((token) =>
      processToken(
        token,
        variableCollection,
        mode.modeId,
        exportFormat,
        valueFormat,
        exportedTokens,
        notExportedTokens
      )
    )
  await Promise.all(promises)
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
    const tokenType = token.resolvedType
    const tokenValue = token.valuesByMode[modeId]

    if (tokenValue && (tokenValue as VariableAlias).type === 'VARIABLE_ALIAS') {
      await handleAliasToken(
        token,
        tokenValue as VariableAlias,
        variableCollection,
        exportFormat,
        valueFormat,
        exportedTokens,
        notExportedTokens
      )
    } else {
      exportToken(
        tokenType,
        tokenValue,
        token,
        exportFormat,
        valueFormat,
        exportedTokens
      )
    }
  } catch (error) {
    console.warn(`Error processing token ${token.name}:`, error)
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
  const variable = await figma.variables.getVariableByIdAsync(tokenValue.id)
  if (variable) {
    const variableCollectionOfToken =
      await figma.variables.getVariableCollectionByIdAsync(
        variable.variableCollectionId
      )
    if (
      variableCollectionOfToken &&
      variableCollectionOfToken.id !== variableCollection.id
    ) {
      const result =
        valueFormat === 'Raw value'
          ? await getTokenValueByIdAsync(variable.id)
          : variable.name
      if (result !== undefined) {
        exportToken(
          token.resolvedType,
          result,
          token,
          exportFormat,
          valueFormat,
          exportedTokens
        )
      } else {
        notExportedTokens.push(token.name)
      }
    } else {
      exportToken(
        token.resolvedType,
        tokenValue,
        token,
        exportFormat,
        valueFormat,
        exportedTokens
      )
    }
  }
}

function exportToken(
  tokenType: VariableResolvedDataType,
  tokenValue: any,
  token: Variable,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat,
  exportedTokens: Record<string, any>
): void {
  const result = processTokenValue(
    tokenType,
    tokenValue,
    token,
    valueFormat,
    exportFormat
  )
  if (result !== undefined) {
    addToExportedTokens(token.name, result, exportFormat, exportedTokens)
  }
}

function processTokenValue(
  tokenType: VariableResolvedDataType,
  tokenValue: any,
  token: Variable,
  valueFormat: ValueFormat,
  exportFormat: ExportFormat
): string | undefined {
  if (
    typeof tokenValue === 'string' &&
    tokenValue.includes('/') &&
    valueFormat === 'Alias name'
  ) {
    return processAliasName(tokenValue, exportFormat)
  }

  switch (tokenType) {
    case 'COLOR':
      return processColorToken(tokenValue)
    case 'BOOLEAN':
      return processBooleanToken(tokenValue, token.name)
    case 'FLOAT':
      return processFloatToken(tokenValue)
    case 'STRING':
    default:
      return String(tokenValue)
  }
}

function processAliasName(
  tokenValue: string,
  exportFormat: ExportFormat
): string {
  switch (exportFormat) {
    case 'w3c':
      return convertToCSSVariableName(tokenValue)
    case 'dotNotation':
      return convertToDotNotation(tokenValue)
    case 'camelCase':
      return convertToCamelCase(tokenValue)
    case 'cssVar':
    default:
      return `var(${convertToCSSVariableName(tokenValue)})`
  }
}

function processColorToken(tokenValue: any): string | undefined {
  if (typeof tokenValue === 'object' && !tokenValue.toString().includes('/')) {
    const tokenColorObj = { ...tokenValue, mode: 'rgb', alpha: tokenValue.a }
    delete tokenColorObj.a
    return formatHex8(tokenColorObj) || undefined
  }
  return String(tokenValue)
}

function processBooleanToken(tokenValue: boolean, tokenName: string): string {
  const visibility = ['visible', 'visibility', 'show']
  const textDecoration = ['underline', 'text-decoration']

  if (visibility.some((v) => tokenName.toLowerCase().includes(v))) {
    return tokenValue ? 'visible' : 'hidden'
  } else if (
    textDecoration.some((td) => tokenName.toLowerCase().includes(td))
  ) {
    if (tokenName.toLowerCase().includes('solid')) {
      return 'solid'
    } else if (tokenName.toLowerCase().includes('dashed')) {
      return 'dashed'
    }
  }
  return String(tokenValue)
}

function processFloatToken(tokenValue: number): string {
  return tokenValue === 0
    ? '0'
    : tokenValue > 0
      ? `${tokenValue}px`
      : String(tokenValue)
}

function addToExportedTokens(
  tokenName: string,
  tokenValue: any,
  exportFormat: ExportFormat,
  exportedTokens: Record<string, any>
): void {
  let processedValue = tokenValue

  if (typeof processedValue === 'string' && processedValue.startsWith('var(')) {
    processedValue = processedValue.replace(/^"|"$/g, '')
  }

  switch (exportFormat) {
    case 'w3c':
      Object.assign(
        exportedTokens,
        convertToNestedJSON(tokenName, processedValue)
      )
      break
    case 'dotNotation':
      exportedTokens[convertToDotNotation(tokenName)] = processedValue
      break
    case 'camelCase':
      exportedTokens[convertToCamelCase(tokenName)] = processedValue
      break
    case 'cssVar':
    default:
      exportedTokens[convertToCSSVariableName(tokenName)] = processedValue
  }
}

async function getTokenValueByIdAsync(
  theVarID: string,
  getRawValue: boolean = true
): Promise<any> {
  const varId =
    typeof theVarID === 'object' && !Array.isArray(theVarID)
      ? (theVarID as { id: string }).id
      : theVarID
  const theVar = await figma.variables.getVariableByIdAsync(varId)
  const theCollectionID = theVar?.variableCollectionId
  const theCollection = theCollectionID
    ? await figma.variables.getVariableCollectionByIdAsync(theCollectionID)
    : null
  const theModeID = theCollection ? theCollection.defaultModeId : null
  const theVarValue =
    theVar && theModeID ? theVar.valuesByMode[theModeID] : varId

  if (
    getRawValue &&
    theVarValue &&
    (theVarValue as VariableAlias).type === 'VARIABLE_ALIAS'
  ) {
    return getTokenValueByIdAsync((theVarValue as VariableAlias).id)
  }
  return theVarValue
}
