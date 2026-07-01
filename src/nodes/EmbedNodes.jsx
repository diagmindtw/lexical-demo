/* eslint-disable react-refresh/only-export-components */
// Third-party embed decorator nodes: YouTube, Figma, and X/Tweet.
// Each stores only the minimal identifier and renders an iframe/widget.
// All serialize into the doc content so they round-trip through the backend.
import { DecoratorNode } from 'lexical'
import { useEffect, useRef } from 'react'

/* ---------------- YouTube ---------------- */
export class YouTubeNode extends DecoratorNode {
  __videoId
  static getType() { return 'youtube' }
  static clone(node) { return new YouTubeNode(node.__videoId, node.__key) }
  constructor(videoId, key) { super(key); this.__videoId = videoId }
  isInline() { return false }
  createDOM() { const d = document.createElement('div'); d.className = 'le-embed'; return d }
  updateDOM() { return false }
  decorate() {
    return (
      <div className="le-embed-frame le-yt" contentEditable={false}>
        <iframe
          title="YouTube video"
          src={`https://www.youtube-nocookie.com/embed/${this.__videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      </div>
    )
  }
  static importJSON(json) { return $createYouTubeNode(json.videoId) }
  exportJSON() { return { type: 'youtube', version: 1, videoId: this.__videoId } }
}
export function $createYouTubeNode(videoId) { return new YouTubeNode(videoId) }
export function $isYouTubeNode(node) { return node instanceof YouTubeNode }

/* Accepts a full URL or a bare id. */
export function parseYouTubeId(input) {
  if (!input) return null
  const m = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  if (m) return m[1]
  if (/^[\w-]{11}$/.test(input.trim())) return input.trim()
  return null
}

/* ---------------- Figma ---------------- */
export class FigmaNode extends DecoratorNode {
  __url
  static getType() { return 'figma' }
  static clone(node) { return new FigmaNode(node.__url, node.__key) }
  constructor(url, key) { super(key); this.__url = url }
  isInline() { return false }
  createDOM() { const d = document.createElement('div'); d.className = 'le-embed'; return d }
  updateDOM() { return false }
  decorate() {
    return (
      <div className="le-embed-frame le-figma" contentEditable={false}>
        <iframe
          title="Figma document"
          src={`https://www.figma.com/embed?embed_host=lexical-demo&url=${encodeURIComponent(this.__url)}`}
          allowFullScreen
          frameBorder="0"
        />
      </div>
    )
  }
  static importJSON(json) { return $createFigmaNode(json.url) }
  exportJSON() { return { type: 'figma', version: 1, url: this.__url } }
}
export function $createFigmaNode(url) { return new FigmaNode(url) }
export function $isFigmaNode(node) { return node instanceof FigmaNode }

/* ---------------- X / Tweet ---------------- */
function TweetView({ tweetId }) {
  const ref = useRef(null)
  useEffect(() => {
    let cancelled = false
    const render = () => {
      if (cancelled || !ref.current) return
      if (window.twttr?.widgets) {
        ref.current.innerHTML = ''
        window.twttr.widgets.createTweet(tweetId, ref.current, { align: 'center' })
      }
    }
    if (window.twttr?.widgets) {
      render()
    } else if (!document.getElementById('twitter-wjs')) {
      const s = document.createElement('script')
      s.id = 'twitter-wjs'
      s.src = 'https://platform.twitter.com/widgets.js'
      s.async = true
      s.onload = render
      document.body.appendChild(s)
    } else {
      const iv = setInterval(() => { if (window.twttr?.widgets) { clearInterval(iv); render() } }, 200)
      return () => clearInterval(iv)
    }
    return () => { cancelled = true }
  }, [tweetId])
  return (
    <div className="le-embed-frame le-tweet" contentEditable={false}>
      <div ref={ref}>
        <a href={`https://x.com/i/status/${tweetId}`} target="_blank" rel="noreferrer">View post on X →</a>
      </div>
    </div>
  )
}

export class TweetNode extends DecoratorNode {
  __tweetId
  static getType() { return 'tweet' }
  static clone(node) { return new TweetNode(node.__tweetId, node.__key) }
  constructor(tweetId, key) { super(key); this.__tweetId = tweetId }
  isInline() { return false }
  createDOM() { const d = document.createElement('div'); d.className = 'le-embed'; return d }
  updateDOM() { return false }
  decorate() { return <TweetView tweetId={this.__tweetId} /> }
  static importJSON(json) { return $createTweetNode(json.tweetId) }
  exportJSON() { return { type: 'tweet', version: 1, tweetId: this.__tweetId } }
}
export function $createTweetNode(tweetId) { return new TweetNode(tweetId) }
export function $isTweetNode(node) { return node instanceof TweetNode }

export function parseTweetId(input) {
  if (!input) return null
  const m = input.match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/)
  if (m) return m[1]
  if (/^\d+$/.test(input.trim())) return input.trim()
  return null
}
