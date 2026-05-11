// HTTP client for the cow.diagmindtw.com Lexical-demo PHP API.
// All endpoints under /apis/lexical/. Wide-open CORS (demo only).

export const API_BASE = 'https://cow.diagmindtw.com/apis/lexical'
export const DOC_ID = 'main'

async function get(path, params = {}) {
  const url = new URL(`${API_BASE}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const r = await fetch(url, { method: 'GET' })
  if (!r.ok && r.status !== 409) throw new Error(`${path} → HTTP ${r.status}`)
  return { status: r.status, body: await r.json() }
}

async function post(path, body) {
  const r = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // Don't throw on 409 — caller handles version-mismatch.
  if (!r.ok && r.status !== 409) throw new Error(`${path} → HTTP ${r.status}`)
  return { status: r.status, body: await r.json() }
}

export const api = {
  getDoc: (doc = DOC_ID) => get('get.php', { doc }),
  pollDoc: (since, doc = DOC_ID) => get('poll.php', { doc, since }),
  saveDoc: (content, baseVersion, sessionId, doc = DOC_ID) =>
    post('save.php', { doc, content, base_version: baseVersion, session_id: sessionId }),
  pingPresence: (sessionId, name, color, doc = DOC_ID) =>
    post('presence-ping.php', { doc, session_id: sessionId, name, color }),
  listPresence: (excludeSession, doc = DOC_ID) =>
    get('presence-list.php', { doc, exclude_session: excludeSession }),
  health: () => get('_health.php'),
}
