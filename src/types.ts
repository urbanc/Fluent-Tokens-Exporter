import { EventHandler } from '@create-figma-plugin/utilities'

export interface ResizeWindowHandler extends EventHandler {
  name: 'RESIZE_WINDOW'
  handler: (windowSize: { width: number; height: number }) => void
}

export interface GetVariablesHandler extends EventHandler {
  name: 'GET_VARIABLES'
  handler: (localVariableCollections: VariableCollection[]) => void
}

export interface CopyVariablesHandler extends EventHandler {
  name: 'COPY_VARIABLES'
  handler: (collection: any, mode: any, exportFormat: string, valueFormat: string ) => void
}

export interface CopyToClipboard extends EventHandler {
  name: 'COPY_TO_CLIPBOARD'
  handler: (clipboardText: string) => void
}