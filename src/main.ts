import { emit, on, showUI } from '@create-figma-plugin/utilities'
import { formatCSS } from './mainUtils/processExportFormat'
import {
  ResizeWindowHandler,
  GetVariablesHandler,
  CopyVariablesHandler,
  CopyToClipboard,
  ExportFormat,
  ValueFormat,
  VariableCollection,
  Mode,
  Variable,
} from './types'
import { processTokens } from './mainUtils/processTokens'

export default async function () {
  setupEventListeners()
  showUI({ height: 330, width: 240 })
  const localVariableCollections = await fetchRemappedVariableCollections()
  emit<GetVariablesHandler>('GET_VARIABLES', localVariableCollections)
}

function setupEventListeners() {
  on<ResizeWindowHandler>('RESIZE_WINDOW', handleWindowResize)
  on<CopyVariablesHandler>('COPY_VARIABLES', copyVariables)
}

function handleWindowResize(windowSize: { width: number; height: number }) {
  figma.ui.resize(windowSize.width, windowSize.height)
}

async function fetchRemappedVariableCollections() {
  try {
    const localVariableCollections =
      await figma.variables.getLocalVariableCollectionsAsync()
    return localVariableCollections.map(remapVariableCollection)
  } catch (error) {
    console.error('Failed to fetch variable collections:', error)
    return []
  }
}

function remapVariableCollection(lvc: VariableCollection) {
  return {
    ...lvc,
    name: lvc.name,
    id: lvc.id,
    defaultModeId: lvc.defaultModeId,
    modes: lvc.modes,
    variableIds: lvc.variableIds,
  }
}

async function copyVariables(
  collection: VariableCollection | undefined,
  mode: Mode | undefined,
  exportFormat: ExportFormat,
  valueFormat: ValueFormat
) {
  const exportedTokens: Record<string, any> = {}
  const notExportedTokens: string[] = []

  if (collection && mode) {
    const variableCollection =
      await figma.variables.getVariableCollectionByIdAsync(collection.id)
    if (variableCollection) {
      const tokensToExport = await fetchTokensToExport(variableCollection)
      const validTokens = tokensToExport.filter(
        (token): token is Variable => token !== null
      )
      await processTokens(
        validTokens,
        variableCollection,
        mode,
        exportFormat,
        valueFormat,
        exportedTokens,
        notExportedTokens
      )
      handleExportResults(validTokens, exportedTokens, notExportedTokens)
    }
  } else {
    figma.notify('Please select a collection and mode to export.')
  }

  const formattedExportedTokens = formatExportedTokens(
    exportedTokens,
    exportFormat
  )
  emit<CopyToClipboard>('COPY_TO_CLIPBOARD', formattedExportedTokens)
}

async function fetchTokensToExport(
  variableCollection: VariableCollection
): Promise<(Variable | null)[]> {
  try {
    return await Promise.all(
      variableCollection.variableIds.map((variableId) =>
        figma.variables.getVariableByIdAsync(variableId)
      )
    )
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return []
  }
}

function handleExportResults(
  tokensToExport: Variable[],
  exportedTokens: Record<string, any>,
  notExportedTokens: string[]
) {
  if (notExportedTokens.length > 0) {
    console.warn(`Tokens not exported:\n\n${notExportedTokens.join(`\n\n`)}`)
  }
  if (Object.keys(exportedTokens).length < tokensToExport.length) {
    console.error(
      `${tokensToExport.length - Object.keys(exportedTokens).length} tokens failed to export.`
    )
  }
  figma.notify(
    `Copied ${Object.keys(exportedTokens).length} of ${tokensToExport.length} tokens to clipboard.`
  )
}

function formatExportedTokens(
  exportedTokens: Record<string, any>,
  exportFormat: ExportFormat
): string {
  let formattedTokens = JSON.stringify(exportedTokens)
  formattedTokens = formatCSS(formattedTokens)
  return exportFormat === 'dotNotation'
    ? convertToNestedObject(formattedTokens)
    : formattedTokens
}

function convertToNestedObject(input: string): string {
  const lines = input.split('\n')
  const result: Record<string, any> = {}

  for (const line of lines) {
    const [path, value] = line.split(':')
    if (path && typeof value === 'string') {
      const cleanValue = value.trim().replace(/'/g, '').replace(/;$/, '')
      const parts = path.split('.')
      let currentLevel: Record<string, any> = result

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim()
        if (i === parts.length - 1) {
          currentLevel[part] = cleanValue
        } else {
          if (typeof currentLevel[part] !== 'object') {
            currentLevel[part] = {}
          }
          currentLevel = currentLevel[part]
        }
      }
    }
  }

  return JSON.stringify(result, null, 2)
}
