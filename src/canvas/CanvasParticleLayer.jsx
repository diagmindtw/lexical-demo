// CanvasParticleLayer.jsx
// The visible editor surface. Lexical still owns the state and renders a real
// contenteditable — but in canvas mode that contenteditable is fully
// transparent (invisible text + invisible native caret). This layer reads its
// live DOM geometry and repaints every glyph as font3d-style particles, plus a
// caret + selection drawn on the canvas.
//
// The canvas is pointer-events:none, so all mouse/keyboard/IME interaction is
// still handled natively by the contenteditable — click-to-place-cursor,
// drag-select, double-click-word, shortcuts, composition — nothing is
// reimplemented, so no UX is lost.

import { useEffect, useRef } from 'react'
import { drawGlyphParticles } from './particleFont'

export default function CanvasParticleLayer({ editor, font, params, active }) {
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const layoutRef = useRef([])
  const rafRef = useRef(0)
  const paramsRef = useRef(params)

  // --- Measure the DOM: cache per-glyph position, size, colour. ---
  const measure = () => {
    const root = editor.getRootElement()
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const dpr = window.devicePixelRatio || 1
    const w = root.offsetWidth
    const h = root.offsetHeight
    canvas.style.left = root.offsetLeft + 'px'
    canvas.style.top = root.offsetTop + 'px'
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))

    const base = root.getBoundingClientRect()
    const glyphs = []
    const measurer = document.createElement('canvas').getContext('2d')
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const text = node.nodeValue
      if (!text) continue
      const el = node.parentElement
      if (!el) continue
      const cs = getComputedStyle(el)
      const fontSize = parseFloat(cs.fontSize) || 16
      const color = cs.color
      measurer.font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`
      const m = measurer.measureText('Mg')
      const ascent = m.actualBoundingBoxAscent || fontSize * 0.8
      const descent = m.actualBoundingBoxDescent || fontSize * 0.2
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === ' ' || ch === '\n' || ch === '\t') continue
        const range = document.createRange()
        range.setStart(node, i)
        range.setEnd(node, i + 1)
        const rect = range.getBoundingClientRect()
        if (!rect.width && !rect.height) continue
        const x = rect.left - base.left
        const baseline = rect.top - base.top + (rect.height - (ascent + descent)) / 2 + ascent
        glyphs.push({ ch, x, baseline, fontSize, color })
      }
    }
    layoutRef.current = glyphs
    renderParticles()
  }

  // --- Render the cached glyphs into an offscreen bitmap. ---
  const renderParticles = () => {
    const canvas = canvasRef.current
    if (!canvas || !font) return
    const dpr = window.devicePixelRatio || 1
    let off = offscreenRef.current
    if (!off) {
      off = document.createElement('canvas')
      offscreenRef.current = off
    }
    off.width = canvas.width
    off.height = canvas.height
    const ctx = off.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, off.width, off.height)
    const p = paramsRef.current
    for (const g of layoutRef.current) {
      drawGlyphParticles(ctx, font, g.ch, g.x, g.baseline, g.fontSize, {
        ...p,
        strokeColor: p.tintFromText ? g.color : p.strokeColor,
      })
    }
  }

  // --- Composite loop: offscreen particles + selection + blinking caret. ---
  const drawOverlay = (ctx, dpr, elapsed) => {
    const root = editor.getRootElement()
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const base = canvas.getBoundingClientRect()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return

    if (!range.collapsed) {
      ctx.fillStyle = 'rgba(59,130,246,0.28)'
      for (const rc of range.getClientRects()) {
        ctx.fillRect((rc.left - base.left) * dpr, (rc.top - base.top) * dpr, rc.width * dpr, rc.height * dpr)
      }
    }

    const focused = document.activeElement === root
    const blink = Math.floor(elapsed / 530) % 2 === 0
    if (range.collapsed && focused && blink) {
      const rc = range.getBoundingClientRect()
      let ch = rc.height
      let cy = rc.top - base.top
      const cx = rc.left - base.left
      if (!ch) {
        const csRoot = getComputedStyle(root)
        ch = parseFloat(csRoot.lineHeight) || parseFloat(csRoot.fontSize) * 1.4 || 22
      }
      ctx.fillStyle = '#111827'
      ctx.fillRect(cx * dpr, cy * dpr, Math.max(1, Math.round(1.6 * dpr)), ch * dpr)
    }
  }

  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const loop = (t) => {
      const canvas = canvasRef.current
      const off = offscreenRef.current
      if (canvas && off) {
        const dpr = window.devicePixelRatio || 1
        const ctx = canvas.getContext('2d')
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(off, 0, 0)
        drawOverlay(ctx, dpr, t - start)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Re-measure on editor updates, selection changes, resize, font load.
  useEffect(() => {
    if (!active) return
    const root = editor.getRootElement()
    const remeasure = () => measure()
    const unregisterUpdate = editor.registerUpdateListener(remeasure)
    const onSel = () => remeasure()
    document.addEventListener('selectionchange', onSel)
    const ro = new ResizeObserver(remeasure)
    if (root) ro.observe(root)
    window.addEventListener('resize', remeasure)
    // initial (double rAF so fonts/layout settle)
    requestAnimationFrame(() => requestAnimationFrame(remeasure))
    return () => {
      unregisterUpdate()
      document.removeEventListener('selectionchange', onSel)
      ro.disconnect()
      window.removeEventListener('resize', remeasure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, editor, font])

  // Keep the latest params available to the imperative render/rAF code, and
  // re-render particles when slider params change (layout unchanged).
  useEffect(() => {
    paramsRef.current = params
    if (active) renderParticles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, font, active])

  if (!active) return null
  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" data-testid="particle-canvas" />
}
