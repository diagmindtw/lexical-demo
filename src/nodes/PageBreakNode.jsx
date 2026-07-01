// A block-level page break. Renders a labeled divider on screen and forces a
// page break when printing (CSS break-after: page). Serializes into doc content.
import { DecoratorNode } from 'lexical'

export class PageBreakNode extends DecoratorNode {
  static getType() {
    return 'page-break'
  }

  static clone(node) {
    return new PageBreakNode(node.__key)
  }

  createDOM() {
    const el = document.createElement('div')
    el.className = 'le-pagebreak'
    el.style.pageBreakAfter = 'always'
    el.style.breakAfter = 'page'
    return el
  }

  updateDOM() {
    return false
  }

  decorate() {
    return (
      <div className="le-pagebreak-inner" contentEditable={false}>
        <span className="le-pagebreak-line" />
        <span className="le-pagebreak-label">PAGE BREAK</span>
        <span className="le-pagebreak-line" />
      </div>
    )
  }

  static importJSON() {
    return $createPageBreakNode()
  }

  exportJSON() {
    return { type: 'page-break', version: 1 }
  }
}

export function $createPageBreakNode() {
  return new PageBreakNode()
}

export function $isPageBreakNode(node) {
  return node instanceof PageBreakNode
}
