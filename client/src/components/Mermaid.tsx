import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import './Mermaid.css'

export type MermaidSize = 'auto' | 'small' | 'medium' | 'large' | 'full' | 'custom'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /** Insert a mermaid diagram block (optionally seeded with source, size, scale, width). */
      insertMermaid: (
        source?: string,
        size?: MermaidSize,
        scale?: number,
        width?: number,
      ) => ReturnType
    }
  }
}

const DEFAULT_SRC = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do a thing]
  B -->|No| D[Do another]`

function getAppTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'dark') return 'dark'
    if (attr === 'light') return 'light'
    const stored = localStorage.getItem('dx_theme')
    if (stored === 'dark') return 'dark'
  }
  return 'light'
}

function MermaidView({ node, updateAttributes, editor }: NodeViewProps) {
  const source: string = node.attrs.source || ''
  const size: MermaidSize = node.attrs.size || 'auto'
  const width: number = typeof node.attrs.width === 'number' ? node.attrs.width : 0
  const scale: number = typeof node.attrs.scale === 'number' ? node.attrs.scale : 100

  const [editing, setEditing] = useState(!source.trim())
  const [draft, setDraft] = useState(source)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(getAppTheme)
  const [isResizing, setIsResizing] = useState(false)
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const canEdit = editor.isEditable

  // Watch for theme toggles to immediately re-render diagram with matching theme
  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<'light' | 'dark'>).detail
      if (detail) setTheme(detail)
      else setTheme(getAppTheme())
    }
    window.addEventListener('dx:theme-changed', onThemeChange)

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          setTheme(getAppTheme())
        }
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      window.removeEventListener('dx:theme-changed', onThemeChange)
      observer.disconnect()
    }
  }, [])

  // Render the diagram whenever source or theme changes
  useEffect(() => {
    let cancelled = false
    if (!source.trim()) {
      setSvg('')
      setError(null)
      return
    }

    const isDark = theme === 'dark'
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        securityLevel: 'strict',
        fontFamily: 'inherit',
        themeVariables: isDark
          ? {
              darkMode: true,
              fontSize: '13px',
              fontFamily: 'inherit',
              background: '#161b22',
              primaryColor: '#1f6feb',
              primaryTextColor: '#f0f6fc',
              primaryBorderColor: '#388bfd',
              lineColor: '#8b949e',
              secondaryColor: '#21262d',
              tertiaryColor: '#161b22',
              mainBkg: '#161b22',
              nodeBorder: '#388bfd',
              clusterBkg: '#21262d',
              clusterBorder: '#30363d',
              defaultLinkColor: '#8b949e',
              titleColor: '#f0f6fc',
              edgeLabelBackground: '#21262d',
              actorBkg: '#161b22',
              actorBorder: '#388bfd',
              actorTextColor: '#f0f6fc',
              signalColor: '#8b949e',
              signalTextColor: '#f0f6fc',
            }
          : undefined,
      })
    } catch {
      // ignore init error
    }

    const renderId = `mmd-${Math.random().toString(36).slice(2)}-${Date.now()}`
    mermaid
      .render(renderId, source)
      .then((r) => {
        if (!cancelled) {
          setSvg(r.svg)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Invalid mermaid syntax')
        }
      })

    return () => {
      cancelled = true
      const el = document.getElementById(renderId)
      if (el) el.remove()
      const dEl = document.getElementById('d' + renderId)
      if (dEl) dEl.remove()
    }
  }, [source, theme])

  function save() {
    updateAttributes({ source: draft })
    setEditing(false)
  }

  const handleCopyCode = async () => {
    if (!source) return
    try {
      await navigator.clipboard.writeText(source)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // fallback
    }
  }

  function handleEnlarge() {
    if (!svg) return
    window.dispatchEvent(
      new CustomEvent('dx-mermaid-enlarge', {
        detail: { svg, source },
      }),
    )
  }

  const handleSizeChange = (newSize: MermaidSize) => {
    updateAttributes({ size: newSize, width: 0 })
  }

  const handleScaleChange = (delta: number) => {
    const nextScale = Math.max(50, Math.min(160, scale + delta))
    updateAttributes({ scale: nextScale })
  }

  const handleResetScale = () => {
    updateAttributes({ scale: 100 })
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)

    const startX = e.clientX
    const startRect = containerRef.current?.getBoundingClientRect()
    const initialWidth = startRect ? startRect.width : 560

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) * 2
      const clampedWidth = Math.round(Math.max(260, Math.min(1100, initialWidth + deltaX)))
      setDragWidth(clampedWidth)
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setIsResizing(false)
      const deltaX = (upEvent.clientX - startX) * 2
      const finalWidth = Math.round(Math.max(260, Math.min(1100, initialWidth + deltaX)))
      setDragWidth(null)
      updateAttributes({ size: 'custom', width: finalWidth })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  let targetWidth: string | undefined
  if (dragWidth) {
    targetWidth = `${dragWidth}px`
  } else if (size === 'custom' && width) {
    targetWidth = `${width}px`
  } else if (size === 'small') {
    targetWidth = '360px'
  } else if (size === 'medium') {
    targetWidth = '560px'
  } else if (size === 'large') {
    targetWidth = '800px'
  } else if (size === 'full') {
    targetWidth = '100%'
  } else {
    // auto
    targetWidth = undefined
  }

  return (
    <NodeViewWrapper className="mermaid-block" contentEditable={false}>
      {editing ? (
        <div className="mermaid-editor">
          <textarea
            className="mermaid-src"
            value={draft}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Mermaid syntax, e.g. graph TD; A-->B"
            rows={Math.max(4, draft.split('\n').length + 1)}
          />
          <div className="mermaid-actions">
            <button className="mmd-btn primary" onClick={save}>
              Render
            </button>
            {source.trim() && (
              <button
                className="mmd-btn"
                onClick={() => {
                  setDraft(source)
                  setEditing(false)
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            className={`mermaid-preview size-${size} ${isResizing ? 'is-resizing' : ''}`}
            onDoubleClick={handleEnlarge}
            title="Double-click to enlarge fullscreen"
          >
            {error ? (
              <div className="mermaid-error">⚠ {error}</div>
            ) : (
              <div
                ref={containerRef}
                className="mermaid-svg-wrapper"
                style={{
                  width: targetWidth || 'auto',
                  maxWidth: '100%',
                }}
              >
                <div
                  className="mermaid-svg"
                  style={{
                    transform: scale !== 100 ? `scale(${scale / 100})` : undefined,
                    transformOrigin: 'top center',
                  }}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                {isResizing && dragWidth && (
                  <div className="mermaid-resize-badge">{dragWidth}px</div>
                )}
              </div>
            )}

            {canEdit && (
              <span
                className="mermaid-drag"
                data-drag-handle
                title="Drag to move diagram"
                contentEditable={false}
              >
                ⠿
              </span>
            )}

            {/* Top-right Floating Action Toolbar */}
            <div className="mermaid-top-toolbar">
              {canEdit && (
                <>
                  {/* Size Width Presets */}
                  <div className="mermaid-size-switcher" title="Diagram display width">
                    <button
                      type="button"
                      className={`mermaid-size-btn ${size === 'auto' ? 'is-active' : ''}`}
                      onClick={() => handleSizeChange('auto')}
                      title="Auto (natural crisp width, avoids giant text)"
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      className={`mermaid-size-btn ${size === 'small' ? 'is-active' : ''}`}
                      onClick={() => handleSizeChange('small')}
                      title="Small (compact: 360px)"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      className={`mermaid-size-btn ${size === 'medium' ? 'is-active' : ''}`}
                      onClick={() => handleSizeChange('medium')}
                      title="Medium (standard: 560px)"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`mermaid-size-btn ${size === 'large' ? 'is-active' : ''}`}
                      onClick={() => handleSizeChange('large')}
                      title="Large (wide: 800px)"
                    >
                      L
                    </button>
                    <button
                      type="button"
                      className={`mermaid-size-btn ${size === 'full' ? 'is-active' : ''}`}
                      onClick={() => handleSizeChange('full')}
                      title="Full width (100%)"
                    >
                      Full
                    </button>
                  </div>

                  {/* Scale / Zoom Controls */}
                  <div className="mermaid-scale-switcher" title="Adjust text & diagram scale">
                    <button
                      type="button"
                      className="mermaid-scale-btn"
                      onClick={() => handleScaleChange(-10)}
                      title="Scale down text & nodes (-10%)"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="mermaid-scale-label"
                      onClick={handleResetScale}
                      title="Click to reset scale to 100%"
                    >
                      {scale}%
                    </button>
                    <button
                      type="button"
                      className="mermaid-scale-btn"
                      onClick={() => handleScaleChange(10)}
                      title="Scale up text & nodes (+10%)"
                    >
                      +
                    </button>
                  </div>
                </>
              )}

              {source && (
                <button
                  type="button"
                  className={`mermaid-tool-btn ${showCode ? 'is-active' : ''}`}
                  title={showCode ? 'Hide source code' : 'View Mermaid source code'}
                  onClick={() => setShowCode(!showCode)}
                >
                  ⌨️ Code
                </button>
              )}

              {svg && (
                <button
                  type="button"
                  className="mermaid-tool-btn"
                  title="Fullscreen view & zoom"
                  onClick={handleEnlarge}
                >
                  ⤢ Enlarge
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  className="mermaid-tool-btn primary"
                  title="Edit diagram syntax"
                  onClick={() => setEditing(true)}
                >
                  ✎ Edit
                </button>
              )}
            </div>

            {/* Horizontal Resize Handle */}
            {canEdit && (
              <div
                className="mermaid-resize-handle"
                onMouseDown={handleResizeStart}
                title="Drag horizontally to resize diagram width"
              >
                <div className="mermaid-resize-handle-bar" />
              </div>
            )}
          </div>

          {showCode && source && (
            <div className="mermaid-code-drawer">
              <div className="mermaid-code-drawer-header">
                <span className="mermaid-code-drawer-title">Mermaid Source Code</span>
                <button
                  type="button"
                  className="mermaid-code-copy-btn"
                  onClick={handleCopyCode}
                  title="Copy code to clipboard"
                >
                  {copiedCode ? '✓ Copied' : '📋 Copy Code'}
                </button>
              </div>
              <pre className="mermaid-code-drawer-content">
                <code>{source}</code>
              </pre>
            </div>
          )}
        </>
      )}
    </NodeViewWrapper>
  )
}

export const MermaidNode = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-source') || '',
        renderHTML: (attrs) => ({ 'data-source': attrs.source }),
      },
      size: {
        default: 'auto',
        parseHTML: (el) => (el.getAttribute('data-size') as MermaidSize) || 'auto',
        renderHTML: (attrs) => ({ 'data-size': attrs.size || 'auto' }),
      },
      width: {
        default: 0,
        parseHTML: (el) => {
          const val = el.getAttribute('data-width')
          return val ? parseInt(val, 10) : 0
        },
        renderHTML: (attrs) => (attrs.width ? { 'data-width': String(attrs.width) } : {}),
      },
      scale: {
        default: 100,
        parseHTML: (el) => {
          const val = el.getAttribute('data-scale')
          return val ? parseInt(val, 10) : 100
        },
        renderHTML: (attrs) =>
          attrs.scale && attrs.scale !== 100 ? { 'data-scale': String(attrs.scale) } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView)
  },

  addCommands() {
    return {
      insertMermaid:
        (
          source?: string,
          size: MermaidSize = 'auto',
          scale: number = 100,
          width: number = 0,
        ) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { source: source ?? DEFAULT_SRC, size, scale, width },
          }),
    }
  },
})

