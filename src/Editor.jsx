import { useEffect, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { CodeNode } from '@lexical/code'

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
  list: { ul: 'le-ul', ol: 'le-ol', listitem: 'le-li' },
  link: 'le-link',
  text: {
    bold: 'le-bold',
    italic: 'le-italic',
    underline: 'le-underline',
    code: 'le-code-inline',
  },
}

function PluginsSubtree() {
  const [editor] = useLexicalComposerContext()
  const status = useDocSync(editor)
  const peers = usePresence()
  return <PresenceBar peers={peers} status={status} />
}

// Mirrors the live EditorState onto window for the canvas-parity e2e test.
function TestStatePlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    const publish = () => {
      const state = editor.getEditorState()
      window.__lexicalState = JSON.stringify(state.toJSON())
      state.read(() => {
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
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
}

function CanvasEditorInner() {
  const [editor] = useLexicalComposerContext()
  const [canvasMode, setCanvasMode] = useState(true)
  const [params, setParams] = useState(PARTICLE_DEFAULTS)
  const [particleFontId, setParticleFontId] = useState(PARTICLE_FONTS[0].id)
  const [justfontId, setJustfontId] = useState('none')

  const particleFont = PARTICLE_FONTS.find((f) => f.id === particleFontId) || PARTICLE_FONTS[0]
  const font = useParticleFont(particleFont.ttf)

  useEffect(() => { ensureFontFaces() }, [])
  useEffect(() => { if (justfontId !== 'none') ensureJustfontLoader() }, [justfontId])

  const jf = JUSTFONT_FAMILIES.find((f) => f.id === justfontId)
  // In canvas mode the contenteditable is invisible; give it the font whose
  // outlines we draw so DOM metrics and particles align. justfont families
  // style the DOM via their CSS class (particles fall back to the bundled TTF).
  const inputStyle = canvasMode && justfontId === 'none' ? { fontFamily: `'${particleFont.family}', sans-serif` } : undefined
  const inputClass = 'editor-input' + (canvasMode && jf?.cssClass ? ' ' + jf.cssClass : '')

  return (
    <>
      <Toolbar />
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
      <div className={'editor-frame' + (canvasMode ? ' canvas-mode' : '')}>
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
        <LinkPlugin />
        <CanvasParticleLayer editor={editor} font={font} params={params} active={canvasMode} />
      </div>
    </>
  )
}

export default function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PluginsSubtree />
      <TestStatePlugin />
      <CanvasEditorInner />
    </LexicalComposer>
  )
}
