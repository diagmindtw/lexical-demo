/* eslint-disable react-refresh/only-export-components */
// Interactive poll node: a question + options, each with a vote count. Clicking
// an option toggles this client's vote. Question/options/votes all live in node
// state and serialize into doc content (so votes sync across collaborators).
import { DecoratorNode, $getNodeByKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { session } from '../session'

function PollView({ nodeKey, question, options }) {
  const [editor] = useLexicalComposerContext()
  const me = session.id
  const total = options.reduce((n, o) => n + (o.votes?.length || 0), 0)

  const mutate = (fn) => editor.update(() => {
    const n = $getNodeByKey(nodeKey)
    if (n && typeof n.mutate === 'function') n.mutate(fn)
  })

  const toggleVote = (optId) => mutate((data) => {
    data.options = data.options.map((o) => {
      const has = o.votes.includes(me)
      if (o.id === optId) return { ...o, votes: has ? o.votes.filter((v) => v !== me) : [...o.votes, me] }
      return o
    })
  })

  const setQuestion = (q) => mutate((data) => { data.question = q })
  const setOptionText = (optId, text) => mutate((data) => {
    data.options = data.options.map((o) => (o.id === optId ? { ...o, text } : o))
  })
  const addOption = () => mutate((data) => {
    const nid = 'o' + (data.options.reduce((m, o) => Math.max(m, +o.id.slice(1) || 0), 0) + 1)
    data.options = [...data.options, { id: nid, text: '', votes: [] }]
  })

  return (
    <div className="le-poll" contentEditable={false}>
      <input className="le-poll-q" value={question} placeholder="Ask a question…" onChange={(e) => setQuestion(e.target.value)} />
      {options.map((o) => {
        const votes = o.votes?.length || 0
        const pct = total ? Math.round((votes / total) * 100) : 0
        const mine = o.votes?.includes(me)
        return (
          <div key={o.id} className={'le-poll-opt' + (mine ? ' le-poll-mine' : '')}>
            <button type="button" className="le-poll-check" title="Vote" onClick={() => toggleVote(o.id)}>{mine ? '☑' : '☐'}</button>
            <div className="le-poll-bar" style={{ '--pct': pct + '%' }}>
              <input className="le-poll-opt-text" value={o.text} placeholder="Option…" onChange={(e) => setOptionText(o.id, e.target.value)} />
              <span className="le-poll-count">{votes} · {pct}%</span>
            </div>
          </div>
        )
      })}
      <button type="button" className="le-poll-add" onClick={addOption}>+ Add option</button>
    </div>
  )
}

export class PollNode extends DecoratorNode {
  __question
  __options
  static getType() { return 'poll' }
  static clone(node) { return new PollNode(node.__question, node.__options, node.__key) }
  constructor(question, options, key) {
    super(key)
    this.__question = question
    this.__options = options
  }
  isInline() { return false }
  // Applies a mutation to a deep-ish copy of the node data, then writes it back.
  mutate(fn) {
    const self = this.getWritable()
    const data = { question: self.__question, options: self.__options.map((o) => ({ ...o, votes: [...o.votes] })) }
    fn(data)
    self.__question = data.question
    self.__options = data.options
  }
  createDOM() { const d = document.createElement('div'); d.className = 'le-poll-host'; return d }
  updateDOM() { return false }
  decorate() { return <PollView nodeKey={this.__key} question={this.__question} options={this.__options} /> }
  static importJSON(json) { return new PollNode(json.question, json.options) }
  exportJSON() { return { type: 'poll', version: 1, question: this.__question, options: this.__options } }
}

export function $createPollNode(question) {
  return new PollNode(question, [
    { id: 'o1', text: '', votes: [] },
    { id: 'o2', text: '', votes: [] },
  ])
}
export function $isPollNode(node) { return node instanceof PollNode }
