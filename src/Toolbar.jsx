import { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from 'lexical'
import {
  $setBlocksType,
  $patchStyleText,
  $getSelectionStyleValueForProperty,
} from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { $createHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { $getNearestNodeOfType, $insertNodeToNearestRoot } from '@lexical/utils'
import { $createImageNode } from './nodes/ImageNode'

const FONT_FAMILIES = ['Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Trebuchet MS', 'Verdana']

function Btn({ active, onClick, title, children, testid }) {
  return (
    <button
      type="button"
      className={'tb-btn' + (active ? ' tb-active' : '')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      data-testid={testid}
    >
      {children}
    </button>
  )
}

export default function Toolbar({ pageSetup, setPageSetup }) {
  const [editor] = useLexicalComposerContext()
  const [fmt, setFmt] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
    subscript: false, superscript: false, code: false,
  })
  const [blockType, setBlockType] = useState('paragraph')
  const [align, setAlign] = useState('left')
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState(15)
  const [fontColor, setFontColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const fileRef = useRef(null)

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection()
        if (!$isRangeSelection(sel)) return
        setFmt({
          bold: sel.hasFormat('bold'),
          italic: sel.hasFormat('italic'),
          underline: sel.hasFormat('underline'),
          strikethrough: sel.hasFormat('strikethrough'),
          subscript: sel.hasFormat('subscript'),
          superscript: sel.hasFormat('superscript'),
          code: sel.hasFormat('code'),
        })
        const anchor = sel.anchor.getNode()
        const el = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElementOrThrow()
        // block type (incl. list type)
        if ($isListNode(el)) {
          const parentList = $getNearestNodeOfType(anchor, ListNode)
          setBlockType(parentList ? parentList.getListType() : el.getListType())
        } else {
          const t = el.getType()
          setBlockType(t === 'heading' ? el.getTag() : t)
        }
        setAlign(el.getFormatType() || 'left')
        setFontFamily($getSelectionStyleValueForProperty(sel, 'font-family', 'Arial'))
        const fs = $getSelectionStyleValueForProperty(sel, 'font-size', '15px')
        setFontSize(parseInt(fs, 10) || 15)
        const c = $getSelectionStyleValueForProperty(sel, 'color', '#000000')
        setFontColor(/^#/.test(c) ? c : '#000000')
        const bg = $getSelectionStyleValueForProperty(sel, 'background-color', '#ffffff')
        setBgColor(/^#/.test(bg) ? bg : '#ffffff')
      })
    })
  }, [editor])

  const applyStyle = useCallback((styles) => {
    editor.update(() => {
      const sel = $getSelection()
      if ($isRangeSelection(sel)) $patchStyleText(sel, styles)
    })
  }, [editor])

  const formatBlock = (kind) => {
    if (kind === 'bullet') { editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined); return }
    if (kind === 'number') { editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined); return }
    if (kind === 'check') { editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined); return }
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      if (blockType === 'bullet' || blockType === 'number' || blockType === 'check') {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      }
      if (kind === 'paragraph') $setBlocksType(sel, () => $createParagraphNode())
      else if (kind[0] === 'h') $setBlocksType(sel, () => $createHeadingNode(kind))
      else if (kind === 'quote') $setBlocksType(sel, () => $createQuoteNode())
      else if (kind === 'code') $setBlocksType(sel, () => $createCodeNode())
    })
  }

  const bumpFontSize = (delta) => {
    const next = Math.max(8, Math.min(72, fontSize + delta))
    setFontSize(next)
    applyStyle({ 'font-size': next + 'px' })
  }

  const clearFormatting = () => {
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      $patchStyleText(sel, {
        'font-size': null, 'font-family': null, color: null,
        'background-color': null, 'text-transform': null,
      })
      const nodes = sel.getNodes()
      nodes.forEach((n) => {
        if (typeof n.setFormat === 'function' && typeof n.getFormat === 'function' && n.getType() === 'text') {
          n.setFormat(0)
        }
      })
    })
  }

  const insertImageFromFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result
      editor.update(() => { $insertNodeToNearestRoot($createImageNode(src, file.name)) })
    }
    reader.readAsDataURL(file)
  }

  const doInsert = (what) => {
    if (what === 'image') { fileRef.current?.click(); return }
    if (what === 'hr') { editor.update(() => { $insertNodeToNearestRoot($createHorizontalRuleNode()) }); return }
    if (what === 'table') { editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3' }); return }
  }

  const insertLink = () => {
    const url = window.prompt('URL', 'https://')
    if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
  }

  // Ctrl+K → link, Ctrl+Shift+, / . → font size
  useEffect(() => {
    const root = editor.getRootElement()
    if (!root) return
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); insertLink() }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '<') { e.preventDefault(); bumpFontSize(-1) }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '>') { e.preventDefault(); bumpFontSize(1) }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [editor, fontSize]) // eslint-disable-line react-hooks/exhaustive-deps

  const blockValue = ['h1', 'h2', 'h3', 'quote', 'code', 'bullet', 'number', 'check'].includes(blockType) ? blockType : 'paragraph'

  return (
    <div className="toolbar" role="toolbar" aria-label="Editor toolbar">
      <Btn onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo (Ctrl+Z)" testid="tb-undo">↶</Btn>
      <Btn onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo (Ctrl+Y)" testid="tb-redo">↷</Btn>
      <div className="tb-sep" />

      <select className="tb-select" value={blockValue} onChange={(e) => formatBlock(e.target.value)} data-testid="tb-block" title="Block format">
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
        <option value="code">Code Block</option>
        <option value="bullet">Bulleted List</option>
        <option value="number">Numbered List</option>
        <option value="check">Check List</option>
      </select>
      <div className="tb-sep" />

      <select className="tb-select" value={FONT_FAMILIES.includes(fontFamily) ? fontFamily : 'Arial'} onChange={(e) => applyStyle({ 'font-family': e.target.value })} data-testid="tb-fontfamily" title="Font family">
        {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>

      <Btn onClick={() => bumpFontSize(-1)} title="Decrease font size (Ctrl+Shift+,)" testid="tb-font-dec">A−</Btn>
      <input
        className="tb-fontsize" type="number" min={8} max={72} value={fontSize}
        onChange={(e) => { const v = Math.max(8, Math.min(72, parseInt(e.target.value, 10) || 8)); setFontSize(v); applyStyle({ 'font-size': v + 'px' }) }}
        data-testid="tb-fontsize" title="Font size"
      />
      <Btn onClick={() => bumpFontSize(1)} title="Increase font size (Ctrl+Shift+.)" testid="tb-font-inc">A+</Btn>
      <div className="tb-sep" />

      <Btn active={fmt.bold} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} title="Bold (Ctrl+B)" testid="tb-bold"><b>B</b></Btn>
      <Btn active={fmt.italic} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} title="Italic (Ctrl+I)" testid="tb-italic"><i>I</i></Btn>
      <Btn active={fmt.underline} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} title="Underline (Ctrl+U)" testid="tb-underline"><u>U</u></Btn>
      <Btn active={fmt.strikethrough} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} title="Strikethrough" testid="tb-strike"><s>S</s></Btn>
      <Btn active={fmt.code} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} title="Insert code (Ctrl+Shift+C)" testid="tb-code"><code>&lt;/&gt;</code></Btn>
      <Btn active={fmt.subscript} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')} title="Subscript" testid="tb-sub">x₂</Btn>
      <Btn active={fmt.superscript} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')} title="Superscript" testid="tb-sup">x²</Btn>
      <Btn onClick={insertLink} title="Insert link (Ctrl+K)" testid="tb-link">🔗</Btn>
      <div className="tb-sep" />

      <label className="tb-color" title="Text color">
        <span>A</span>
        <input type="color" value={fontColor} onChange={(e) => { setFontColor(e.target.value); applyStyle({ color: e.target.value }) }} data-testid="tb-color" />
      </label>
      <label className="tb-color" title="Background color">
        <span className="tb-bg">▧</span>
        <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); applyStyle({ 'background-color': e.target.value }) }} data-testid="tb-bgcolor" />
      </label>
      <div className="tb-sep" />

      <select className="tb-select" value="" onChange={(e) => { const v = e.target.value; if (!v) return; if (v === 'clear') clearFormatting(); else applyStyle({ 'text-transform': v }); e.target.value = '' }} data-testid="tb-styles" title="Additional text styles">
        <option value="">Aa styles…</option>
        <option value="uppercase">UPPERCASE</option>
        <option value="lowercase">lowercase</option>
        <option value="capitalize">Capitalize</option>
        <option value="clear">Clear formatting</option>
      </select>

      <select className="tb-select" value={align} onChange={(e) => { setAlign(e.target.value); editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, e.target.value) }} data-testid="tb-align" title="Text alignment">
        <option value="left">Left Align</option>
        <option value="center">Center Align</option>
        <option value="right">Right Align</option>
        <option value="justify">Justify</option>
      </select>

      <select className="tb-select" value="" onChange={(e) => { const v = e.target.value; if (v) doInsert(v); e.target.value = '' }} data-testid="tb-insert" title="Insert specialized editor node">
        <option value="">Insert…</option>
        <option value="image">🖼 Image</option>
        <option value="table">▦ Table</option>
        <option value="hr">— Horizontal Rule</option>
      </select>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={insertImageFromFile} data-testid="tb-imagefile" />
      <div className="tb-sep" />

      <select className="tb-select" value={pageSetup.pageSize} onChange={(e) => setPageSetup({ ...pageSetup, pageSize: e.target.value })} data-testid="tb-pagesize" title="Page setup: size, orientation, and layout">
        <option value="A4">A4</option>
        <option value="Letter">Letter</option>
        <option value="Legal">Legal</option>
        <option value="Full">Full width</option>
      </select>
      <select className="tb-select" value={pageSetup.orientation} onChange={(e) => setPageSetup({ ...pageSetup, orientation: e.target.value })} data-testid="tb-orientation" title="Page orientation">
        <option value="portrait">Portrait</option>
        <option value="landscape">Landscape</option>
      </select>
    </div>
  )
}
