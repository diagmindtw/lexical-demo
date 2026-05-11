import { useState } from 'react'
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

const initialConfig = {
  namespace: 'lexical-demo',
  theme,
  onError(err) { console.error('Lexical error', err) },
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
}

export default function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PluginsSubtree />
      <Toolbar />
      <div className="editor-frame">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="editor-input" aria-label="Document body" />
          }
          placeholder={<div className="editor-placeholder">Start typing… your edits sync to the database in ~1s.</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <LinkPlugin />
      </div>
    </LexicalComposer>
  )
}
