/* eslint-disable react-refresh/only-export-components */
// Structural insert nodes: Columns Layout and Collapsible container.
// Both keep their inner content as editable plain text stored in node state so
// they serialize into doc content without extra ElementNode plumbing. (Rich
// nested Lexical content inside columns is intentionally out of scope for the
// demo; this delivers the working insert function + layout + round-trip.)
import { DecoratorNode, $getNodeByKey } from 'lexical'
import { useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

/* ---------------- Columns Layout ---------------- */
function ColumnsView({ nodeKey, columns }) {
  const [editor] = useLexicalComposerContext()
  const setCol = (i, text) => editor.update(() => {
    const n = $getNodeByKey(nodeKey)
    if (n && typeof n.setColumn === 'function') n.setColumn(i, text)
  })
  return (
    <div className="le-columns" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }} contentEditable={false}>
      {columns.map((c, i) => (
        <textarea key={i} className="le-col" value={c} placeholder={`Column ${i + 1}…`} onChange={(e) => setCol(i, e.target.value)} />
      ))}
    </div>
  )
}

export class ColumnsNode extends DecoratorNode {
  __columns
  static getType() { return 'columns' }
  static clone(node) { return new ColumnsNode(node.__columns, node.__key) }
  constructor(columns = ['', ''], key) { super(key); this.__columns = columns }
  isInline() { return false }
  setColumn(i, text) { const self = this.getWritable(); const next = [...self.__columns]; next[i] = text; self.__columns = next }
  createDOM() { const d = document.createElement('div'); d.className = 'le-columns-host'; return d }
  updateDOM() { return false }
  decorate() { return <ColumnsView nodeKey={this.__key} columns={this.__columns} /> }
  static importJSON(json) { return new ColumnsNode(json.columns || ['', '']) }
  exportJSON() { return { type: 'columns', version: 1, columns: this.__columns } }
}
export function $createColumnsNode(count = 2) { return new ColumnsNode(Array.from({ length: count }, () => '')) }
export function $isColumnsNode(node) { return node instanceof ColumnsNode }

/* ---------------- Collapsible container ---------------- */
function CollapsibleView({ nodeKey, title, content, open }) {
  const [editor] = useLexicalComposerContext()
  const [expanded, setExpanded] = useState(open)
  const set = (fn) => editor.update(() => {
    const n = $getNodeByKey(nodeKey)
    if (n && typeof n.mutate === 'function') n.mutate(fn)
  })
  return (
    <div className={'le-collapsible' + (expanded ? ' open' : '')} contentEditable={false}>
      <div className="le-collapsible-title">
        <button type="button" className="le-collapsible-toggle" onClick={() => { setExpanded((v) => { const nv = !v; set((d) => { d.open = nv }); return nv }) }}>
          {expanded ? '▾' : '▸'}
        </button>
        <input className="le-collapsible-title-input" value={title} placeholder="Title…" onChange={(e) => set((d) => { d.title = e.target.value })} />
      </div>
      {expanded && (
        <textarea className="le-collapsible-content" value={content} placeholder="Content…" onChange={(e) => set((d) => { d.content = e.target.value })} />
      )}
    </div>
  )
}

export class CollapsibleNode extends DecoratorNode {
  __title
  __content
  __open
  static getType() { return 'collapsible' }
  static clone(node) { return new CollapsibleNode(node.__title, node.__content, node.__open, node.__key) }
  constructor(title = '', content = '', open = true, key) { super(key); this.__title = title; this.__content = content; this.__open = open }
  isInline() { return false }
  mutate(fn) {
    const self = this.getWritable()
    const d = { title: self.__title, content: self.__content, open: self.__open }
    fn(d)
    self.__title = d.title; self.__content = d.content; self.__open = d.open
  }
  createDOM() { const el = document.createElement('div'); el.className = 'le-collapsible-host'; return el }
  updateDOM() { return false }
  decorate() { return <CollapsibleView nodeKey={this.__key} title={this.__title} content={this.__content} open={this.__open} /> }
  static importJSON(json) { return new CollapsibleNode(json.title, json.content, json.open) }
  exportJSON() { return { type: 'collapsible', version: 1, title: this.__title, content: this.__content, open: this.__open } }
}
export function $createCollapsibleNode() { return new CollapsibleNode('', '', true) }
export function $isCollapsibleNode(node) { return node instanceof CollapsibleNode }
