import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import './MermaidModal.css'

type Props = {
  svg: string
  source?: string
  onClose: () => void
}

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

export default function MermaidModal({ svg: initialSvg, source, onClose }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>(getAppTheme)
  const [currentSvg, setCurrentSvg] = useState<string>(initialSvg)
  const [codeSource, setCodeSource] = useState<string>(source || '')
  const [zoom, setZoom] = useState<number>(100) // Percentage: 50% - 250%
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [viewMode, setViewMode] = useState<'diagram' | 'split' | 'code'>('diagram')
  const isMountedRef = useRef(false)

  useEffect(() => {
    if (initialSvg) {
      setCurrentSvg(initialSvg)
    }
  }, [initialSvg])

  useEffect(() => {
    if (source) {
      setCodeSource(source)
    }
  }, [source])

  // Listen to theme changes while modal is open
  useEffect(() => {
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent<'light' | 'dark'>).detail
      if (detail) setTheme(detail)
      else setTheme(getAppTheme())
    }
    window.addEventListener('dx:theme-changed', onTheme)
    return () => window.removeEventListener('dx:theme-changed', onTheme)
  }, [])

  // If codeSource is edited or theme changes, re-render SVG
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (!codeSource || !codeSource.trim()) return
    let cancelled = false
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
            }
          : undefined,
      })

      const renderId = `mmd-modal-${Math.random().toString(36).slice(2)}`
      mermaid
        .render(renderId, codeSource)
        .then((res) => {
          if (!cancelled && res.svg) {
            setCurrentSvg(res.svg)
          }
        })
        .catch((err) => {
          console.warn('Mermaid modal render error:', err)
        })

      return () => {
        cancelled = true
        document.getElementById(renderId)?.remove()
        document.getElementById('d' + renderId)?.remove()
      }
    } catch {
      // ignore
    }
  }, [codeSource, theme])

  // Escape key closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const resetZoom = () => {
    setZoom(100)
  }

  const fitToScreen = () => {
    setZoom(120)
  }

  const copySvg = async () => {
    try {
      await navigator.clipboard.writeText(currentSvg)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const copyCode = async () => {
    if (!codeSource) return
    try {
      await navigator.clipboard.writeText(codeSource)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className="mermaid-modal-backdrop" onClick={onClose}>
      <div
        className="mermaid-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Mermaid Diagram Fullscreen Viewer"
      >
        {/* Top Header */}
        <div className="mermaid-modal-header">
          <div className="mm-header-left">
            <span className="mm-header-icon">📊</span>
            <span className="mm-header-title">Mermaid Diagram Viewer</span>
          </div>

          <div className="mm-header-controls">
            {codeSource && (
              <div className="mm-view-toggle">
                <button
                  type="button"
                  className={`mm-view-btn ${viewMode === 'diagram' ? 'active' : ''}`}
                  onClick={() => setViewMode('diagram')}
                  title="View diagram graphic"
                >
                  📊 Diagram
                </button>
                <button
                  type="button"
                  className={`mm-view-btn ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                  title="Side-by-side code and diagram"
                >
                  ◫ Split
                </button>
                <button
                  type="button"
                  className={`mm-view-btn ${viewMode === 'code' ? 'active' : ''}`}
                  onClick={() => setViewMode('code')}
                  title="View Mermaid syntax code"
                >
                  ⌨️ Code
                </button>
              </div>
            )}

            {viewMode !== 'code' && (
              <>
                <button
                  type="button"
                  className="mm-tool-btn"
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  title="Zoom out (−)"
                >
                  −
                </button>
                <button
                  type="button"
                  className="mm-zoom-pill"
                  onClick={resetZoom}
                  title="Click to reset to 100%"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  className="mm-tool-btn"
                  onClick={() => setZoom((z) => Math.min(250, z + 15))}
                  title="Zoom in (+)"
                >
                  +
                </button>
                <div className="mm-divider" />
                <button
                  type="button"
                  className="mm-action-btn"
                  onClick={fitToScreen}
                  title="Fit diagram to viewport"
                >
                  ⊡ Fit
                </button>
                <button
                  type="button"
                  className="mm-action-btn"
                  onClick={resetZoom}
                  title="Reset zoom"
                >
                  100%
                </button>
              </>
            )}

            <div className="mm-divider" />
            {codeSource && (
              <button
                type="button"
                className="mm-action-btn mm-code-action-btn"
                onClick={copyCode}
                title="Copy Mermaid source code"
              >
                {copiedCode ? '✓ Code Copied' : '📋 Copy Code'}
              </button>
            )}
            <button
              type="button"
              className="mm-action-btn"
              onClick={copySvg}
              title="Copy raw SVG to clipboard"
            >
              {copied ? '✓ Copied' : 'Copy SVG'}
            </button>
          </div>

          <div className="mm-header-right">
            <button
              type="button"
              className="mm-close-btn"
              onClick={onClose}
              title="Close fullscreen (Esc)"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewport Canvas with Native Scrolling */}
        <div className="mermaid-modal-viewport">
          {viewMode === 'code' ? (
            <div className="mm-code-panel">
              <div className="mm-code-header">
                <div className="mm-code-header-left">
                  <span>Mermaid Source Code</span>
                  <span className="mm-code-hint">(Live edits re-render the diagram)</span>
                </div>
                <button type="button" className="mm-copy-code-btn" onClick={copyCode}>
                  {copiedCode ? '✓ Copied' : '📋 Copy Code'}
                </button>
              </div>
              <textarea
                className="mm-code-editor"
                value={codeSource}
                onChange={(e) => setCodeSource(e.target.value)}
                spellCheck={false}
                placeholder="Mermaid diagram syntax..."
              />
            </div>
          ) : viewMode === 'split' ? (
            <div className="mm-split-container">
              <div className="mm-code-panel">
                <div className="mm-code-header">
                  <div className="mm-code-header-left">
                    <span>Mermaid Source</span>
                    <span className="mm-code-hint">(Live edit)</span>
                  </div>
                  <button type="button" className="mm-copy-code-btn" onClick={copyCode}>
                    {copiedCode ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <textarea
                  className="mm-code-editor"
                  value={codeSource}
                  onChange={(e) => setCodeSource(e.target.value)}
                  spellCheck={false}
                  placeholder="Mermaid diagram syntax..."
                />
              </div>
              <div className="mermaid-modal-canvas">
                <div
                  className="mermaid-modal-svg"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                  }}
                  dangerouslySetInnerHTML={{ __html: currentSvg }}
                />
              </div>
            </div>
          ) : (
            <div className="mermaid-modal-canvas">
              <div
                className="mermaid-modal-svg"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                }}
                dangerouslySetInnerHTML={{ __html: currentSvg }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mermaid-modal-footer">
          <span>
            {viewMode === 'code'
              ? 'Edit syntax above to update the diagram preview in real-time'
              : 'Use mouse wheel or trackpad to scroll naturally through diagram'}
          </span>
          <span className="mm-footer-hint">Press Esc to exit</span>
        </div>
      </div>
    </div>
  )
}
