import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { session } from './session'

// useDocSync wires a Lexical editor to the cow PHP backend:
//
//   - on mount: GET /get → seed initial editor state
//   - on editorState change (debounced): POST /save with base_version
//   - background poll every POLL_MS: GET /poll?since=version, apply if newer
//
// Conflict resolution is intentionally crude (demo): on 409, refetch and
// overwrite. With a single document and short save intervals collisions are
// rare in practice, and the polling loop converges everyone back together.

const SAVE_DEBOUNCE_MS = 900
const POLL_MS = 2500
// Don't merge remote updates if the user typed in the last LOCAL_GRACE_MS
// — otherwise the remote snapshot would clobber their in-flight keystrokes
// before the next save flushes them upstream.
const LOCAL_GRACE_MS = 1500

// Test/offline escape hatch: `?nosync=1` skips all backend traffic so the
// canvas-parity e2e test can drive a deterministic, purely-local editor.
const SYNC_DISABLED =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('nosync')

export function useDocSync(editor) {
  const [status, setStatus] = useState({
    phase: SYNC_DISABLED ? 'idle' : 'loading',
    version: 0,
    lastError: null,
  })
  const versionRef = useRef(0)
  const lastEditAtRef = useRef(0)
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef(null)
  const isApplyingRemoteRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

  // 1) Initial fetch.
  useEffect(() => {
    if (!editor || SYNC_DISABLED) return
    let cancelled = false
    ;(async () => {
      try {
        const { body } = await api.getDoc()
        if (cancelled) return
        versionRef.current = body.version
        if (body.content) {
          isApplyingRemoteRef.current = true
          const state = editor.parseEditorState(body.content)
          editor.setEditorState(state)
          isApplyingRemoteRef.current = false
        }
        initialLoadDoneRef.current = true
        setStatus({ phase: 'idle', version: body.version, lastError: null })
      } catch (e) {
        setStatus({ phase: 'error', version: 0, lastError: e.message })
      }
    })()
    return () => { cancelled = true }
  }, [editor])

  // 2) Listen to editor changes → mark dirty + debounce a save.
  useEffect(() => {
    if (!editor || SYNC_DISABLED) return
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (isApplyingRemoteRef.current) return
      if (!initialLoadDoneRef.current) return
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return
      lastEditAtRef.current = Date.now()
      dirtyRef.current = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => { void flushSave() }, SAVE_DEBOUNCE_MS)
    })

    async function flushSave() {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      const snapshot = editor.getEditorState().toJSON()
      const baseVersion = versionRef.current
      setStatus(s => ({ ...s, phase: 'saving' }))
      try {
        const { status: code, body } = await api.saveDoc(snapshot, baseVersion, session.id)
        if (code === 409) {
          // Stale: pull remote and re-seed. User loses unsaved-but-conflicting
          // edits — acceptable for a demo, document it in the UI.
          const refreshed = await api.getDoc()
          versionRef.current = refreshed.body.version
          if (refreshed.body.content) {
            isApplyingRemoteRef.current = true
            const state = editor.parseEditorState(refreshed.body.content)
            editor.setEditorState(state)
            isApplyingRemoteRef.current = false
          }
          setStatus({ phase: 'idle', version: refreshed.body.version, lastError: 'conflict — refreshed' })
          return
        }
        versionRef.current = body.version
        setStatus({ phase: 'saved', version: body.version, lastError: null })
      } catch (e) {
        // Re-mark dirty so a future change retries.
        dirtyRef.current = true
        setStatus(s => ({ ...s, phase: 'error', lastError: e.message }))
      }
    }
  }, [editor])

  // 3) Background polling for remote changes.
  useEffect(() => {
    if (!editor || SYNC_DISABLED) return
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      try {
        const { body } = await api.pollDoc(versionRef.current)
        if (cancelled) return
        if (body.changed && body.content) {
          const now = Date.now()
          const userIsTyping = (now - lastEditAtRef.current) < LOCAL_GRACE_MS
          const localDirty = dirtyRef.current
          if (!userIsTyping && !localDirty) {
            isApplyingRemoteRef.current = true
            const state = editor.parseEditorState(body.content)
            editor.setEditorState(state)
            isApplyingRemoteRef.current = false
            versionRef.current = body.version
            setStatus(s => ({ ...s, phase: 'idle', version: body.version, lastError: null }))
          }
        }
      } catch (e) {
        // Network blip — keep going.
      }
    }
    const iv = setInterval(tick, POLL_MS)
    return () => { cancelled = true; clearInterval(iv) }
  }, [editor])

  return status
}
