import { Bold, Button, Container, Dropdown, DropdownOption, Inline, Muted, SegmentedControl, SegmentedControlOption, Stack, Text, VerticalSpace, render, useWindowResize } from '@create-figma-plugin/ui'
import { IconVariableCollection16, IconCopy16, IconVariableMode16 } from './icons';
import { emit, on } from '@create-figma-plugin/utilities'
import { ResizeWindowHandler, GetVariablesHandler, CopyToClipboard, CopyVariablesHandler } from './types'
import { JSX, h } from 'preact';
import { useState } from 'preact/hooks';
import styles from './styles.css';
import copyToClipboard from './uiUtils';

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
  const valueFormatOptions: Array<SegmentedControlOption> = [{ value: 'Raw value' }, { value: 'Alias name' }];


  function handleValueFormatChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    setValueFormat(newValue);
  }

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
    const selectedCollection = localVariableCollections.find((element) => element.name == collection);
    const selectedMode = selectedCollection?.modes.find((element) => element.name == mode);
    emit<CopyVariablesHandler>('COPY_VARIABLES', selectedCollection, selectedMode, exportFormat, valueFormat);
  }


  function handleCollectionChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    let newModesOptions: Array<{ value: string; } | { header: string; } | string> = [];
    setCollection(newValue);
    // find the element in the localVariableCollections array, in which collection.name == newValue
    const selectedCollection = localVariableCollections.find((collection) => collection.name == newValue)
    // based on the selectedCollection, create a new array of modes to replace the modeOptions
    if (selectedCollection) {
      newModesOptions.push({ value: "All modes" })
      newModesOptions.push('-')
      newModesOptions.push({ header: selectedCollection.name })
      selectedCollection.modes.forEach((mode) => {
        newModesOptions.push({ value: mode.name })
      })
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
    setMode(newValue);
  }

  function handleExportFormatChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    setExportFormat(newValue);
  }

  on<CopyToClipboard>('COPY_TO_CLIPBOARD', (text) => {
    copyToClipboard(text);
  });

  return (
    <div class={styles.scrollviewer} style={{ position: "fixed", top: "8px", left: "8px", right: "8px", bottom: "8px", overflowY: "auto" }}>
      <VerticalSpace space='large' />
      <Container space='extraSmall'>
        <Stack space='extraSmall'>
          <Text><Bold><Muted>Variable collection(s)</Muted></Bold></Text>
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
