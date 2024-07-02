import { emit, on, showUI } from '@create-figma-plugin/utilities'
import { formatHex8 } from 'culori'
import { convertToCSSVariableName, convertToDotNotation, convertToCamelCase, convertToNestedJSON } from './utils'
import { ResizeWindowHandler, GetVariablesHandler, CopyVariablesHandler, CopyToClipboard } from './types'

export default async function () {
  on<ResizeWindowHandler>(
    'RESIZE_WINDOW',
    function (windowSize: { width: number; height: number }) {
      const { width, height } = windowSize
      figma.ui.resize(width, height)
    }
  )

  showUI({
    height: 330,
    width: 240
  })

  async function fetchRemappedVariableCollections() {
    try {
      let localVariableCollections = await figma.variables.getLocalVariableCollectionsAsync();

      let remappedLocalVariableCollections = localVariableCollections.map((lvc) => {
        return {
          ...lvc,
          name: lvc.name,
          id: lvc.id,
          defaultModeId: lvc.defaultModeId,
          modes: lvc.modes,
          variableIds: lvc.variableIds
        };
      });
  
      return remappedLocalVariableCollections;
    } catch (error) {
      console.error('Failed to fetch variable collections:', error);
      return [];
    }
  }
  
  // Get all local variable collections in the current file
  let localVariableCollections = await fetchRemappedVariableCollections();
  emit<GetVariablesHandler>("GET_VARIABLES", localVariableCollections);

  let exportedTokens: any = {}
  let notExportedTokens: string[] = [];


  // create a counter to keep track of the number of tokens that have been processed
  let tokenCounter = 0;

  function exportToken(tokenType: string, tokenValue: any, variableCollection: VariableCollection, token: Variable, exportFormat: string, valueFormat: string): void {
    tokenCounter++;

    let result;
    try {
      switch (tokenType) {
        case "COLOR":
          try {
            if (!(tokenValue.toString().includes("/"))) {
              let tokenColorObj = { ...Object(tokenValue), mode: "rgb" };
              tokenColorObj.alpha = Object(tokenValue).a;
              delete tokenColorObj.a;
              result = formatHex8(tokenColorObj) || '';
            } else if (valueFormat === "Alias name" && tokenValue.toString().includes("/")) {
              switch (exportFormat) {
                case "w3c":
                  result = convertToCSSVariableName(tokenValue);
                  break;
                case "dotNotation":
                  result = convertToDotNotation(tokenValue);
                  break;
                case "camelCase":
                  result = convertToCamelCase(tokenValue);
                  break;
                case "cssVar":
                default:
                  result = "var(" + convertToCSSVariableName(tokenValue) + ")";
              }
            }

            // console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
          } catch (error) {

            console.warn(`Error adding COLOR token to exportedTokens: ${token.name}. Error: ${error}`);
          }
          break;

        case "BOOLEAN":
          // console.warn("tokenType: ", tokenType, "tokenValue: ", tokenValue);
          try {
            if (!(tokenValue.toString().includes("/"))) {
              // console.log("does not include /");
              const visibility = ["visible", "visibility", "show"];
              const textDecoration = ["underline", "text-decoration"];

              if (visibility.some(visibility => token.name.toLowerCase().includes(visibility))) {
                result = tokenValue ? "visible" : "hidden";
                //console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
              } else if (textDecoration.some(textDecoration => token.name.toLowerCase().includes(textDecoration))) {
                if (token.name.toLowerCase().includes("solid")) {
                  result = "solid";
                  //console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
                } else if (token.name.toLowerCase().includes("dashed")) {
                  result = "dashed";
                  //console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
                }
              } else {
                result = tokenValue;
                //console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
              }
            } else if (valueFormat === "Alias name" && tokenValue.toString().includes("/")) {
              switch (exportFormat) {
                case "w3c":
                  result = convertToCSSVariableName(tokenValue);
                  break;
                case "dotNotation":
                  result = convertToDotNotation(tokenValue);
                  break;
                case "camelCase":
                  result = convertToCamelCase(tokenValue);
                  break;
                case "cssVar":
                default:
                  result = "var(" + convertToCSSVariableName(tokenValue) + ")";
              }
            }
          } catch (error) {
            console.warn(`Error adding BOOLEAN token to exportedTokens: ${token.name}. Error: ${error}`);
          }
          break;

        case "FLOAT":
          // If the number is 0, leave as zero. Otherwise, if it is greater than 0, convert it to a string and append "px" as the suffix to the string.
          try {
            if (!(tokenValue.toString().includes("/"))) {
              // console.log("does not include /");
              result = tokenValue === 0 ? '0' : tokenValue > 0 ? tokenValue + "px" : tokenValue;
              // console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
            } else if (valueFormat === "Alias name" && tokenValue.toString().includes("/")) {
              switch (exportFormat) {
                case "w3c":
                  result = convertToCSSVariableName(tokenValue);
                  break;
                case "dotNotation":
                  result = convertToDotNotation(tokenValue);
                  break;
                case "camelCase":
                  result = convertToCamelCase(tokenValue);
                  break;
                case "cssVar":
                default:
                  let subResult = convertToCSSVariableName(tokenValue);
                  result = "var(" + subResult + ")";
                // console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
              }
            }
          } catch (error) {
            console.warn(`Error adding FLOAT token to exportedTokens: ${token.name}. Error: ${error}`);
          }
          break;

        case "STRING":
        default:
          try {
            if (!(tokenValue.toString().includes("/"))) {
              // console.log("does not include /");
              result = tokenValue;
              // console.log("tokenType: ", tokenType, "tokenValue: ", tokenValue, "result: ", result);
            } else if (valueFormat === "Alias name" && tokenValue.toString().includes("/")) {
              switch (exportFormat) {
                case "w3c":
                  result = convertToCSSVariableName(tokenValue);
                  break;
                case "dotNotation":
                  result = convertToDotNotation(tokenValue);
                  break;
                case "camelCase":
                  result = convertToCamelCase(tokenValue);
                  break;
                case "cssVar":
                default:
                  result = "var(" + convertToCSSVariableName(tokenValue) + ")";
              }
            }
          } catch (error) {
            console.warn(`Error adding STRING token to exportedTokens: ${token.name}. Error: ${error}`);
          }
          break;
      }
    } catch (error) {
      console.warn(`Error processing token: ${token.name}. Error: ${error}`);
    }

    try {
      switch (exportFormat) {
        case "w3c":
          exportedTokens = { ...exportedTokens, ...convertToNestedJSON(token.name, result) };
          break;
        case "dotNotation":
          exportedTokens[convertToDotNotation(token.name)] = result;
          break;
        case "camelCase":
          exportedTokens[convertToCamelCase(token.name)] = result;
          break;
        case "cssVar":
        default:
          exportedTokens[convertToCSSVariableName(token.name)] = result;
      }

    } catch (error) {

      console.warn(`Error adding token to exportedTokens: ${token.name}. Error: ${error}`);

    }
  }


  async function getTokenValueByIdAsync(theVarID: string, getRawValue: boolean = true) {
    if (typeof theVarID === "object" && !Array.isArray(theVarID)) {
      theVarID = (theVarID as { id: string }).id;
    }
    const theVar = await figma.variables.getVariableByIdAsync(theVarID);
    const theCollectionID = theVar?.variableCollectionId;
    const theCollection = theCollectionID ? await figma.variables.getVariableCollectionByIdAsync(theCollectionID) : null;
    const theModeID = theCollection ? theCollection.defaultModeId : null;
    const theVarValue = theVar && theModeID ? theVar.valuesByMode[theModeID] : theVarID;
    if (getRawValue && theVarValue && (theVarValue as VariableAlias).type === "VARIABLE_ALIAS") {
      return getTokenValueByIdAsync((theVarValue as VariableAlias).id);
    }
    return theVarValue;
  }




  // TODO: delete this by keeping the object as a JSON.
  function convertToNestedObject(input: string): any {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    const lines = input.split('\n');
    let result = {};

    for (let line of lines) {
      let [path, value] = line.split(':');

      if (!path || typeof value !== 'string') {
        continue; // skip this iteration if path is undefined or value is not a string
      }

      value = value.trim().replace(/'/g, "").replace(/;$/, ""); // remove single quotes and trailing semicolon from the value

      const parts = path.split('.');
      let currentLevel: { [key: string]: any } = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();

        if (typeof currentLevel !== 'object') {
          throw new Error('Expected currentLevel to be an object');
        }

        if (i === parts.length - 1) {
          currentLevel[part] = value;
        } else {
          if (currentLevel[part] && typeof currentLevel[part] !== 'object') {
            currentLevel[part] = {}; // overwrite the string value with an object
          }

          if (!currentLevel[part]) {
            currentLevel[part] = {};
          }
          currentLevel = currentLevel[part];
        }
      }
    }

    return JSON.stringify(result, null, 2);
  }

  on<CopyVariablesHandler>(
    'COPY_VARIABLES',
    copyVariables
  )
  
  async function copyVariables(collection: any, mode: any, exportFormat: string, valueFormat: string) {
    exportedTokens = {}
    let tokensToExport;
    if (!!collection && !!mode) {
      const variableCollection = await figma.variables.getVariableCollectionByIdAsync(collection.id);
      if (variableCollection) {
        tokensToExport = await fetchTokensToExport(variableCollection);
        await processTokens(tokensToExport, variableCollection, mode, exportFormat, valueFormat);
        if (notExportedTokens.length > 0) {
          console.warn(`Tokens not exported:\n\n${notExportedTokens.join(`\n\n`)}`);
        }
        if (Object.keys(exportedTokens).length < tokensToExport.length) {
          console.error(`${tokensToExport.length - Object.keys(exportedTokens).length} tokens failed to export.`)
        }
        figma.notify(`Copied ${Object.keys(exportedTokens).length} of ${tokensToExport.length} tokens to clipboard.`)
      }
    } else {
      figma.notify("Please select a collection and mode to export.");
    }

    let formattedExportedTokens = JSON.stringify(exportedTokens);
    formattedExportedTokens = formattedExportedTokens.replace(/\"([^(\")"]+)\":/g, "$1: ").replace(/\"([^(\")"]+)\"/g, "'$1'").replace(/,/g, ";\n ").replace(/{/g, "{\n ").replace(/}/g, ";\n}");

    // TODO: delete this by keeping the object as a JSON.
    if (exportFormat === "dotNotation") {
      formattedExportedTokens = convertToNestedObject(formattedExportedTokens);
    }
    emit<CopyToClipboard>('COPY_TO_CLIPBOARD', formattedExportedTokens)
  }
  
  async function processTokens(tokensToExport: any, variableCollection: any, mode: any, exportFormat: any, valueFormat: any) {
    const promises = tokensToExport.map((token: any) => {
      return token ? getTokenValue(token, variableCollection, mode.modeId, exportFormat, valueFormat)
        .catch(error => console.warn(`Error processing token: ${token?.name}. Error: ${error}`))
        : Promise.resolve(); // If token is undefined, resolve immediately
    });
  
    await Promise.all(promises);
  }

  async function getTokenValue(token: Variable, variableCollection: VariableCollection, modeId: string, exportFormat: string, valueFormat: string): Promise<void> {

    try {
      const collectionId = variableCollection.id;
      const tokenType = token.resolvedType;
      const tokenValue = token.valuesByMode[modeId];
      if (tokenValue && (tokenValue as VariableAlias).type === "VARIABLE_ALIAS") {
        // @ts-ignore
        let variable: Variable | null = null;
        try {
          if ((tokenValue as VariableAlias).type === "VARIABLE_ALIAS") { // Check if tokenValue is of type VariableAlias
            const tokenId = (tokenValue as VariableAlias).id;
            
            variable = await figma.variables.getVariableByIdAsync(tokenId); // Access id property
          }
        } catch (error) {
          console.error('An error occurred:', error);
        }
        if (variable) {
          const variableCollectionOfToken = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
          if (variableCollectionOfToken && variableCollectionOfToken.id !== collectionId) {
            const defaultModeIdOfVariableCollectionOfToken = variableCollectionOfToken.defaultModeId;
            const variableValue = variable.valuesByMode[defaultModeIdOfVariableCollectionOfToken]
            if (variableValue && (variableValue as VariableAlias).type === "VARIABLE_ALIAS") {
              let result: any;
              if (valueFormat === "Raw value") {
                result = await (getTokenValueByIdAsync(variable.id));
              } else if (valueFormat === "Alias name") {
                result = variable.name;
              }

              if (result !== undefined) { // Fix: Check if result is not undefined
                exportToken(tokenType, result, variableCollection, token, exportFormat, valueFormat);
              } else {
                notExportedTokens.push(token.name);
              }
            } else {
              // console.warn("tokenType, variableValue, variableCollection, token, exportFormat, valueFormat", tokenType, variableValue, variableCollection, token, exportFormat, valueFormat);
              exportToken(tokenType, variableValue, variableCollection, token, exportFormat, valueFormat);
            }
          }
        }
      } else {
        exportToken(tokenType, tokenValue, variableCollection, token, exportFormat, valueFormat);
      }


    } catch (error) {
      console.warn(`Error processing token: ${error}`);
    }
  }

  async function fetchTokensToExport(variableCollection: any) {
    try {
      const tokensToExport = await Promise.all(
        variableCollection.variableIds.map((variableId: any) =>
          figma.variables.getVariableByIdAsync(variableId)
        )
      );
  
      return tokensToExport; // This array will contain the resolved values or undefined if not found
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return []; // Return an empty array or handle as appropriate
    }
  }

}



