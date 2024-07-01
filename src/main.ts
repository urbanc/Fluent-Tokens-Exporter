import { emit, on, showUI } from '@create-figma-plugin/utilities'
import { formatHex8 } from 'culori'
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


  function convertToDotNotation(input: string): string {
    const withoutParentheses = input.replace(/\(.*?\)/g, '');
    const withoutDoubleSlashes = withoutParentheses.replace(/\/\//g, '/');
    const dotNotation = withoutDoubleSlashes.split('/').map(part => {
      return part.split(/[^a-zA-Z0-9-]/).map((word, index) => {
        return index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join('');
    }).join('.');
    // remove any trailing dots
    return dotNotation.replace(/\.$/, '');
  }


  // create a function based on `https://second-editors-draft.tr.designtokens.org/format/` to convert a string to a nested JSON object in the format of the Design Tokens specification. Example: ```  "token name": {"$value": "token value"}```
  function convertToNestedJSON(input: string, value: any): any {
    const withoutParentheses = input.replace(/\(.*?\)/g, '');
    const withoutDoubleSlashes = withoutParentheses.replace(/\/\//g, '/');
    const parts = withoutDoubleSlashes.split('/');

    let nestedObject: { [key: string]: any } = {}; // Add index signature to allow indexing with a string
    let currentLevel = nestedObject;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        currentLevel[part] = { "$value": value };
      } else {
        currentLevel[part] = {};
        currentLevel = currentLevel[part];
      }
    }

    return nestedObject;
  }


  function convertToCamelCase(input: string): string {
    const withoutParentheses = input.replace(/\(.*?\)/g, '');
    const withoutDoubleSlashes = withoutParentheses.replace(/\/\//g, '/');
    let variableName = withoutDoubleSlashes.split(/[^a-zA-Z0-9-]/).map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
    }).join('');

    return variableName;
  }

  function convertToCSSVariableName(input: string): string {
    const withoutParentheses = input.replace(/\(.*?\)/g, '');
    // replace any double slashes with a single slash `/`
    const withoutDoubleSlashes = withoutParentheses.replace(/\/\//g, '/');
    const variableName = "--" + withoutDoubleSlashes.split('/').map(part => {
      return part.split(/[^a-zA-Z0-9-]/).map((word, index) => {
        return index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join('');
    }).join('-');
    // remove any trailing hyphens
    return variableName.replace(/-+$/, '');
  }

  function assignNestedProperty(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;

    while (keys.length > 1) {
      const key = keys.shift() as string;

      if (current[key] === undefined) {
        current[key] = {};
      }

      current = current[key];
    }

    current[keys[0]] = value;
  }


  // create a function that will asynchronously retrieve the name of the token (not the value of the token) by passing a variableId
  async function getTokenNameByIdAsync(variableId: string) {
    // console.log("getTokenNameByIdAsync - variableId: ", variableId);
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    const collectionId = variable?.variableCollectionId;
    const collection = collectionId ? await figma.variables.getVariableCollectionByIdAsync(collectionId) : null;
    // get the name of the variable
    // console.log("getTokenNameByIdAsync - variable?.name : ", variable?.name);
    return variable?.name;
  }



  // create a counter to keep track of the number of tokens that have been processed
  let tokenCounter = 0;

  function exportToken(tokenType: string, tokenValue: any, variableCollection: VariableCollection, token: Variable, exportFormat: string, valueFormat: string): void {
    // console.log(`maint.ts - exportToken - tokenType, tokenValue, variableCollection, token, exportFormat, valueFormat: `, tokenType, tokenValue, variableCollection, token, exportFormat, valueFormat);
    //
    // increment the tokenCounter by 1
    tokenCounter++;
    // console.log(`ET token ${tokenCounter} ...`, tokenType, tokenValue);
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
      // console.log(`maint.ts - adding token: ${token.name}`)
      // exportedTokens[convertToCamelCase(variableCollection.name + "/" + token.name)] = result;
      // exportedTokens[convertToCSSVariableName(variableCollection.name + "/" + token.name)] = result;

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

      // console.log(`${Object.keys(exportedTokens).length} exported tokens`)
    } catch (error) {

      console.warn(`Error adding token to exportedTokens: ${token.name}. Error: ${error}`);

    }
  }


  async function getTokenValueByIdAsync(theVarID: string, getRawValue: boolean = true) {
    // console.log(`getTokenValueByIdAsync(theVarID = ${theVarID}, getRawValue = ${getRawValue}`);
    // console.log("typeof | isArray theVarID: ", typeof theVarID, Array.isArray(theVarID));
    if (typeof theVarID === "object" && !Array.isArray(theVarID)) {
      theVarID = (theVarID as { id: string }).id;
      // console.log("theVarID now: ", theVarID);
    }
    const theVar = await figma.variables.getVariableByIdAsync(theVarID);
    // console.log(`getTokenValueByIdAsync(${theVarID}) - theVar: `, theVar);
    const theCollectionID = theVar?.variableCollectionId;
    const theCollection = theCollectionID ? await figma.variables.getVariableCollectionByIdAsync(theCollectionID) : null;
    const theModeID = theCollection ? theCollection.defaultModeId : null;
    const theVarValue = theVar && theModeID ? theVar.valuesByMode[theModeID] : theVarID;
    // console.log("getTokenValueByIdAsync - theVarValue: ", theVarValue);
    if (getRawValue && theVarValue && (theVarValue as VariableAlias).type === "VARIABLE_ALIAS") {
      // recursively call `getTokenValueByIdAsync` until the value is not a variable alias
      return getTokenValueByIdAsync((theVarValue as VariableAlias).id);
    }
    // console.log("getTokenValueByIdAsync - theVarValue: ", theVarValue);
    return theVarValue;
  }



  let getTokenValueCounter = 0;
  async function getTokenValue(token: Variable, variableCollection: VariableCollection, modeId: string, exportFormat: string, valueFormat: string): Promise<void> {
    // increment the getTokenValueCounter by 1
    getTokenValueCounter++;
    // console.log(`GTV token ${getTokenValueCounter} ...`);
    if (getTokenValueCounter === 1) {
      // console.log(token, variableCollection, modeId, exportFormat, valueFormat);
    }
    try {
      const collectionId = variableCollection.id;
      if (getTokenValueCounter === 1) {
        // console.log(collectionId);
      }
      const tokenType = token.resolvedType;
      if (getTokenValueCounter === 1) {
        // console.log(tokenType);
      }
      const tokenValue = token.valuesByMode[modeId];
      if (getTokenValueCounter === 1) {
        // console.log("tokenValue", tokenValue);
      }
      if (getTokenValueCounter === 1) {
        // console.log('(tokenValue && (tokenValue as VariableAlias).type === "VARIABLE_ALIAS")', (tokenValue && (tokenValue as VariableAlias).type === "VARIABLE_ALIAS"));
      }
      if (tokenValue && (tokenValue as VariableAlias).type === "VARIABLE_ALIAS") {
        if (getTokenValueCounter === 1) {
          // console.log("tokenValue inside conditional", tokenValue);
        }
        // @ts-ignore
        let variable: Variable | null = null;
        // console.log('Before getVariableByIdAsync');
        try {
          if ((tokenValue as VariableAlias).type === "VARIABLE_ALIAS") { // Check if tokenValue is of type VariableAlias
            const tokenId = (tokenValue as VariableAlias).id;
            // console.log('tokenId', tokenId);
            
            variable = await figma.variables.getVariableByIdAsync(tokenId); // Access id property
            // console.log('After getVariableByIdAsync', variable);
          }
        } catch (error) {
          console.error('An error occurred:', error);
        }
        // console.log('After try-catch');
        // const variable = tokenValue;
        // console.log("getTokenValueCounter", getTokenValueCounter);
        if (getTokenValueCounter === 1) {
          // console.log("tokenValue inside conditional", tokenValue);
          console.log("variable:", variable);
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
                // getTokenValue(variable, variableCollection, defaultModeIdOfVariableCollectionOfToken);
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
    function (collection: any, mode: any, exportFormat: string, valueFormat: string): void {
      //console.log(`maint.ts - COPY_VARIABLES - collection, mode: `, collection, mode, exportFormat, valueFormat);
      exportedTokens = {}
      let tokensToExport;
      if (collection === undefined && mode === undefined) {
        tokensToExport = figma.variables.getLocalVariables(); // get ALL local variables
        // console.log(`Processing ${tokensToExport.length} tokens...`)
      } else if (collection !== undefined && mode !== undefined) {
        const variableCollection = figma.variables.getVariableCollectionById(collection.id);
        if (variableCollection) {
          tokensToExport = variableCollection.variableIds.map((variableId) => {
            return figma.variables.getVariableById(variableId);
          });
          tokensToExport.forEach((token, index) => {
            // console.log(`CVH - Processing token ${index + 1} of ${tokensToExport.length}...`, token, token?.name)
            // console.log(`Processing token ${index + 1} of ${tokensToExport.length}...`, token, token?.name)
            try {
              if (token) {
                // console.log(`CVH - token ${index + 1}: `, token);
                getTokenValue(token, variableCollection, mode.modeId, exportFormat, valueFormat);
              }
            } catch (error) {
              console.warn(`Error processing token: ${token?.name}. Error: ${error}`);
            }
          });
          if (notExportedTokens.length > 0) {
            console.warn(`Tokens not exported:\n\n${notExportedTokens.join(`\n\n`)}`);
          }
          if (Object.keys(exportedTokens).length < tokensToExport.length) {
            console.error(`${tokensToExport.length - Object.keys(exportedTokens).length} tokens failed to export.`)
          }
          figma.notify(`Copied ${Object.keys(exportedTokens).length} of ${tokensToExport.length} tokens to clipboard.`)

          // console.log(`Exported ${Object.keys(exportedTokens).length} of ${tokensToExport.length} tokens.`)
        }
      }
      let formattedExportedTokens = JSON.stringify(exportedTokens);
      if (exportFormat === "cssVar" || exportFormat === "camelCase") {
        formattedExportedTokens = ":root " + formattedExportedTokens;
      }
      formattedExportedTokens = formattedExportedTokens.replace(/\"([^(\")"]+)\":/g, "$1: ").replace(/\"([^(\")"]+)\"/g, "'$1'").replace(/,/g, ";\n  ").replace(/{/g, "{\n  ").replace(/}/g, ";\n}");
      // console.log(formattedExportedTokens)
      if (exportFormat === "dotNotation") {
        formattedExportedTokens = convertToNestedObject(formattedExportedTokens);
        // modify the text formatting of `formattedExportedTokens` to have the proper indentation and new lines of a nested JSON object so that it is readable

      }
      emit<CopyToClipboard>('COPY_TO_CLIPBOARD', formattedExportedTokens)
    }
  )
}

