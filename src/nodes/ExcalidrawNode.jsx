/* eslint-disable react-refresh/only-export-components */
// A lightweight Excalidraw-style freehand sketch node. Strokes are stored as
// arrays of points and rendered as SVG polylines, so the drawing serializes as
// plain JSON in doc content (no heavy external drawing library / no data-URLs).
import { DecoratorNode, $getNodeByKey } from 'lexical'
import { useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

const W = 640, H = 360

function SketchView({ nodeKey, strokes }) {
  const [editor] = useLexicalComposerContext()
  const svgRef = useRef(null)
  const drawing = useRef(null)
  const [live, setLive] = useState(null)
  const [color, setColor] = useState('#1e1e1e')

  const point = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    return [
      Math.round(((e.clientX - r.left) / r.width) * W),
      Math.round(((e.clientY - r.top) / r.height) * H),
    ]
  }
  const down = (e) => { e.preventDefault(); drawing.current = { color, pts: [point(e)] }; setLive({ ...drawing.current }) }
  const move = (e) => { if (!drawing.current) return; drawing.current.pts.push(point(e)); setLive({ ...drawing.current }) }
  const up = () => {
    if (!drawing.current) return
    const stroke = drawing.current
    drawing.current = null
    setLive(null)
    editor.update(() => {
      const n = $getNodeByKey(nodeKey)
      if (n && typeof n.addStroke === 'function') n.addStroke(stroke)
    })
  }
  const clear = () => editor.update(() => {
    const n = $getNodeByKey(nodeKey)
    if (n && typeof n.clearStrokes === 'function') n.clearStrokes()
  })

  const toPath = (pts) => pts.map((p) => p.join(',')).join(' ')

  return (
    <div className="le-sketch" contentEditable={false}>
      <div className="le-sketch-bar">
        <span className="le-sketch-title">✏️ Excalidraw</span>
        {['#1e1e1e', '#e03131', '#1971c2', '#2f9e44', '#f08c00'].map((c) => (
          <button key={c} type="button" className={'le-sketch-swatch' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} title={c} />
        ))}
        <button type="button" className="le-sketch-clear" onClick={clear}>Clear</button>
      </div>
      <svg
        ref={svgRef}
        className="le-sketch-canvas"
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        {strokes.map((s, i) => (
          <polyline key={i} points={toPath(s.pts)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {live && <polyline points={toPath(live.pts)} fill="none" stroke={live.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      </svg>
    </div>
  )
}

export class ExcalidrawNode extends DecoratorNode {
  __strokes
  static getType() { return 'excalidraw' }
  static clone(node) { return new ExcalidrawNode(node.__strokes, node.__key) }
  constructor(strokes = [], key) { super(key); this.__strokes = strokes }
  isInline() { return false }
  addStroke(stroke) { const self = this.getWritable(); self.__strokes = [...self.__strokes, stroke] }
  clearStrokes() { const self = this.getWritable(); self.__strokes = [] }
  createDOM() { const d = document.createElement('div'); d.className = 'le-sketch-host'; return d }
  updateDOM() { return false }
  decorate() { return <SketchView nodeKey={this.__key} strokes={this.__strokes} /> }
  static importJSON(json) { return new ExcalidrawNode(json.strokes || []) }
  exportJSON() { return { type: 'excalidraw', version: 1, strokes: this.__strokes } }
}

export function $createExcalidrawNode() { return new ExcalidrawNode([]) }
export function $isExcalidrawNode(node) { return node instanceof ExcalidrawNode }
