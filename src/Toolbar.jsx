import { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'

function Btn({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      className={'tb-btn' + (active ? ' tb-active' : '')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

export default function Toolbar() {
  const [editor] = useLexicalComposerContext()
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, code: false })
  const [blockType, setBlockType] = useState('paragraph')

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection()
        if ($isRangeSelection(sel)) {
          setFmt({
            bold: sel.hasFormat('bold'),
            italic: sel.hasFormat('italic'),
            underline: sel.hasFormat('underline'),
            code: sel.hasFormat('code'),
          })
          const anchor = sel.anchor.getNode()
          const block = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElementOrThrow()
          const type = block.getType()
          if (type === 'heading') setBlockType('heading-' + block.getTag())
          else setBlockType(type)
        }
      })
    })
  }, [editor])

  const formatBlock = (kind) => {
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      if (kind === 'paragraph') $setBlocksType(sel, () => $createParagraphNode())
      else if (kind.startsWith('h')) $setBlocksType(sel, () => $createHeadingNode(kind))
      else if (kind === 'quote') $setBlocksType(sel, () => $createQuoteNode())
    })
  }

  const insertLink = () => {
    const url = window.prompt('URL', 'https://')
    if (!url) return
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Editor toolbar">
      <Btn onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo (Ctrl+Z)">↶</Btn>
      <Btn onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo (Ctrl+Y)">↷</Btn>
      <div className="tb-sep" />
      <select
        className="tb-select"
        value={blockType.startsWith('heading-') ? blockType : (blockType === 'quote' ? 'quote' : 'paragraph')}
        onChange={(e) => formatBlock(e.target.value)}
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
      </select>
      <div className="tb-sep" />
      <Btn active={fmt.bold} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} title="Bold (Ctrl+B)"><b>B</b></Btn>
      <Btn active={fmt.italic} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} title="Italic (Ctrl+I)"><i>I</i></Btn>
      <Btn active={fmt.underline} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} title="Underline (Ctrl+U)"><u>U</u></Btn>
      <Btn active={fmt.code} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} title="Inline code"><code>&lt;/&gt;</code></Btn>
      <div className="tb-sep" />
      <Btn onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Bulleted list">• ⋯</Btn>
      <Btn onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Numbered list">1. ⋯</Btn>
      <Btn onClick={() => editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)} title="Remove list">⌫</Btn>
      <div className="tb-sep" />
      <Btn onClick={insertLink} title="Insert link">🔗</Btn>
    </div>
  )
}
