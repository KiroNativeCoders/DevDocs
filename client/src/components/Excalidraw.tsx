import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useState, useRef } from 'react'
import './Excalidraw.css'

export type ExcalidrawSize = 'auto' | 'small' | 'medium' | 'large' | 'full' | 'custom'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    excalidraw: {
      /** Insert an Excalidraw diagram embed block */
      insertExcalidraw: (options?: {
        url?: string
        title?: string
        size?: ExcalidrawSize
        width?: number
        height?: number
      }) => ReturnType
    }
  }
}

export const EXAMPLE_EXCALIDRAW_URL =
  'https://excalidraw.com/#json=_-OYwmdtZcJt2563YLZpL,nc9Os74ozGCLkatmr9t1RA'

export function isExcalidrawUrl(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  return (
    /^https?:\/\/(www\.)?(link\.)?excalidraw\.com\/#(json|room)=[a-zA-Z0-9_\-,]+/i.test(trimmed) ||
    /^https?:\/\/(www\.)?(link\.)?excalidraw\.com\/.+/i.test(trimmed)
  )
}

function ExcalidrawView({ node, updateAttributes, editor }: NodeViewProps) {
  const url: string = node.attrs.url ?? ''
  const title: string = node.attrs.title || 'Excalidraw Drawing'
  const size: ExcalidrawSize = node.attrs.size || 'large'
  const width: number = typeof node.attrs.width === 'number' ? node.attrs.width : 0
  const height: number = typeof node.attrs.height === 'number' ? node.attrs.height : 520

  const [editing, setEditing] = useState(!url.trim())
  const [draftUrl, setDraftUrl] = useState(url)
  const [draftTitle, setDraftTitle] = useState(title)
  const [isResizingHeight, setIsResizingHeight] = useState(false)
  const [isResizingWidth, setIsResizingWidth] = useState(false)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [dragWidth, setDragWidth] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const canEdit = editor.isEditable

  const save = () => {
    if (!draftUrl.trim()) return
    updateAttributes({
      url: draftUrl.trim(),
      title: draftTitle.trim() || 'Excalidraw Drawing',
    })
    setEditing(false)
  }

  const handleEnlarge = () => {
    window.dispatchEvent(
      new CustomEvent('dx-excalidraw-enlarge', {
        detail: { url, title },
      }),
    )
  }

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Vertical resize handle (height)
  const handleHeightResizeStart = (e: React.MouseEvent) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizingHeight(true)

    const startY = e.clientY
    const initialHeight = height

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const clampedHeight = Math.round(Math.max(250, Math.min(1200, initialHeight + deltaY)))
      setDragHeight(clampedHeight)
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setIsResizingHeight(false)
      const deltaY = upEvent.clientY - startY
      const finalHeight = Math.round(Math.max(250, Math.min(1200, initialHeight + deltaY)))
      setDragHeight(null)
      updateAttributes({ height: finalHeight })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Horizontal resize handle (width)
  const handleWidthResizeStart = (e: React.MouseEvent) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizingWidth(true)

    const startX = e.clientX
    const startRect = containerRef.current?.getBoundingClientRect()
    const initialWidth = startRect ? startRect.width : 840

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) * 2
      const clampedWidth = Math.round(Math.max(480, Math.min(1300, initialWidth + deltaX)))
      setDragWidth(clampedWidth)
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setIsResizingWidth(false)
      const deltaX = (upEvent.clientX - startX) * 2
      const finalWidth = Math.round(Math.max(480, Math.min(1300, initialWidth + deltaX)))
      setDragWidth(null)
      updateAttributes({ size: 'custom', width: finalWidth })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const currentHeight = dragHeight ?? height

  let targetWidth: string | undefined
  if (dragWidth) {
    targetWidth = `${dragWidth}px`
  } else if (size === 'custom' && width) {
    targetWidth = `${width}px`
  } else if (size === 'small') {
    targetWidth = '540px'
  } else if (size === 'medium') {
    targetWidth = '740px'
  } else if (size === 'large') {
    targetWidth = '960px'
  } else if (size === 'full') {
    targetWidth = '100%'
  } else {
    targetWidth = '960px'
  }

  return (
    <NodeViewWrapper className="excalidraw-block" contentEditable={false}>
      <div
        ref={containerRef}
        className={`excalidraw-card size-${size} ${isResizingHeight || isResizingWidth ? 'is-resizing' : ''}`}
        style={{ width: targetWidth, maxWidth: '100%' }}
      >
        {editing ? (
          <div className="excalidraw-empty">
            <div className="excalidraw-empty-header">
              <span className="excalidraw-empty-icon">🎨</span>
              <span className="excalidraw-empty-title">Embed Excalidraw Drawing</span>
            </div>
            <p className="excalidraw-empty-desc">
              Paste a shared Excalidraw link to display and interact with the drawing directly in your document.
            </p>
            <div className="excalidraw-form">
              <input
                className="excalidraw-input"
                type="url"
                placeholder="https://excalidraw.com/#json=... or #room=..."
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                }}
                autoFocus
              />
              <div className="excalidraw-form-actions">
                <button
                  type="button"
                  className="excalidraw-btn primary"
                  disabled={!draftUrl.trim()}
                  onClick={save}
                >
                  Embed Drawing
                </button>
                <button
                  type="button"
                  className="excalidraw-btn secondary"
                  onClick={() => {
                    setDraftUrl(EXAMPLE_EXCALIDRAW_URL)
                    setDraftTitle('Architecture Diagram')
                  }}
                  title="Load example diagram"
                >
                  Load Example Link
                </button>
                {url.trim() && (
                  <button
                    type="button"
                    className="excalidraw-btn text"
                    onClick={() => {
                      setDraftUrl(url)
                      setEditing(false)
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Sliding Window Container */}
            <div className="excalidraw-window" style={{ height: `${currentHeight}px` }}>
              {/* Shield while dragging to prevent iframe from intercepting mouse events */}
              {(isResizingHeight || isResizingWidth) && <div className="excalidraw-resizing-shield" />}

              {/* Top-Right Floating Controls: Clean and unobtrusive */}
              <div className="excalidraw-floating-controls">
                <span className="excalidraw-view-badge" title="Embedded in view-only mode">View only</span>
                {canEdit && (
                  <span className="excalidraw-drag-handle" data-drag-handle title="Drag to reorder drawing">
                    ⠿
                  </span>
                )}
                {canEdit && (
                  <button
                    type="button"
                    className="excalidraw-tool-btn"
                    onClick={() => {
                      setDraftUrl(url)
                      setEditing(true)
                    }}
                    title="Edit Excalidraw link"
                    aria-label="Edit"
                  >
                    ✎
                  </button>
                )}
                <button
                  type="button"
                  className="excalidraw-tool-btn"
                  onClick={handleEnlarge}
                  title="Fullscreen"
                  aria-label="Fullscreen"
                >
                  ⤢
                </button>
                <button
                  type="button"
                  className="excalidraw-tool-btn"
                  onClick={handleOpenExternal}
                  title="Open on Excalidraw.com in a new tab"
                  aria-label="Open in new tab"
                >
                  ↗
                </button>
              </div>

              {/* Centered Excalidraw Iframe Viewport */}
              <iframe
                className="excalidraw-iframe"
                src={url}
                title={title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                allow="clipboard-read; clipboard-write"
                loading="lazy"
              />

              {/* Horizontal Resize Handle (Right) */}
              {canEdit && (
                <div
                  className="excalidraw-resize-handle-x"
                  onMouseDown={handleWidthResizeStart}
                  title="Drag horizontally to resize width"
                >
                  <div className="excalidraw-resize-handle-x-bar" />
                </div>
              )}
            </div>

            {/* Bottom Resize Handle (Height) */}
            {canEdit && (
              <div
                className="excalidraw-resize-handle-y"
                onMouseDown={handleHeightResizeStart}
                title="Drag vertically to resize height"
              >
                <div className="excalidraw-resize-handle-y-bar" />
                <span className="excalidraw-resize-badge">{currentHeight}px</span>
              </div>
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const ExcalidrawNode = Node.create({
  name: 'excalidraw',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-url') || '',
        renderHTML: (attrs) => ({ 'data-url': attrs.url || '' }),
      },
      title: {
        default: 'Excalidraw Drawing',
        parseHTML: (el) => el.getAttribute('data-title') || 'Excalidraw Drawing',
        renderHTML: (attrs) => ({ 'data-title': attrs.title || 'Excalidraw Drawing' }),
      },
      size: {
        default: 'large',
        parseHTML: (el) => (el.getAttribute('data-size') as ExcalidrawSize) || 'large',
        renderHTML: (attrs) => ({ 'data-size': attrs.size || 'large' }),
      },
      width: {
        default: 0,
        parseHTML: (el) => {
          const val = el.getAttribute('data-width')
          return val ? parseInt(val, 10) : 0
        },
        renderHTML: (attrs) => (attrs.width ? { 'data-width': String(attrs.width) } : {}),
      },
      height: {
        default: 520,
        parseHTML: (el) => {
          const val = el.getAttribute('data-height')
          return val ? parseInt(val, 10) : 520
        },
        renderHTML: (attrs) => ({ 'data-height': String(attrs.height || 520) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="excalidraw"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'excalidraw' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawView)
  },

  addCommands() {
    return {
      insertExcalidraw:
        (options?: {
          url?: string
          title?: string
          size?: ExcalidrawSize
          width?: number
          height?: number
        }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              url: options?.url ?? '',
              title: options?.title ?? 'Excalidraw Drawing',
              size: options?.size ?? 'large',
              width: options?.width ?? 0,
              height: options?.height ?? 520,
            },
          }),
    }
  },
})
