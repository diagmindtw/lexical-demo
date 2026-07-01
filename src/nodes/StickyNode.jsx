/* eslint-disable react-refresh/only-export-components */
// A colored sticky note with editable text. Text + color live in node state
// and serialize into doc content.
import { DecoratorNode, $getNodeByKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

const COLORS = { yellow: '#fff8b8', pink: '#ffd6e7', green: '#d6f5d6', blue: '#d6ecff' }

function StickyView({ nodeKey, text, color }) {
  const [editor] = useLexicalComposerContext()
  const set = (fn) => editor.update(() => {
    const n = $getNodeByKey(nodeKey)
    if (n && typeof n.mutate === 'function') n.mutate(fn)
  })
  const cycle = () => {
    const keys = Object.keys(COLORS)
    const next = keys[(keys.indexOf(color) + 1) % keys.length]
    set((d) => { d.color = next })
  }
  return (
    <div className="le-sticky" style={{ background: COLORS[color] || COLORS.yellow }} contentEditable={false}>
      <div className="le-sticky-bar">
        <button type="button" className="le-sticky-color" title="Change color" onClick={cycle}>🎨</button>
      </div>
      <textarea
        className="le-sticky-text"
        value={text}
        placeholder="Sticky note…"
        onChange={(e) => set((d) => { d.text = e.target.value })}
      />
    </div>
  )
}

export class StickyNode extends DecoratorNode {
  __text
  __color
  static getType() { return 'sticky' }
  static clone(node) { return new StickyNode(node.__text, node.__color, node.__key) }
  constructor(text = '', color = 'yellow', key) { super(key); this.__text = text; this.__color = color }
  isInline() { return false }
  mutate(fn) {
    const self = this.getWritable()
    const d = { text: self.__text, color: self.__color }
    fn(d)
    self.__text = d.text
    self.__color = d.color
  }
  createDOM() { const el = document.createElement('div'); el.className = 'le-sticky-host'; return el }
  updateDOM() { return false }
  decorate() { return <StickyView nodeKey={this.__key} text={this.__text} color={this.__color} /> }
  static importJSON(json) { return new StickyNode(json.text, json.color) }
  exportJSON() { return { type: 'sticky', version: 1, text: this.__text, color: this.__color } }
}

export function $createStickyNode() { return new StickyNode('', 'yellow') }
export function $isStickyNode(node) { return node instanceof StickyNode }
