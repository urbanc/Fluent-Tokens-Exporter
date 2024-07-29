import { emit, on, showUI } from '@create-figma-plugin/utilities'
import {
  ResizeWindowHandler,
  GetVariablesHandler,
  ProcessVariablesHandler,
  CopyToClipboard,
  ExportFormat,
  ValueFormat,
  VariableCollection,
  Mode,
  Variable,
} from './types'
import { processTokens } from './mainUtils/processTokens'

export default async function () {
  await initializePlugin()
}

async function initializePlugin() {
  setupEventListeners()
  await showPluginUI()
  await sendVariablesToUI()
}

function setupEventListeners() {
  on<ResizeWindowHandler>('RESIZE_WINDOW', handleWindowResize)
  on<ProcessVariablesHandler>('PROCESS_VARIABLES', ProcessVariables)
}

async function showPluginUI() {
  showUI({ height: 330, width: 240 })
}

// Step 1) get local Figma Collections of Variables
async function sendVariablesToUI() {
  const localVariableCollections = await fetchRemappedVariableCollections()
  emit<GetVariablesHandler>('GET_VARIABLES', localVariableCollections)
}

function handleWindowResize(windowSize: { width: number; height: number }) {
  figma.ui.resize(windowSize.width, windowSize.height)
}

// Variable Processing
async function fetchRemappedVariableCollections(): Promise<VariableCollection[]> {
  try {
    const localVariableCollections = await figma.variables.getLocalVariableCollectionsAsync()
    return localVariableCollections.map(remapVariableCollection)
  } catch (error) {
    console.error('Failed to fetch variable collections:', error)
    return []
  }
}

function remapVariableCollection(collection: VariableCollection): VariableCollection {
  return {
    name: collection.name,
    id: collection.id,
    defaultModeId: collection.defaultModeId,
    modes: collection.modes,
    variableIds: collection.variableIds,
  }
}

// Step 4) Process the selected Figma Collection Variables into Design Tokens depending on the selected ExportFormat & ValueFormat
async function ProcessVariables(
  collection: VariableCollection | undefined,
  mode: Mode | undefined,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat
) {
  if (!collection || !mode) {
    figma.notify('Please select a collection and mode to export.')
    return
  }

  const variableCollection = await figma.variables.getVariableCollectionByIdAsync(collection.id)
  if (!variableCollection) {
    figma.notify('Failed to fetch variable collection.')
    return
  }

  const exportedTokens = await exportVariables(variableCollection, mode, exportFormat, valueFormat)
  
  figma.notify(`Copied ${Object.keys(exportedTokens).length} tokens to clipboard.`)
  
  const formattedTokens = formatExportedTokens(exportedTokens, exportFormat);
  emit<CopyToClipboard>('COPY_TO_CLIPBOARD', formattedTokens)
}

async function exportVariables(
  variableCollection: VariableCollection,
  mode: Mode,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat
): Promise<Record<string, any>> {
  const tokensToExport = await fetchTokensToExport(variableCollection)
  const validTokens = tokensToExport.filter((token): token is Variable => token !== null)
  
  return processTokens(validTokens, variableCollection, mode, exportFormat, valueFormat)
}

async function fetchTokensToExport(variableCollection: VariableCollection): Promise<(Variable | null)[]> {
  try {
    return await Promise.all(
      variableCollection.variableIds.map(variableId => 
        figma.variables.getVariableByIdAsync(variableId)
      )
    )
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return []
  }
}

function formatExportedTokens(exportedTokens: Record<string, any>, exportFormat: ExportFormat): string {
  if (exportFormat === 'dotNotation') {
    return JSON.stringify(convertToNestedObject(exportedTokens), null, 2);
  }
  return JSON.stringify(exportedTokens, null, 2);
}

function convertToNestedObject(flatObject: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(flatObject)) {
    setNestedProperty(result, key.split('.'), value);
  }

  return result;
}

function setNestedProperty(obj: Record<string, any>, path: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < path.length; i++) {

    // Hack to fix bug: for extra `\"` in dotNotation/JSON output (Ex. `"\"page": {`)
    const key = path[i].replace(/^"/, '').replace(/"$/, ''); // Remove starting and ending quotes
    if (i === path.length - 1) {
      current[key] = value;
    } else {
      if (typeof current[key] === 'string') {
        // If we encounter a string value in the middle of the path,
        // convert it to an object with a special key for the original value
        current[key] = { '_value': current[key] };
      } else if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
  }
}