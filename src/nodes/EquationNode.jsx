/* eslint-disable react-refresh/only-export-components */
// LaTeX equation node rendered with KaTeX. Stores the raw LaTeX + inline flag.
// Click to edit the LaTeX; blur/Enter re-renders. Serializes into doc content.
import { DecoratorNode } from 'lexical'
import { useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey } from 'lexical'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function EquationView({ nodeKey, equation, inline }) {
  const [editor] = useLexicalComposerContext()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(equation)
  const ref = useRef(null)
  const startEditing = () => { setDraft(equation); setEditing(true) }

  useEffect(() => {
    if (editing || !ref.current) return
    try {
      katex.render(equation || '\\;', ref.current, {
        displayMode: !inline, throwOnError: false, errorColor: '#b91c1c',
      })
    } catch {
      ref.current.textContent = equation
    }
  }, [equation, inline, editing])

  const commit = () => {
    setEditing(false)
    editor.update(() => {
      const n = $getNodeByKey(nodeKey)
      if (n && typeof n.setEquation === 'function') n.setEquation(draft)
    })
  }

  if (editing) {
    return (
      <span className={inline ? 'le-eq le-eq-inline' : 'le-eq le-eq-block'} contentEditable={false}>
        <input
          className="le-eq-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') { setDraft(equation); setEditing(false) } }}
        />
      </span>
    )
  }
  return (
    <span
      className={inline ? 'le-eq le-eq-inline' : 'le-eq le-eq-block'}
      contentEditable={false}
      title="Click to edit equation"
      onClick={startEditing}
    >
      <span ref={ref} />
    </span>
  )
}

export class EquationNode extends DecoratorNode {
  __equation
  __inline
  static getType() { return 'equation' }
  static clone(node) { return new EquationNode(node.__equation, node.__inline, node.__key) }
  constructor(equation, inline = false, key) { super(key); this.__equation = equation; this.__inline = inline }
  isInline() { return this.__inline }
  setEquation(eq) { const self = this.getWritable(); self.__equation = eq }
  createDOM() {
    const el = document.createElement(this.__inline ? 'span' : 'div')
    el.className = 'le-eq-host'
    return el
  }
  updateDOM(prev) { return prev.__inline !== this.__inline }
  decorate() { return <EquationView nodeKey={this.__key} equation={this.__equation} inline={this.__inline} /> }
  static importJSON(json) { return $createEquationNode(json.equation, json.inline) }
  exportJSON() { return { type: 'equation', version: 1, equation: this.__equation, inline: !!this.__inline } }
}

export function $createEquationNode(equation = '', inline = false) { return new EquationNode(equation, inline) }
export function $isEquationNode(node) { return node instanceof EquationNode }
