// Per-tab session identity: a stable random id, a random colour, and a
// human-friendly default name. Persisted in sessionStorage so a refresh in
// the same tab keeps the same id (and therefore the same colour dot on
// other peers' screens), but two tabs are two distinct sessions.

const NAMES = ['Otter', 'Falcon', 'Quokka', 'Panda', 'Tapir', 'Lemur', 'Capybara', 'Heron', 'Axolotl', 'Wombat']
const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080']

function randUuid() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return 'sess-' + Math.random().toString(36).slice(2, 14)
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function loadOrInit() {
  const cached = sessionStorage.getItem('lexical-demo-session')
  if (cached) {
    try { return JSON.parse(cached) } catch { /* fallthrough */ }
  }
  const fresh = {
    id: randUuid(),
    name: pick(NAMES) + '-' + Math.floor(Math.random() * 99),
    color: pick(PALETTE),
  }
  sessionStorage.setItem('lexical-demo-session', JSON.stringify(fresh))
  return fresh
}

export const session = loadOrInit()

export function renameSession(newName) {
  session.name = (newName || '').slice(0, 64) || session.name
  sessionStorage.setItem('lexical-demo-session', JSON.stringify(session))
}
