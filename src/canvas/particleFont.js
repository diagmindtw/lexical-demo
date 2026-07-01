// particleFont.js
// Port of font3d's glyph → particle/point-cloud technique to HTML5 2D canvas.
//
// Pipeline (mirrors a0kuma/font3d):
//   opentype.js getPath()  →  flatten béziers to polylines
//     →  sample evenly-spaced points along the outline
//     →  jitter each point with deterministic Gaussian noise
//     →  draw a "stroke pass" (outline) + a "particle pass" (dots)
//
// Everything is deterministic given (char, x, baseline, params) so a cached
// particle bitmap stays valid until the layout changes.

import opentype from 'opentype.js'

const fontCache = new Map()

// Load + parse a .ttf/.otf into an opentype.Font (cached by url).
export async function loadParticleFont(url) {
  if (fontCache.has(url)) return fontCache.get(url)
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`font fetch ${r.status} for ${url}`)
      return r.arrayBuffer()
    })
    .then((buf) => opentype.parse(buf))
  fontCache.set(url, p)
  return p
}

// Deterministic PRNG (mulberry32) so noise is stable frame-to-frame.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box–Muller Gaussian from a uniform PRNG.
function gauss(rng) {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

// Convert opentype path commands into an array of contours (each a polyline
// of {x,y}). Béziers are flattened with a fixed subdivision.
function commandsToContours(commands, steps = 8) {
  const contours = []
  let cur = null
  let px = 0
  let py = 0
  for (const c of commands) {
    if (c.type === 'M') {
      cur = [{ x: c.x, y: c.y }]
      contours.push(cur)
      px = c.x
      py = c.y
    } else if (c.type === 'L') {
      cur.push({ x: c.x, y: c.y })
      px = c.x
      py = c.y
    } else if (c.type === 'Q') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const x = lerp(lerp(px, c.x1, t), lerp(c.x1, c.x, t), t)
        const y = lerp(lerp(py, c.y1, t), lerp(c.y1, c.y, t), t)
        cur.push({ x, y })
      }
      px = c.x
      py = c.y
    } else if (c.type === 'C') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const ab = { x: lerp(px, c.x1, t), y: lerp(py, c.y1, t) }
        const bc = { x: lerp(c.x1, c.x2, t), y: lerp(c.y1, c.y2, t) }
        const cd = { x: lerp(c.x2, c.x, t), y: lerp(c.y2, c.y, t) }
        const abc = { x: lerp(ab.x, bc.x, t), y: lerp(ab.y, bc.y, t) }
        const bcd = { x: lerp(bc.x, cd.x, t), y: lerp(bc.y, cd.y, t) }
        cur.push({ x: lerp(abc.x, bcd.x, t), y: lerp(abc.y, bcd.y, t) })
      }
      px = c.x
      py = c.y
    } else if (c.type === 'Z') {
      if (cur && cur.length) cur.push({ ...cur[0] })
    }
  }
  return contours
}

// Draw one glyph as stroke + particles at pen position (x, baseline).
// Returns the glyph advance width in px (for layout, though we normally use
// the DOM's own metrics for hit-testing).
export function drawGlyphParticles(ctx, font, char, x, baseline, fontSize, params) {
  const {
    strokeWidth = 1.3,
    particleSize = 0.6,
    particleDensity = 2.4,
    noiseStrength = 0.1,
    strokeColor = '#1a1a1a',
    showStroke = true,
    showParticles = true,
  } = params

  const path = font.getPath(char, x, baseline, fontSize)
  const advance = (font.getAdvanceWidth(char, fontSize)) || 0
  if (char === ' ' || char === '\t' || !path.commands.length) return advance

  const contours = commandsToContours(path.commands)

  // Stroke pass — trace the outline.
  if (showStroke) {
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = strokeColor
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (const contour of contours) {
      contour.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    }
    ctx.stroke()
  }

  // Particle pass — evenly-spaced jittered dots along the outline.
  if (showParticles) {
    // Higher density → smaller spacing between sampled points.
    const spacing = Math.max(0.6, fontSize / (particleDensity * 18))
    const noiseAmp = noiseStrength * fontSize * 0.06
    ctx.fillStyle = strokeColor
    // Seed from the pen position so the same glyph in the same spot is stable.
    const rng = mulberry32(((x * 73856093) ^ (baseline * 19349663)) >>> 0)
    for (const contour of contours) {
      let carry = 0
      for (let i = 1; i < contour.length; i++) {
        const a = contour[i - 1]
        const b = contour[i]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const segLen = Math.hypot(dx, dy)
        if (segLen === 0) continue
        let d = carry
        while (d <= segLen) {
          const t = d / segLen
          const jx = gauss(rng) * noiseAmp
          const jy = gauss(rng) * noiseAmp
          ctx.beginPath()
          ctx.arc(a.x + dx * t + jx, a.y + dy * t + jy, particleSize, 0, Math.PI * 2)
          ctx.fill()
          d += spacing
        }
        carry = d - segLen
      }
    }
  }

  return advance
}

// Slider metadata (matches font3d/settings.json).
export const PARTICLE_CONTROLS = [
  { key: 'fontSize', label: 'Font size', min: 12, max: 96, step: 1, default: 22 },
  { key: 'strokeWidth', label: 'Stroke width', min: 0, max: 6, step: 0.05, default: 1.0 },
  { key: 'particleSize', label: 'Particle size', min: 0.1, max: 3, step: 0.05, default: 0.7 },
  { key: 'particleDensity', label: 'Particle density', min: 1.2, max: 5, step: 0.05, default: 2.6 },
  { key: 'noiseStrength', label: 'Noise', min: 0, max: 3, step: 0.05, default: 0.25 },
]

export const PARTICLE_DEFAULTS = {
  ...Object.fromEntries(PARTICLE_CONTROLS.map((c) => [c.key, c.default])),
  strokeColor: '#1a1a1a',
  showStroke: true,
  showParticles: true,
}
