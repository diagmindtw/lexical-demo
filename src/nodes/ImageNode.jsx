// A compact block image node. Stores the image as a src string (data-URL for
// uploaded/pasted images, or an external URL). Serialized into the doc content,
// so it round-trips through the existing get/save/poll backend untouched.
import { DecoratorNode } from 'lexical'

export class ImageNode extends DecoratorNode {
  __src
  __alt
  __width

  static getType() {
    return 'image'
  }

  static clone(node) {
    return new ImageNode(node.__src, node.__alt, node.__width, node.__key)
  }

  constructor(src, alt = '', width = null, key) {
    super(key)
    this.__src = src
    this.__alt = alt
    this.__width = width
  }

  isInline() {
    return false
  }

  createDOM() {
    const span = document.createElement('span')
    span.className = 'le-image'
    return span
  }

  updateDOM() {
    return false
  }

  decorate() {
    return (
      <img
        src={this.__src}
        alt={this.__alt}
        draggable="false"
        style={{
          maxWidth: '100%',
          width: this.__width ? `${this.__width}px` : undefined,
          display: 'block',
          borderRadius: '6px',
        }}
      />
    )
  }

  static importJSON(json) {
    return $createImageNode(json.src, json.alt, json.width)
  }

  exportJSON() {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      alt: this.__alt ?? '',
      width: this.__width ?? null,
    }
  }
}

export function $createImageNode(src, alt = '', width = null) {
  return new ImageNode(src, alt, width)
}

export function $isImageNode(node) {
  return node instanceof ImageNode
}
