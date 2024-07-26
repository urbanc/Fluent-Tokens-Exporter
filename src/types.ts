import { EventHandler } from '@create-figma-plugin/utilities'

export interface ResizeWindowHandler extends EventHandler {
  name: 'RESIZE_WINDOW'
  handler: (windowSize: { width: number; height: number }) => void
}

export interface GetVariablesHandler extends EventHandler {
  name: 'GET_VARIABLES'
  handler: (localVariableCollections: VariableCollection[]) => void
}

export interface ProcessVariablesHandler extends EventHandler {
  name: 'PROCESS_VARIABLES'
  handler: (
    collection: VariableCollection | undefined,
    mode: Mode | undefined,
    exportFormat: ExportFormat,
    valueFormat: ValueFormat
  ) => void
}

export interface CopyToClipboard extends EventHandler {
  name: 'COPY_TO_CLIPBOARD'
  handler: (clipboardText: string) => void
}

export type ExportFormat = 'cssVar' | 'camelCase' | 'dotNotation' | 'w3c'

export type ValueFormat = 'Raw value' | 'Alias name'

export type TokenValue = string | number | boolean

export interface VariableAlias {
  type: 'VARIABLE_ALIAS'
  id: string
}

export interface Mode {
  modeId: string
  name: string
}

export interface VariableCollection {
  id: string
  name: string
  defaultModeId: string
  modes: Mode[]
  variableIds: string[]
}

// Update this interface to match the actual structure of Figma's Variable type
export interface Variable {
  id: string
  name: string
  resolvedType: VariableResolvedDataType
  valuesByMode: Record<string, any>
  variableCollectionId: string
  // Add any missing properties here
  description?: string
  hiddenFromPublishing?: boolean
  remote?: boolean
  // ... any other properties that Figma's Variable type includes
}

export type VariableResolvedDataType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
