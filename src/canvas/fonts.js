// fonts.js — font registry for the canvas particle renderer.
//
// Two sources:
//  1. Bundled .ttf files (public/fonts) — full particle support. The SAME .ttf
//     is registered as an @font-face AND parsed by opentype.js, so the
//     (invisible) DOM layout and the drawn glyph outlines stay perfectly
//     aligned.
//  2. justfont families (loaded from the justfont CDN) — style the DOM layer.
//     For pixel-exact particles a matching .ttf must be added to public/fonts
//     (convert the justfont webfont with ttf-converter, then css3FontConverter
//     for the @font-face set). Until then particles fall back to the active
//     bundled TTF. See public/fonts/README.md.

const BASE = import.meta.env.BASE_URL

export const PARTICLE_FONTS = [
  {
    id: 'chenyuluoyan',
    label: 'ChenYuluoyan Thin (bundled)',
    family: 'ChenYuluoyanParticle',
    ttf: BASE + 'fonts/ChenYuluoyan-2.0-Thin.ttf',
  },
]

// justfont families (CSS classes served by the loader below). ttf:null → no
// bundled outline yet, so selecting one styles the DOM text but particles use
// the active bundled TTF.
export const JUSTFONT_FAMILIES = [
  { id: 'none', label: '— none (use particle font) —', cssClass: '', ttf: null },
  { id: 'jf-openhuninn', label: 'jf-openhuninn 粉圓', cssClass: 'jf-openhuninn', ttf: null },
  { id: 'xingothic-tc', label: 'xingothic-tc 醒思黑', cssClass: 'xingothic-tc', ttf: null },
  { id: 'jf-jinxuan', label: 'jf-jinxuan 金萱', cssClass: 'jf-jinxuan', ttf: null },
]

let facesInjected = false
export function ensureFontFaces() {
  if (facesInjected || typeof document === 'undefined') return
  facesInjected = true
  const css = PARTICLE_FONTS.map(
    (f) =>
      `@font-face{font-family:'${f.family}';src:url('${f.ttf}') format('truetype');font-display:swap;}`,
  ).join('\n')
  const style = document.createElement('style')
  style.id = 'particle-font-faces'
  style.textContent = css
  document.head.appendChild(style)
}

let jfInjected = false
// Injects the justfont loader (project 65691 / loader id 473414955184 — the id
// requested for this demo). Domain-locked by justfont; on unauthorised hosts
// the CSS classes simply won't resolve, which is why particles use a bundled
// TTF as the source of truth.
export function ensureJustfontLoader() {
  if (jfInjected || typeof document === 'undefined') return
  jfInjected = true
  window._jf = window._jf || []
  window._jf.push(['p', '65691'])
  window._jf.push(['initAction', true])
  const s = document.createElement('script')
  s.src = '//ds.justfont.com/js/stable/v/6.1/id/473414955184'
  s.async = true
  s.onerror = () => console.warn('[justfont] loader failed (domain lock?) — using bundled TTF')
  document.head.appendChild(s)
}
