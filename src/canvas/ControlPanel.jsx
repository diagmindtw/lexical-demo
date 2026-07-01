// ControlPanel.jsx — font3d-style slider bar + font pickers + canvas toggle.
import { PARTICLE_CONTROLS } from './particleFont'
import { PARTICLE_FONTS, JUSTFONT_FAMILIES } from './fonts'

export default function ControlPanel({
  canvasMode,
  onToggleCanvas,
  params,
  setParams,
  particleFontId,
  setParticleFontId,
  justfontId,
  setJustfontId,
}) {
  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : parseFloat(e.target.value)
    setParams((p) => ({ ...p, [key]: v }))
  }

  return (
    <div className="cv-panel" role="group" aria-label="Canvas render controls">
      <label className="cv-toggle" title="Render the editor on an HTML5 canvas as font3d-style particles">
        <input
          type="checkbox"
          checked={canvasMode}
          onChange={(e) => onToggleCanvas(e.target.checked)}
          data-testid="canvas-mode-toggle"
        />
        <strong>Canvas particle mode</strong>
      </label>

      <div className={'cv-controls' + (canvasMode ? '' : ' cv-dim')}>
        {PARTICLE_CONTROLS.map((c) => (
          <label key={c.key} className="cv-row">
            <span className="cv-label">{c.label}</span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={params[c.key]}
              onChange={set(c.key)}
              disabled={!canvasMode}
              data-testid={`slider-${c.key}`}
            />
            <span className="cv-val">{Number(params[c.key]).toFixed(2)}</span>
          </label>
        ))}

        <label className="cv-row">
          <span className="cv-label">Colour</span>
          <input type="color" value={params.strokeColor} onChange={set('strokeColor')} disabled={!canvasMode} />
          <span className="cv-val" />
        </label>

        <div className="cv-row cv-checks">
          <label>
            <input type="checkbox" checked={params.showStroke} onChange={set('showStroke')} disabled={!canvasMode} /> stroke
          </label>
          <label>
            <input type="checkbox" checked={params.showParticles} onChange={set('showParticles')} disabled={!canvasMode} /> particles
          </label>
        </div>

        <label className="cv-row">
          <span className="cv-label">Particle font</span>
          <select
            value={particleFontId}
            onChange={(e) => setParticleFontId(e.target.value)}
            disabled={!canvasMode}
            data-testid="particle-font"
          >
            {PARTICLE_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="cv-val" />
        </label>

        <label className="cv-row">
          <span className="cv-label">justfont</span>
          <select
            value={justfontId}
            onChange={(e) => setJustfontId(e.target.value)}
            disabled={!canvasMode}
            data-testid="justfont-family"
          >
            {JUSTFONT_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="cv-val" />
        </label>
      </div>
    </div>
  )
}
