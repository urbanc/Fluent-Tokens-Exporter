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

export { convertToDotNotation, convertToNestedJSON, convertToCamelCase, convertToCSSVariableName, formatCSSFromJSON };