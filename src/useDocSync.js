import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { session } from './session'

// useDocSync wires a Lexical editor + doc-level `meta` (page setup) to the cow
// PHP backend:
//
//   - on mount: GET /get → seed initial editor state + meta
//   - on editorState OR meta change (debounced): POST /save with base_version
//   - background poll every POLL_MS: GET /poll?since=version, apply if newer
//
// Conflict resolution is intentionally crude (demo): on 409, refetch + overwrite.

const SAVE_DEBOUNCE_MS = 900
const POLL_MS = 2500
const LOCAL_GRACE_MS = 1500

// Test/offline escape hatch: `?nosync=1` skips all backend traffic.
const SYNC_DISABLED =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('nosync')

export function useDocSync(editor, meta, onMeta) {
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
  const metaRef = useRef(meta)
  const savedMetaRef = useRef(JSON.stringify(meta ?? null))

  useEffect(() => { metaRef.current = meta }, [meta])

  const flushSave = useCallback(async () => {
    if (!editor || SYNC_DISABLED) return
    if (!dirtyRef.current) return
    dirtyRef.current = false
    const snapshot = editor.getEditorState().toJSON()
    const baseVersion = versionRef.current
    setStatus((s) => ({ ...s, phase: 'saving' }))
    try {
      const { status: code, body } = await api.saveDoc(snapshot, baseVersion, session.id, metaRef.current)
      if (code === 409) {
        const refreshed = await api.getDoc()
        versionRef.current = refreshed.body.version
        if (refreshed.body.content) {
          isApplyingRemoteRef.current = true
          editor.setEditorState(editor.parseEditorState(refreshed.body.content))
          isApplyingRemoteRef.current = false
        }
        if (onMeta) onMeta(refreshed.body.meta ?? null)
        savedMetaRef.current = JSON.stringify(refreshed.body.meta ?? null)
        setStatus({ phase: 'idle', version: refreshed.body.version, lastError: 'conflict — refreshed' })
        return
      }
      versionRef.current = body.version
      savedMetaRef.current = JSON.stringify(metaRef.current ?? null)
      setStatus({ phase: 'saved', version: body.version, lastError: null })
    } catch (e) {
      dirtyRef.current = true
      setStatus((s) => ({ ...s, phase: 'error', lastError: e.message }))
    }
  }, [editor, onMeta])

  const scheduleSave = useCallback(() => {
    lastEditAtRef.current = Date.now()
    dirtyRef.current = true
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { void flushSave() }, SAVE_DEBOUNCE_MS)
  }, [flushSave])

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
          editor.setEditorState(editor.parseEditorState(body.content))
          isApplyingRemoteRef.current = false
        }
        if (onMeta) onMeta(body.meta ?? null)
        savedMetaRef.current = JSON.stringify(body.meta ?? null)
        initialLoadDoneRef.current = true
        setStatus({ phase: 'idle', version: body.version, lastError: null })
      } catch (e) {
        setStatus({ phase: 'error', version: 0, lastError: e.message })
      }
    })()
    return () => { cancelled = true }
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2) Editor changes → debounced save.
  useEffect(() => {
    if (!editor || SYNC_DISABLED) return
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (isApplyingRemoteRef.current) return
      if (!initialLoadDoneRef.current) return
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return
      scheduleSave()
    })
  }, [editor, scheduleSave])

  // 2b) Page-setup (meta) changes → debounced save (skip echoes of remote meta).
  useEffect(() => {
    if (!editor || SYNC_DISABLED) return
    if (!initialLoadDoneRef.current) return
    if (JSON.stringify(meta ?? null) === savedMetaRef.current) return
    scheduleSave()
  }, [meta, editor, scheduleSave])

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
          if (!userIsTyping && !dirtyRef.current) {
            isApplyingRemoteRef.current = true
            editor.setEditorState(editor.parseEditorState(body.content))
            isApplyingRemoteRef.current = false
            if (onMeta) onMeta(body.meta ?? null)
            savedMetaRef.current = JSON.stringify(body.meta ?? null)
            versionRef.current = body.version
            setStatus((s) => ({ ...s, phase: 'idle', version: body.version, lastError: null }))
          }
        }
      } catch {
        // Network blip — keep going.
      }
    }
    const iv = setInterval(tick, POLL_MS)
    return () => { cancelled = true; clearInterval(iv) }
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  return status
}
