import { session, renameSession } from './session'

export default function PresenceBar({ peers, status }) {
  const onRename = () => {
    const v = window.prompt('Display name', session.name)
    if (v != null) { renameSession(v); window.location.reload() }
  }
  const phaseLabel = {
    loading: 'loading…',
    idle: 'synced',
    saving: 'saving…',
    saved: 'saved',
    error: 'error',
  }[status.phase] || status.phase
  return (
    <div className="presence">
      <div className="me">
        <span className="dot" style={{ background: session.color }} />
        <span className="name" title="Click to rename" onClick={onRename}>{session.name}</span>
        <span className="role">(you)</span>
      </div>
      <div className="peers">
        {peers.length === 0 ? (
          <span className="muted">no other editors online</span>
        ) : peers.map(p => (
          <div className="peer" key={p.session_id}>
            <span className="dot" style={{ background: p.color }} />
            <span className="name">{p.name}</span>
            <span className="ago">{p.seconds_ago}s ago</span>
          </div>
        ))}
      </div>
      <div className="sync">
        <span className={'sync-pill phase-' + status.phase}>{phaseLabel}</span>
        <span className="ver">v{status.version}</span>
        {status.lastError && <span className="err" title={status.lastError}>⚠</span>}
      </div>
    </div>
  )
}
