import { useEffect, useState } from 'react'
import { api } from './api'
import { session } from './session'

const PING_MS = 5000
const LIST_MS = 3000

export function usePresence() {
  const [peers, setPeers] = useState([])
  useEffect(() => {
    let cancelled = false
    let pingIv, listIv
    const ping = async () => {
      try { await api.pingPresence(session.id, session.name, session.color) } catch {}
    }
    const list = async () => {
      try {
        const { body } = await api.listPresence(session.id)
        if (!cancelled) setPeers(body.peers || [])
      } catch {}
    }
    void ping(); void list()
    pingIv = setInterval(ping, PING_MS)
    listIv = setInterval(list, LIST_MS)
    return () => { cancelled = true; clearInterval(pingIv); clearInterval(listIv) }
  }, [])
  return peers
}
