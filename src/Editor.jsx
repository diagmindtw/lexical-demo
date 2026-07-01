import { useCallback, useEffect, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { CodeNode, CodeHighlightNode } from '@lexical/code'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { ImageNode } from './nodes/ImageNode'

import Toolbar from './Toolbar'
import PresenceBar from './PresenceBar'
import { useDocSync } from './useDocSync'
import { usePresence } from './usePresence'

import CanvasParticleLayer from './canvas/CanvasParticleLayer'
import ControlPanel from './canvas/ControlPanel'
import { useParticleFont } from './canvas/useParticleFont'
import { PARTICLE_DEFAULTS } from './canvas/particleFont'
import { PARTICLE_FONTS, JUSTFONT_FAMILIES, ensureFontFaces, ensureJustfontLoader } from './canvas/fonts'

const theme = {
  paragraph: 'le-paragraph',
  quote: 'le-quote',
  heading: { h1: 'le-h1', h2: 'le-h2', h3: 'le-h3', h4: 'le-h4', h5: 'le-h5' },
  list: { ul: 'le-ul', ol: 'le-ol', listitem: 'le-li', checklist: 'le-checklist' },
  link: 'le-link',
  code: 'le-code-block',
  table: 'le-table',
  tableCell: 'le-td',
  tableRow: 'le-tr',
  text: {
    bold: 'le-bold',
    italic: 'le-italic',
    underline: 'le-underline',
    strikethrough: 'le-strike',
    subscript: 'le-sub',
    superscript: 'le-sup',
    code: 'le-code-inline',
  },
}

// Editor page width (px @96dpi) by page size + orientation.
const PAGE_DIMS = {
  A4: [794, 1123],
  Letter: [816, 1056],
  Legal: [816, 1344],
}
function pageWidthPx({ pageSize, orientation }) {
  if (pageSize === 'Full' || !PAGE_DIMS[pageSize]) return null
  const [p, l] = PAGE_DIMS[pageSize]
  return orientation === 'landscape' ? l : p
}

// Mirrors the live EditorState onto window for e2e assertions.
function TestStatePlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    const publish = () => {
      window.__lexicalState = JSON.stringify(editor.getEditorState().toJSON())
      editor.getEditorState().read(() => {
        window.__lexicalText = editor.getRootElement()?.textContent ?? ''
      })
    }
    publish()
    return editor.registerUpdateListener(publish)
  }, [editor])
  return null
}

const initialConfig = {
  namespace: 'lexical-demo',
  theme,
  onError(err) { console.error('Lexical error', err) },
  nodes: [
    HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode,
    CodeNode, CodeHighlightNode,
    TableNode, TableCellNode, TableRowNode,
    HorizontalRuleNode, ImageNode,
  ],
}

function EditorInner() {
  const [editor] = useLexicalComposerContext()

  // Canvas particle state
  const [canvasMode, setCanvasMode] = useState(true)
  const [params, setParams] = useState(PARTICLE_DEFAULTS)
  const [particleFontId, setParticleFontId] = useState(PARTICLE_FONTS[0].id)
  const [justfontId, setJustfontId] = useState('none')

  // Page setup (synced as doc meta)
  const [pageSetup, setPageSetup] = useState({ pageSize: 'A4', orientation: 'portrait' })

  // Remote meta may be null (doc saved before the meta column existed) or a
  // partial object — always coalesce back to a full page-setup shape so the
  // toolbar/frame never destructure null. Accepts either a value or an updater.
  const applyMeta = useCallback((next) => {
    setPageSetup((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      return { pageSize: 'A4', orientation: 'portrait', ...(resolved || {}) }
    })
  }, [])

  const status = useDocSync(editor, pageSetup, applyMeta)
  const peers = usePresence()

  const particleFont = PARTICLE_FONTS.find((f) => f.id === particleFontId) || PARTICLE_FONTS[0]
  const font = useParticleFont(particleFont.ttf)

  useEffect(() => { ensureFontFaces() }, [])
  useEffect(() => { if (justfontId !== 'none') ensureJustfontLoader() }, [justfontId])

  const jf = JUSTFONT_FAMILIES.find((f) => f.id === justfontId)
  const inputStyle = canvasMode && justfontId === 'none' ? { fontFamily: `'${particleFont.family}', sans-serif` } : undefined
  const inputClass = 'editor-input' + (canvasMode && jf?.cssClass ? ' ' + jf.cssClass : '')

  const w = pageWidthPx(pageSetup)
  const frameStyle = w ? { maxWidth: w + 'px', marginLeft: 'auto', marginRight: 'auto' } : undefined

  return (
    <>
      <PresenceBar peers={peers} status={status} />
      <Toolbar pageSetup={pageSetup} setPageSetup={setPageSetup} />
      <ControlPanel
        canvasMode={canvasMode}
        onToggleCanvas={setCanvasMode}
        params={params}
        setParams={setParams}
        particleFontId={particleFontId}
        setParticleFontId={setParticleFontId}
        justfontId={justfontId}
        setJustfontId={setJustfontId}
      />
      <div className={'editor-frame' + (canvasMode ? ' canvas-mode' : '')} style={frameStyle} data-testid="editor-frame">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className={inputClass} style={inputStyle} aria-label="Document body" />
          }
          placeholder={<div className="editor-placeholder">Start typing… edits sync in ~1s.</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <TablePlugin />
        <CanvasParticleLayer editor={editor} font={font} params={params} active={canvasMode} />
      </div>
    </>
  )
}

export default function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <TestStatePlugin />
      <EditorInner />
    </LexicalComposer>
  )
}
