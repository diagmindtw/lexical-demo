import { useEffect, useState } from 'react'
import { loadParticleFont } from './particleFont'

// Load + parse an opentype font by URL, returning the Font (or null while
// loading / on error).
export function useParticleFont(url) {
  const [font, setFont] = useState(null)
  useEffect(() => {
    if (!url) return
    let alive = true
    loadParticleFont(url)
      .then((f) => alive && setFont(f))
      .catch((e) => console.error('[particleFont] load failed', e))
    return () => {
      alive = false
    }
  }, [url])
  return font
}
