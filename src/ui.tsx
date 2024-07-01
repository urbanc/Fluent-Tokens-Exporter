import { Bold, Button, Columns, Container, Dropdown, DropdownOption, Inline, Muted, Preview, SegmentedControl, SegmentedControlOption, Stack, Text, VerticalSpace, render, useWindowResize } from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { ResizeWindowHandler, GetVariablesHandler, CopyToClipboard, CopyVariablesHandler } from './types'
import { Fragment, JSX, h } from 'preact';
import { useState } from 'preact/hooks';
import styles from './styles.css'

function Plugin() {
  function onWindowResize(windowSize: { width: number; height: number }) {
    emit<ResizeWindowHandler>('RESIZE_WINDOW', windowSize)
  }
  useWindowResize(onWindowResize, {
    maxHeight: 330,
    maxWidth: 320,
    minHeight: 330,
    minWidth: 220,
    resizeBehaviorOnDoubleClick: 'minimize'
  })


  const [localVariableCollections, setLocalVariableCollections]: [VariableCollection[], Function] = useState<VariableCollection[]>([])
  const [collectionOptions, setCollectionOptions]: [DropdownOption[], Function] = useState<DropdownOption[]>([{ value: "All variable collections" }, '-']);
  const [modeOptions, setModeOptions]: [DropdownOption[], Function] = useState<DropdownOption[]>([{ value: "All modes" }]);

  const [collection, setCollection] = useState<string>("All variable collections");
  const [mode, setMode] = useState<string>("All modes");
  const [exportFormat, setExportFormat] = useState<string>("cssVar");

  const [valueFormat, setValueFormat] = useState<string>('Raw value');
  const valueFormatOptions: Array<SegmentedControlOption> = [{
    value: 'Raw value'
  }, {
    value: 'Alias name'
  }];
  function handleValueFormatChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    //console.log(newValue);
    setValueFormat(newValue);
  }


  const IconVariableMode16 = <svg class="svg" xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12"><path fill="var(--figma-color-text)" fill-opacity="1" fill-rule="evenodd" stroke="none" d="m5 1.381-4 2.31v4.618l4 2.31 4-2.31V3.691L5 1.38zm5 1.732L5 .227 0 3.113v5.774l5 2.887 5-2.887V3.113zm3 5.196-5 2.887 1 .578 5-2.887V3.113L9 .227 8 .804l5 2.887v4.618zM6 6c0 .552-.448 1-1 1-.552 0-1-.448-1-1 0-.552.448-1 1-1 .552 0 1 .448 1 1z"></path></svg>
  const IconVariableCollection16 = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4.5C2 3.11929 3.11929 2 4.5 2H11.5C12.8807 2 14 3.11929 14 4.5V11.5C14 12.8807 12.8807 14 11.5 14H4.5C3.11929 14 2 12.8807 2 11.5V4.5ZM6 13H10V11L6 11V13ZM5 11H3V11.5C3 12.3284 3.67157 13 4.5 13H5V11ZM6 10L10 10V6L6 6V10ZM5 6H3V10H5V6ZM6 5L10 5V3H6V5ZM5 3H4.5C3.67157 3 3 3.67157 3 4.5V5H5V3ZM13 6H11V10H13V6ZM13 11H11V13H11.5C12.3284 13 13 12.3284 13 11.5V11ZM13 5V4.5C13 3.67157 12.3284 3 11.5 3H11V5H13Z" fill="var(--figma-color-text)" /></svg>
  const IconCopy16 = <svg width="16" height="12" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow: visible; margin-right: 6px"><path d="M4.00029 4.08525L4 10.5C4 11.8255 5.03154 12.91 6.33562 12.9947L6.5 13L10.9144 13.0007C10.7083 13.5829 10.1528 14 9.5 14H6C4.34315 14 3 12.6569 3 11V5.5C3 4.84678 3.41754 4.29109 4.00029 4.08525ZM11.5 2C12.3284 2 13 2.67157 13 3.5V10.5C13 11.3284 12.3284 12 11.5 12H6.5C5.67157 12 5 11.3284 5 10.5V3.5C5 2.67157 5.67157 2 6.5 2H11.5ZM11.5 3H6.5C6.22386 3 6 3.22386 6 3.5V10.5C6 10.7761 6.22386 11 6.5 11H11.5C11.7761 11 12 10.7761 12 10.5V3.5C12 3.22386 11.7761 3 11.5 3Z" fill="var(--figma-color-text-onbrand)" /></svg>


  /**
   * Unsecured fallback for copying text to clipboard
   * @param text - The text to be copied to the clipboard
   */
  function unsecuredCopyToClipboard(text: string) {
    // Create a textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);

    // Focus and select the textarea content
    textArea.focus();
    textArea.select();

    // Attempt to copy the text to the clipboard
    try {
      document.execCommand('copy');
    } catch (e) {
      console.error('Unable to copy content to clipboard!', e);
    }

    // Remove the textarea element from the DOM
    document.body.removeChild(textArea);
  }

  /**
   * Copies the text passed as param to the system clipboard
   * Check if using HTTPS and navigator.clipboard is available
   * Then uses standard clipboard API, otherwise uses fallback
   *
   * Inspired by: https://stackoverflow.com/questions/71873824/copy-text-to-clipboard-cannot-read-properties-of-undefined-reading-writetext
   * and https://forum.figma.com/t/write-to-clipboard-from-custom-plugin/11860/12
   *
   * @param content - The content to be copied to the clipboard
   */
  function copyToClipboard(content: string) {
    // If the context is secure and clipboard API is available, use it
    if (
      window.isSecureContext &&
      typeof navigator?.clipboard?.writeText === 'function'
    ) {
      navigator.clipboard.writeText(content).then(function () {
        // Notify the user that the text has been copied
        console.log("Tokens copied to clipboard");
      }, function (err) {
        console.error('Could not copy text: ', err);
      });
    }
    // Otherwise, use the unsecured fallback
    else {
      unsecuredCopyToClipboard(content);
    }
  }

  on<CopyToClipboard>('COPY_TO_CLIPBOARD', (text) => {
    // console.log("ui.tsx - on<CopyToClipboard>", text)
    // Copy the text to the clipboard
    copyToClipboard(text);
  });

  on<GetVariablesHandler>('GET_VARIABLES', (localVariableCollections) => {
    setLocalVariableCollections(localVariableCollections)
    let newCollectionOptions: { value: string; }[] = []
    let newModesOptions: Array<{ value: string; } | { header: string; } | string> = [];
    localVariableCollections.forEach((collection) => {
      newCollectionOptions.push({ value: collection.name })
      newModesOptions.push('-')
      newModesOptions.push({ header: collection.name })
      collection.modes.forEach((mode) => {
        newModesOptions.push({ value: mode.name })
      })
    })
    setCollectionOptions([...collectionOptions, ...newCollectionOptions])
    setModeOptions([...modeOptions, ...newModesOptions])
  })

  function handleCopy(event: JSX.TargetedEvent<HTMLButtonElement>) {
    const selectedCollection = localVariableCollections.find((element) => element.name == collection)
    const selectedMode = selectedCollection?.modes.find((element) => element.name == mode)
    emit<CopyVariablesHandler>('COPY_VARIABLES', selectedCollection, selectedMode, exportFormat, valueFormat)


  }


  function handleCollectionChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    let newModesOptions: Array<{ value: string; } | { header: string; } | string> = [];
    // console.log(newValue);
    setCollection(newValue);
    // find the element in the localVariableCollections array, in which collection.name == newValue
    const selectedCollection = localVariableCollections.find((collection) => collection.name == newValue)
    // console.log("ui.tsx - handleCollectionChange - selectedCollection", selectedCollection)
    // based on the selectedCollection, create a new array of modes to replace the modeOptions
    if (selectedCollection) {
      newModesOptions.push({ value: "All modes" })
      newModesOptions.push('-')
      newModesOptions.push({ header: selectedCollection.name })
      selectedCollection.modes.forEach((mode) => {
        newModesOptions.push({ value: mode.name })
      })
      // console.log("ui.tsx - handleCollectionChange - newModesOptions", newModesOptions)
      // replace the modeOptions with the new array
      setModeOptions(newModesOptions)
    } else {
      let newModesOptions: Array<{ value: string; } | { header: string; } | string> = [];
      newModesOptions.push({ value: "All modes" })
      newModesOptions.push('-')
      localVariableCollections.forEach((collection) => {
        newModesOptions.push('-')
        newModesOptions.push({ header: collection.name })
        collection.modes.forEach((mode) => {
          newModesOptions.push({ value: mode.name })
        })
      })
      setModeOptions([...newModesOptions])
    }
    setMode("All modes")
  }

  function handleModeChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    // console.log(newValue);
    // console.log(modeOptions);
    setMode(newValue);
  }

  function handleExportFormatChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    // console.log(newValue);
    // console.log(formatOptions);
    setExportFormat(newValue);
  }

  // Render UI
  return (
    <div class={styles.scrollviewer} style={{ position: "fixed", top: "8px", left: "8px", right: "8px", bottom: "8px", overflowY: "auto" }}>
      <VerticalSpace space='large' />
      <Container space='extraSmall'>
        <Stack space='extraSmall'>
          <Text><Bold><Muted>Variable collection</Muted></Bold></Text>
          <Dropdown icon={IconVariableCollection16} onChange={handleCollectionChange} options={collectionOptions} value={collection} />
          <VerticalSpace space='small' />
          <Text><Bold><Muted>Mode</Muted></Bold></Text>
          <Dropdown icon={IconVariableMode16} onChange={handleModeChange} options={modeOptions} value={mode} />
          <VerticalSpace space='small' />
          <Text><Bold><Muted>Export format</Muted></Bold></Text>
          <Dropdown onChange={handleExportFormatChange} options={[{ text: "--css-variable-name", value: "cssVar" }, { text: "camelCase", value: "camelCase" }, { text: "JSON", value: "dotNotation" }]} value={exportFormat} />
          <SegmentedControl onChange={handleValueFormatChange} options={valueFormatOptions} value={valueFormat} />
        </Stack>
      </Container>
      <div style={{ position: 'fixed', width: 'calc(100% - 16px)', bottom: '0px' }}>
        <Container space='small'>
          <Button onClick={handleCopy} fullWidth><Inline>{IconCopy16}Copy to Clipboard</Inline></Button>
          <VerticalSpace space='large' />
        </Container>
      </div>
    </div>

  )
}


export default render(Plugin)
